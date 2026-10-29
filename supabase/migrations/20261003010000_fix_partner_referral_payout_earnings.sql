-- ════════════════════════════════════════════════════════════════════════════
-- Migration: Fix Partner Referral Payout & Earnings Integration (BUG-13)
-- File: 20261003010000_fix_partner_referral_payout_earnings.sql
--
-- Problem:
--   Partner referral rewards were credited exclusively as `wallet_bonus_balance`
--   via `public.credit_wallet()`. However, professionals cannot use a consumer
--   bonus wallet to book services.
--   The partner payout system (partner_earnings, payouts, payout_allocations)
--   strictly computed withdrawable earnings from completed bookings in
--   `public.partner_earnings` (which enforced `booking_id NOT NULL UNIQUE`),
--   completely excluding referral rewards.
--   As a result, referral rewards earned by professionals were permanently trapped
--   and unwithdrawable.
--
-- Fix:
--   1. Schema Enhancements:
--      - partner_earnings: allow `booking_id` to be NULLABLE.
--      - Drop `partner_earnings_booking_id_key` and replace with conditional
--        unique index: `uq_partner_earnings_booking_id ON (booking_id) WHERE booking_id IS NOT NULL`.
--      - Add `referral_id UUID REFERENCES public.partner_referrals(id) ON DELETE SET NULL`.
--      - Add `earning_type VARCHAR(30) NOT NULL DEFAULT 'booking'`.
--      - Add `description TEXT`.
--      - Add conditional unique index: `uq_partner_earnings_referral_id ON (referral_id) WHERE referral_id IS NOT NULL`.
--      - Add index on `(partner_id, earning_type)`.
--
--   2. Core Reward Engine (_reward_partner_referral):
--      - Atomically creates an eligible record in `public.partner_earnings` with
--        `earning_type = 'referral'`, `partner_earning_amount = partner_reward`,
--        `commission_percent = 0`, `status = 'eligible'`.
--      - Maintains wallet transaction history for audit trail.
--
--   3. Reversal Engine (reverse_partner_referral):
--      - Synchronizes referral reversal with `partner_earnings`:
--        * If 'eligible': status updated to 'reversed'.
--        * If 'reserved': allocation reversed; active payout recalculated/cancelled.
--        * If 'paid': clawback recorded in `payout_adjustments` so the amount
--          is automatically deducted from future partner payouts.
--
--   4. Summary Engine (get_partner_payout_summary):
--      - Projects `earning_type`, `referral_id`, and `description` in the recent
--        earnings list.
--
--   5. Backfill:
--      - Backfills eligible `partner_earnings` for all existing rewarded referrals.
-- ════════════════════════════════════════════════════════════════════════════

-- ─── 1. SCHEMA ENHANCEMENTS ──────────────────────────────────────────────────

-- 1.1 Make booking_id nullable on partner_earnings
ALTER TABLE public.partner_earnings
  ALTER COLUMN booking_id DROP NOT NULL;

-- 1.2 Replace unconditional unique constraint on booking_id with partial unique index
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'partner_earnings_booking_id_key'
       AND conrelid = 'public.partner_earnings'::regclass
  ) THEN
    ALTER TABLE public.partner_earnings DROP CONSTRAINT partner_earnings_booking_id_key;
  END IF;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_partner_earnings_booking_id
  ON public.partner_earnings (booking_id)
  WHERE booking_id IS NOT NULL;

-- 1.3 Add referral integration columns
ALTER TABLE public.partner_earnings
  ADD COLUMN IF NOT EXISTS referral_id UUID REFERENCES public.partner_referrals(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS earning_type VARCHAR(30) NOT NULL DEFAULT 'booking',
  ADD COLUMN IF NOT EXISTS description TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS uq_partner_earnings_referral_id
  ON public.partner_earnings (referral_id)
  WHERE referral_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_partner_earnings_earning_type
  ON public.partner_earnings (partner_id, earning_type);


-- ─── 2. REWARD ENGINE: _reward_partner_referral ─────────────────────────────

CREATE OR REPLACE FUNCTION public._reward_partner_referral(p_referral_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ref            public.partner_referrals%ROWTYPE;
  v_first_booking  UUID;
  v_trigger        TEXT;
  v_actor_id       UUID;
BEGIN
  BEGIN
    v_actor_id := auth.uid();
  EXCEPTION WHEN OTHERS THEN
    v_actor_id := NULL;
  END;

  SELECT * INTO v_ref
    FROM public.partner_referrals
   WHERE id = p_referral_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Partner referral record not found.');
  END IF;

  IF v_ref.status = 'rewarded' THEN
    RETURN jsonb_build_object('success', true, 'already_rewarded', true);
  END IF;

  IF v_ref.status NOT IN ('attributed', 'eligible') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Referral is not in a rewardable state (status: ' || v_ref.status || ').'
    );
  END IF;

  SELECT COALESCE((value #>> '{}')::TEXT, 'first_booking') INTO v_trigger
    FROM public.platform_settings
   WHERE key = 'partner_referral_reward_trigger';

  IF v_trigger = 'admin' AND (v_actor_id IS NULL OR NOT public.is_admin(v_actor_id)) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'This program is configured for manual administrator payout only.'
    );
  END IF;

  IF v_trigger = 'first_booking' THEN
    SELECT b.id INTO v_first_booking
      FROM public.bookings b
     WHERE b.customer_id = v_ref.referred_id
       AND b.status = 'completed'
     ORDER BY COALESCE(b.completed_at, b.service_completed_at, b.created_at) ASC
     LIMIT 1;

    IF v_first_booking IS NULL THEN
      RETURN jsonb_build_object(
        'success', true,
        'pending', true,
        'reason', 'not_first_booking'
      );
    END IF;

    IF v_ref.status = 'attributed' THEN
      UPDATE public.partner_referrals
         SET status = 'eligible',
             qualified_at = COALESCE(qualified_at, now()),
             completed_booking_id = v_first_booking
       WHERE id = p_referral_id;

      INSERT INTO public.partner_referral_events (referral_id, event_type, actor_role, metadata)
        VALUES (p_referral_id, 'eligible', COALESCE(v_actor_id::TEXT, 'system'),
                jsonb_build_object('booking_id', v_first_booking));
    END IF;
  END IF;

  -- Defense in depth: if earning or wallet credits already exist, mark rewarded — never double-pay.
  IF EXISTS (
    SELECT 1 FROM public.partner_earnings
     WHERE referral_id = p_referral_id
  ) OR EXISTS (
    SELECT 1 FROM public.wallet_transactions
     WHERE reference_id = p_referral_id
       AND source IN ('partner_referral_reward', 'partner_referral_bonus')
  ) THEN
    -- Ensure partner_earnings entry exists if missing from an earlier run
    INSERT INTO public.partner_earnings (
      booking_id, referral_id, partner_id, earning_type, description,
      total_amount, gst_amount, service_revenue, commission_percent,
      platform_commission_amount, partner_earning_amount, status,
      completed_at, payment_method, is_cash
    ) VALUES (
      NULL, p_referral_id, v_ref.partner_id, 'referral',
      'Partner referral reward — referee completed first booking',
      v_ref.partner_reward, 0, v_ref.partner_reward, 0,
      0, v_ref.partner_reward, 'eligible',
      now(), 'Referral', FALSE
    ) ON CONFLICT DO NOTHING;

    UPDATE public.partner_referrals
       SET status = 'rewarded', rewarded_at = now()
     WHERE id = p_referral_id;
    RETURN jsonb_build_object('success', true, 'already_rewarded', true);
  END IF;

  -- Lock profiles in canonical order to avoid deadlocks.
  PERFORM 1 FROM public.profiles
    WHERE id IN (v_ref.partner_id, v_ref.referred_id)
    ORDER BY id
    FOR UPDATE;

  -- 1. Create withdrawable partner earning in partner_earnings
  INSERT INTO public.partner_earnings (
    booking_id,
    referral_id,
    partner_id,
    earning_type,
    description,
    total_amount,
    gst_amount,
    service_revenue,
    commission_percent,
    platform_commission_amount,
    partner_earning_amount,
    status,
    completed_at,
    payment_method,
    is_cash
  ) VALUES (
    NULL,
    p_referral_id,
    v_ref.partner_id,
    'referral',
    CASE
      WHEN v_trigger = 'registration' THEN 'Partner referral reward — referee registered with your code'
      ELSE 'Partner referral reward — referee completed first booking'
    END,
    v_ref.partner_reward,
    0,
    v_ref.partner_reward,
    0,
    0,
    v_ref.partner_reward,
    'eligible',
    now(),
    'Referral',
    FALSE
  ) ON CONFLICT DO NOTHING;

  -- 2. Partner wallet ledger entry (for partner reward tracking)
  PERFORM public.credit_wallet(
    p_user_id      => v_ref.partner_id,
    p_amount       => v_ref.partner_reward,
    p_source       => 'partner_referral_reward',
    p_reference_id => p_referral_id,
    p_metadata     => jsonb_build_object('program', 'partner', 'party', 'partner'),
    p_description  => 'Partner referral reward — a customer joined PHS with your code',
    p_balance_type => 'bonus'
  );

  -- 3. Customer wallet joining bonus
  PERFORM public.credit_wallet(
    p_user_id      => v_ref.referred_id,
    p_amount       => v_ref.customer_reward,
    p_source       => 'partner_referral_bonus',
    p_reference_id => p_referral_id,
    p_metadata     => jsonb_build_object('program', 'partner', 'party', 'referred'),
    p_description  => 'Partner referral bonus — wallet reward for joining via a professional',
    p_balance_type => 'bonus'
  );

  UPDATE public.partner_referrals
     SET status = 'rewarded',
         qualified_at = COALESCE(qualified_at, now()),
         rewarded_at  = now()
   WHERE id = p_referral_id;

  INSERT INTO public.partner_referral_events (referral_id, event_type, actor_role, metadata)
    VALUES (p_referral_id, 'rewarded', COALESCE(v_actor_id::TEXT, 'system'),
            jsonb_build_object('booking_id', v_first_booking));

  RETURN jsonb_build_object(
    'success', true,
    'referral_id', p_referral_id,
    'partner_id',  v_ref.partner_id,
    'referred_id', v_ref.referred_id,
    'partner_reward',  v_ref.partner_reward,
    'customer_reward', v_ref.customer_reward
  );
EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('success', true, 'already_rewarded', true);
END;
$$;


-- ─── 3. REVERSAL ENGINE: reverse_partner_referral ───────────────────────────

CREATE OR REPLACE FUNCTION public.reverse_partner_referral(
  p_referral_id UUID,
  p_reason      TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id         UUID;
  v_ref              public.partner_referrals%ROWTYPE;
  v_partner_db       JSONB;
  v_customer_db      JSONB;
  v_earning_id       UUID;
  v_earning_status   VARCHAR(20);
  v_earning_amount   NUMERIC(10, 2);
  v_alloc_id         UUID;
  v_payout_id        UUID;
  v_payout_status    VARCHAR(20);
  v_remaining_alloc  NUMERIC(10, 2);
BEGIN
  BEGIN
    v_actor_id := auth.uid();
  EXCEPTION WHEN OTHERS THEN
    v_actor_id := NULL;
  END;

  IF v_actor_id IS NOT NULL AND NOT public.is_admin(v_actor_id) THEN
    RAISE EXCEPTION 'Unauthorized: admin action only.';
  END IF;

  IF p_reason IS NULL OR TRIM(p_reason) = '' THEN
    RAISE EXCEPTION 'A reversal reason is required.';
  END IF;

  SELECT * INTO v_ref
    FROM public.partner_referrals
   WHERE id = p_referral_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Partner referral not found.');
  END IF;

  IF v_ref.status <> 'rewarded' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only rewarded referrals can be reversed.');
  END IF;

  -- ── 3.1 Reconcile partner_earnings ──
  SELECT id, status, partner_earning_amount
    INTO v_earning_id, v_earning_status, v_earning_amount
    FROM public.partner_earnings
   WHERE referral_id = p_referral_id
   FOR UPDATE;

  IF v_earning_id IS NOT NULL AND v_earning_status <> 'reversed' THEN
    IF v_earning_status = 'eligible' THEN
      UPDATE public.partner_earnings
         SET status = 'reversed',
             reversal_reason = p_reason,
             reversed_at = now()
       WHERE id = v_earning_id;

    ELSIF v_earning_status = 'reserved' THEN
      -- Find active payout allocation
      SELECT pa.id, pa.payout_id, po.status
        INTO v_alloc_id, v_payout_id, v_payout_status
        FROM public.payout_allocations pa
        JOIN public.payouts po ON po.id = pa.payout_id
       WHERE pa.earning_id = v_earning_id
         AND pa.status = 'allocated'
       LIMIT 1;

      UPDATE public.partner_earnings
         SET status = 'reversed',
             reversal_reason = p_reason,
             reversed_at = now()
       WHERE id = v_earning_id;

      IF v_alloc_id IS NOT NULL THEN
        UPDATE public.payout_allocations
           SET status = 'reversed',
               updated_at = now()
         WHERE id = v_alloc_id;
      END IF;

      -- If payout is pending, recalculate or cancel it
      IF v_payout_id IS NOT NULL AND v_payout_status IN ('requested', 'approved', 'processing') THEN
        SELECT COALESCE(SUM(amount), 0) INTO v_remaining_alloc
          FROM public.payout_allocations
         WHERE payout_id = v_payout_id AND status = 'allocated';

        IF v_remaining_alloc <= 0 THEN
          UPDATE public.payouts
             SET status = 'cancelled',
                 cancellation_reason = 'Referral reward reversed after payout request',
                 cancelled_by = v_actor_id,
                 cancelled_at = now(),
                 updated_at = now()
           WHERE id = v_payout_id;
        ELSE
          UPDATE public.payouts
             SET requested_amount = GREATEST(0, v_remaining_alloc - deductions_amount),
                 gross_amount = v_remaining_alloc,
                 updated_at = now()
           WHERE id = v_payout_id;
        END IF;
      END IF;

    ELSIF v_earning_status = 'paid' THEN
      -- Payout was ALREADY paid out to partner! Record clawback deduction
      UPDATE public.partner_earnings
         SET status = 'reversed',
             reversal_reason = p_reason,
             reversed_at = now()
       WHERE id = v_earning_id;

      INSERT INTO public.payout_adjustments (
        payout_id,
        partner_id,
        booking_id,
        kind,
        amount,
        reason,
        status,
        actor_id
      ) VALUES (
        NULL,
        v_ref.partner_id,
        NULL,
        'clawback',
        -v_earning_amount,
        'Clawback — referral reward reversed (' || p_reason || ') after payout was paid',
        'pending',
        v_actor_id
      );
    END IF;
  END IF;

  -- ── 3.2 Debit wallets (bonus balances) ──
  v_partner_db := public.debit_wallet(
    p_user_id      => v_ref.partner_id,
    p_amount       => v_ref.partner_reward,
    p_source       => 'reversal',
    p_reference_id => p_referral_id,
    p_metadata     => jsonb_build_object('program', 'partner', 'party', 'partner', 'reason', p_reason),
    p_description  => 'Partner referral reward reversed by administrator',
    p_balance_type => 'bonus'
  );

  v_customer_db := public.debit_wallet(
    p_user_id      => v_ref.referred_id,
    p_amount       => v_ref.customer_reward,
    p_source       => 'reversal',
    p_reference_id => p_referral_id,
    p_metadata     => jsonb_build_object('program', 'partner', 'party', 'referred', 'reason', p_reason),
    p_description  => 'Partner referral bonus reversed by administrator',
    p_balance_type => 'bonus'
  );

  UPDATE public.partner_referrals
     SET status  = 'reversed',
         reversal = jsonb_build_object(
           'reversed_by',  v_actor_id,
           'reversed_at',  now(),
           'reason',       p_reason,
           'partner_debit',  v_partner_db,
           'customer_debit', v_customer_db
         )
   WHERE id = p_referral_id;

  INSERT INTO public.partner_referral_events (referral_id, event_type, actor_id, actor_role, reason)
    VALUES (p_referral_id, 'reversed', v_actor_id, 'admin', p_reason);

  RETURN jsonb_build_object('success', true, 'referral_id', p_referral_id);
END;
$$;


-- ─── 4. SUMMARY RPC: get_partner_payout_summary ─────────────────────────────

CREATE OR REPLACE FUNCTION public.get_partner_payout_summary(p_partner_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id      UUID;
  v_total_earned  NUMERIC(10, 2) := 0;
  v_paid          NUMERIC(10, 2) := 0;
  v_paid_bank     NUMERIC(10, 2) := 0;
  v_paid_cash     NUMERIC(10, 2) := 0;
  v_processing    NUMERIC(10, 2) := 0;
  v_eligible      NUMERIC(10, 2) := 0;
  v_clawback_due  NUMERIC(10, 2) := 0;
  v_restitution   NUMERIC(10, 2) := 0;
  v_net_clawback  NUMERIC(10, 2) := 0;
  v_available     NUMERIC(10, 2) := 0;
  v_min           NUMERIC(10, 2);
  v_enabled       BOOLEAN;
  v_current       JSONB;
  v_earnings      JSONB;
  v_payouts       JSONB;
BEGIN
  BEGIN
    v_actor_id := auth.uid();
  EXCEPTION WHEN OTHERS THEN
    v_actor_id := NULL;
  END;

  IF v_actor_id IS NOT NULL
     AND v_actor_id IS DISTINCT FROM p_partner_id
     AND NOT public.is_admin(v_actor_id) THEN
    RAISE EXCEPTION 'Unauthorized: cannot view another professional''s payout summary.';
  END IF;

  SELECT pc.min_amount, pc.enabled
    INTO v_min, v_enabled
    FROM public.get_payout_config() AS pc;

  -- 1. Total Earned (excludes reversed snapshots; includes both bookings and referral rewards)
  SELECT COALESCE(SUM(partner_earning_amount), 0) INTO v_total_earned
    FROM public.partner_earnings
   WHERE partner_id = p_partner_id AND status <> 'reversed';

  -- 2. Paid: bank payouts disbursed via allocations + cash earnings received directly
  SELECT COALESCE(SUM(amount), 0) INTO v_paid_bank
    FROM public.payout_allocations
   WHERE partner_id = p_partner_id AND status = 'paid';

  SELECT COALESCE(SUM(partner_earning_amount), 0) INTO v_paid_cash
    FROM public.partner_earnings
   WHERE partner_id = p_partner_id AND is_cash = TRUE AND status = 'paid';

  v_paid := v_paid_bank + v_paid_cash;

  -- 3. Processing (live allocations on requested/approved/processing payouts)
  SELECT COALESCE(SUM(pa.amount), 0) INTO v_processing
    FROM public.payout_allocations pa
    JOIN public.payouts po ON po.id = pa.payout_id
   WHERE pa.partner_id = p_partner_id
     AND pa.status = 'allocated'
     AND po.status IN ('requested', 'approved', 'processing');

  -- 4. Eligible (unreserved earnings ready for withdrawal)
  SELECT COALESCE(SUM(partner_earning_amount), 0) INTO v_eligible
    FROM public.partner_earnings
   WHERE partner_id = p_partner_id AND status = 'eligible';

  -- 5. Clawback Due (unsettled deductions minus pending restitutions)
  SELECT COALESCE(SUM(ABS(amount)), 0) INTO v_clawback_due
    FROM public.payout_adjustments
   WHERE partner_id = p_partner_id
     AND amount < 0
     AND (status = 'pending' OR (status IS NULL AND settled_at IS NULL));

  SELECT COALESCE(SUM(amount), 0) INTO v_restitution
    FROM public.payout_adjustments
   WHERE partner_id = p_partner_id
     AND amount > 0
     AND (status = 'pending' OR (status IS NULL AND settled_at IS NULL));

  v_net_clawback := GREATEST(0, v_clawback_due - v_restitution);

  -- 6. Available = eligible - net_clawback, clamped at 0
  v_available := GREATEST(0, v_eligible - v_net_clawback);

  -- Current pending payout, if any
  SELECT jsonb_build_object(
    'id', po.id,
    'payout_number', po.payout_number,
    'status', po.status,
    'requested_amount', po.requested_amount,
    'gross_amount', po.gross_amount,
    'deductions_amount', po.deductions_amount,
    'requested_at', po.requested_at,
    'payment_method', po.payment_method,
    'rejection_reason', po.rejection_reason
  ) INTO v_current
    FROM public.payouts po
   WHERE po.partner_id = p_partner_id
     AND po.status IN ('requested', 'approved', 'processing')
   ORDER BY po.created_at DESC
   LIMIT 1;

  -- Recent earnings (last 20, includes bookings and referrals)
  SELECT COALESCE(jsonb_agg(row_to_jsonb ORDER BY completed_at DESC), '[]'::jsonb) INTO v_earnings
    FROM (
      SELECT id, booking_id, referral_id, earning_type, description, total_amount, gst_amount, service_revenue,
             commission_percent, platform_commission_amount,
             partner_earning_amount, status, completed_at, payment_method, is_cash
        FROM public.partner_earnings
       WHERE partner_id = p_partner_id
       ORDER BY completed_at DESC
       LIMIT 20
    ) row_to_jsonb;

  -- Recent payouts (last 20)
  SELECT COALESCE(jsonb_agg(row_to_jsonb ORDER BY created_at DESC), '[]'::jsonb) INTO v_payouts
    FROM (
      SELECT id, payout_number, requested_amount, gross_amount, deductions_amount,
             status, payment_method, payment_reference, requested_at, approved_at,
             processed_at, paid_at, rejected_at, cancelled_at, rejection_reason,
             cancellation_reason, admin_note, created_at
        FROM public.payouts
       WHERE partner_id = p_partner_id
       ORDER BY created_at DESC
       LIMIT 20
    ) row_to_jsonb;

  RETURN jsonb_build_object(
    'partner_id',     p_partner_id,
    'payouts_enabled',v_enabled,
    'min_payout',     v_min,
    'total_earned',   v_total_earned,
    'paid',           v_paid,
    'paid_bank',      v_paid_bank,
    'paid_cash',      v_paid_cash,
    'processing',     v_processing,
    'eligible',       v_eligible,
    'clawback_due',   v_net_clawback,
    'available',      v_available,
    'current_payout', v_current,
    'earnings',       v_earnings,
    'payouts',        v_payouts
  );
END;
$$;


-- ─── 5. HISTORICAL BACKFILL ─────────────────────────────────────────────────

INSERT INTO public.partner_earnings (
  booking_id,
  referral_id,
  partner_id,
  earning_type,
  description,
  total_amount,
  gst_amount,
  service_revenue,
  commission_percent,
  platform_commission_amount,
  partner_earning_amount,
  status,
  completed_at,
  payment_method,
  is_cash
)
SELECT
  NULL,
  pr.id,
  pr.partner_id,
  'referral',
  'Partner referral reward (historical backfill)',
  pr.partner_reward,
  0,
  pr.partner_reward,
  0,
  0,
  pr.partner_reward,
  'eligible',
  COALESCE(pr.rewarded_at, pr.qualified_at, pr.created_at, now()),
  'Referral',
  FALSE
FROM public.partner_referrals pr
WHERE pr.status = 'rewarded'
  AND NOT EXISTS (
    SELECT 1 FROM public.partner_earnings pe WHERE pe.referral_id = pr.id
  )
ON CONFLICT DO NOTHING;
