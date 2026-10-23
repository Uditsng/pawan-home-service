-- ════════════════════════════════════════════════════════════════════════════
-- Migration: Fix Cash Booking Partner Payout Double-Payment (BUG-03)
-- File: 20261001010000_fix_cash_booking_partner_payout.sql
--
-- Problem:
--   When a customer pays with Cash on Completion (payment_method = 'Cash'),
--   the partner physically collects 100% of the cash from the customer.
--   The previous completion trigger (tr_partner_earning_on_complete) marked
--   the partner's earning as 'eligible' in public.partner_earnings regardless
--   of payment_method.
--
--   This allowed partners to request a bank transfer payout from the platform
--   for earnings they had ALREADY collected in cash directly from the customer
--   (double-payment).
--   Furthermore, the platform's commission collected by the partner in cash
--   was never deducted from future online payouts.
--
-- Fix:
--   1. Schema Enhancements:
--      - partner_earnings: add `is_cash` (BOOLEAN) and `payment_method` (VARCHAR).
--      - payout_adjustments: add `settled_at` (TIMESTAMPTZ), `settled_payout_id` (UUID),
--        `booking_id` (UUID), and `status` (VARCHAR: pending/settled/cancelled).
--      - payouts: add `gross_amount` (NUMERIC) and `deductions_amount` (NUMERIC).
--
--   2. Completion Trigger (handle_partner_earning_on_complete):
--      - Inspects bookings.payment_method (case-insensitive 'cash').
--      - Cash bookings: partner_earnings.status = 'paid' (partner was paid in cash;
--        NOT eligible for withdrawal via bank transfer).
--      - Platform commission is recorded in public.payout_adjustments with
--        kind = 'clawback', amount = -commission, status = 'pending'.
--      - Online bookings: partner_earnings.status = 'eligible' (standard flow).
--
--   3. Reversal Trigger (handle_partner_earning_reverse):
--      - When a completed cash booking is cancelled/refunded, reverse the earning
--        and cancel/refund the commission clawback.
--
--   4. RPCs:
--      - get_partner_payout_summary:
--          * total_earned: includes both online & cash (status <> 'reversed').
--          * paid: sum of paid allocations + paid cash earnings.
--          * eligible: sum of unwithdrawn online earnings (status = 'eligible').
--          * clawback_due: sum of unsettled deductions (amount < 0 AND settled_at IS NULL).
--          * available: GREATEST(0, eligible - clawback_due).
--      - request_partner_payout:
--          * Allocates eligible earnings.
--          * Settles pending clawbacks against the payout (deducting from gross).
--          * requested_amount = gross_allocated - clawbacks_settled.
--      - reject_partner_payout / cancel_partner_payout_request:
--          * Releases reserved earnings back to 'eligible'.
--          * Un-settles any clawbacks linked to the payout back to 'pending'.
--
--   5. Backfill / Data Correction:
--      - Existing cash booking partner_earnings currently in 'eligible' status
--        are updated to 'paid' to prevent immediate exploitation/double-payout.
--      - Historical cash commissions are recorded in payout_adjustments.
-- ════════════════════════════════════════════════════════════════════════════

-- ─── 1. SCHEMA ENHANCEMENTS ──────────────────────────────────────────────────

-- 1.1 partner_earnings
ALTER TABLE public.partner_earnings
  ADD COLUMN IF NOT EXISTS payment_method VARCHAR(30) DEFAULT 'Online',
  ADD COLUMN IF NOT EXISTS is_cash BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_partner_earnings_is_cash
  ON public.partner_earnings (partner_id, is_cash);

-- 1.2 payout_adjustments
ALTER TABLE public.payout_adjustments
  ADD COLUMN IF NOT EXISTS booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS settled_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS settled_payout_id UUID REFERENCES public.payouts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'settled', 'cancelled'));

CREATE INDEX IF NOT EXISTS idx_payout_adjustments_unsettled
  ON public.payout_adjustments (partner_id, amount)
  WHERE (settled_at IS NULL AND status = 'pending');

CREATE INDEX IF NOT EXISTS idx_payout_adjustments_settled_payout
  ON public.payout_adjustments (settled_payout_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_payout_adjustments_booking_kind
  ON public.payout_adjustments (booking_id, kind)
  WHERE booking_id IS NOT NULL;

-- 1.3 payouts
ALTER TABLE public.payouts
  ADD COLUMN IF NOT EXISTS gross_amount NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS deductions_amount NUMERIC(10, 2) NOT NULL DEFAULT 0;


-- ─── 2. COMPLETION TRIGGER FUNCTION ──────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_partner_earning_on_complete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_amount        NUMERIC(10, 2);
  v_gst_amount          NUMERIC(10, 2);
  v_service_revenue     NUMERIC(10, 2);
  v_commission_percent  NUMERIC(5, 2);
  v_platform_commission NUMERIC(10, 2);
  v_partner_earning     NUMERIC(10, 2);
  v_cfg                 RECORD;
  v_completed_at        TIMESTAMP WITH TIME ZONE;
  v_is_cash             BOOLEAN;
  v_earning_status      VARCHAR(20);
  v_payment_method      VARCHAR(30);
  v_earning_id          UUID;
BEGIN
  IF NEW.partner_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT *
    INTO v_cfg
    FROM public.get_payout_config();

  v_commission_percent := COALESCE(v_cfg.commission_percent, 20);

  SELECT COALESCE(bp.total_price, NEW.total_amount, 0),
         COALESCE(bp.gst_amount, 0)
    INTO v_total_amount, v_gst_amount
    FROM public.booking_pricing bp
   WHERE bp.booking_id = NEW.id;

  IF v_total_amount IS NULL THEN
    v_total_amount := COALESCE(NEW.total_amount, 0);
    v_gst_amount   := 0;
  END IF;

  v_service_revenue     := GREATEST(0, v_total_amount - COALESCE(v_gst_amount, 0));
  v_platform_commission := ROUND(v_service_revenue * (v_commission_percent / 100), 2);
  v_partner_earning     := ROUND(v_service_revenue * ((100 - v_commission_percent) / 100), 2);
  v_completed_at        := COALESCE(NEW.completed_at, NEW.service_completed_at, NEW.created_at, now());

  -- Determine if cash booking
  v_payment_method := COALESCE(NULLIF(TRIM(NEW.payment_method), ''), 'Online');
  v_is_cash := (LOWER(v_payment_method) = 'cash');

  -- Cash bookings: partner collected cash in hand, so the earning is already PAID.
  -- Online bookings: partner earning is ELIGIBLE for platform withdrawal.
  IF v_is_cash THEN
    v_earning_status := 'paid';
  ELSE
    v_earning_status := 'eligible';
  END IF;

  INSERT INTO public.partner_earnings (
    booking_id, partner_id, total_amount, gst_amount, service_revenue,
    commission_percent, platform_commission_amount, partner_earning_amount,
    status, completed_at, payment_method, is_cash
  ) VALUES (
    NEW.id, NEW.partner_id, v_total_amount, COALESCE(v_gst_amount, 0), v_service_revenue,
    v_commission_percent,
    v_platform_commission,
    v_partner_earning,
    v_earning_status, v_completed_at,
    v_payment_method, v_is_cash
  )
  ON CONFLICT (booking_id) DO UPDATE SET
    total_amount               = EXCLUDED.total_amount,
    gst_amount                 = EXCLUDED.gst_amount,
    service_revenue            = EXCLUDED.service_revenue,
    commission_percent         = EXCLUDED.commission_percent,
    platform_commission_amount = EXCLUDED.platform_commission_amount,
    partner_earning_amount     = EXCLUDED.partner_earning_amount,
    payment_method             = EXCLUDED.payment_method,
    is_cash                    = EXCLUDED.is_cash,
    status                     = CASE
                                   WHEN partner_earnings.status IN ('reserved', 'paid') AND NOT EXCLUDED.is_cash
                                     THEN partner_earnings.status
                                   ELSE EXCLUDED.status
                                 END
  RETURNING id INTO v_earning_id;

  -- For Cash bookings: partner collected the platform's cut in cash.
  -- Record platform commission as a pending clawback adjustment to recover from future online payouts.
  IF v_is_cash AND v_platform_commission > 0 THEN
    -- Check if an adjustment already exists for this booking to remain idempotent
    IF NOT EXISTS (
      SELECT 1 FROM public.payout_adjustments
       WHERE booking_id = NEW.id AND kind = 'clawback'
    ) THEN
      INSERT INTO public.payout_adjustments (
        payout_id, partner_id, booking_id, kind, amount, reason, status, actor_id
      ) VALUES (
        NULL,
        NEW.partner_id,
        NEW.id,
        'clawback',
        -v_platform_commission,
        'Platform commission for cash-collected booking #' || SUBSTRING(NEW.id::text, 1, 8),
        'pending',
        NULL
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;


-- ─── 3. REVERSAL TRIGGER FUNCTION ────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_partner_earning_reverse()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_earning_id     UUID;
  v_earning_status VARCHAR(20);
  v_earning_amount NUMERIC(10, 2);
  v_is_cash        BOOLEAN;
  v_alloc          RECORD;
  v_payout_status  VARCHAR(20);
  v_released_count INT := 0;
  v_adj            RECORD;
BEGIN
  SELECT id, status, partner_earning_amount, is_cash
    INTO v_earning_id, v_earning_status, v_earning_amount, v_is_cash
    FROM public.partner_earnings
   WHERE booking_id = NEW.id;

  IF v_earning_id IS NULL THEN
    RETURN NEW; -- no snapshot
  END IF;

  IF v_earning_status = 'reversed' THEN
    RETURN NEW;
  END IF;

  -- ── Case Cash Booking ──
  IF v_is_cash THEN
    UPDATE public.partner_earnings
       SET status = 'reversed',
           reversal_reason = 'Cash booking ' || NEW.status || ' after completion',
           reversed_at = now()
     WHERE id = v_earning_id;

    -- Handle commission adjustment: cancel pending clawbacks or restitute settled ones
    FOR v_adj IN
      SELECT id, status, amount, settled_at
        FROM public.payout_adjustments
       WHERE booking_id = NEW.id AND kind = 'clawback'
    LOOP
      IF v_adj.status = 'pending' AND v_adj.settled_at IS NULL THEN
        UPDATE public.payout_adjustments
           SET status = 'cancelled',
               reason = reason || ' (Cancelled: booking reversed)'
         WHERE id = v_adj.id;
      ELSIF v_adj.status = 'settled' OR v_adj.settled_at IS NOT NULL THEN
        -- If commission was already deducted from a payout, grant restitution
        INSERT INTO public.payout_adjustments (
          payout_id, partner_id, booking_id, kind, amount, reason, status, actor_id
        ) VALUES (
          NULL,
          NEW.partner_id,
          NEW.id,
          'restitution',
          ABS(v_adj.amount),
          'Restitution of commission for reversed cash booking #' || SUBSTRING(NEW.id::text, 1, 8),
          'pending',
          NULL
        );
      END IF;
    END LOOP;

    RETURN NEW;
  END IF;

  -- ── Case Online Booking: still available (eligible) ──
  IF v_earning_status = 'eligible' THEN
    UPDATE public.partner_earnings
       SET status = 'reversed',
           reversal_reason = 'Booking ' || NEW.status || ' after completion',
           reversed_at = now()
     WHERE id = v_earning_id;
    RETURN NEW;
  END IF;

  -- ── Case Online Booking: reserved or already paid inside a payout ──
  SELECT pa.id, pa.payout_id, pa.status, po.status
    INTO v_alloc.id, v_alloc.payout_id, v_alloc.status, v_payout_status
    FROM public.payout_allocations pa
    JOIN public.payouts po ON po.id = pa.payout_id
   WHERE pa.earning_id = v_earning_id
     AND pa.status IN ('allocated', 'paid')
   ORDER BY pa.created_at DESC
   LIMIT 1;

  IF NOT FOUND THEN
    UPDATE public.partner_earnings
       SET status = 'reversed',
           reversal_reason = 'Booking ' || NEW.status || ' after completion',
           reversed_at = now()
     WHERE id = v_earning_id;
    RETURN NEW;
  END IF;

  UPDATE public.partner_earnings
     SET status = 'reversed',
         reversal_reason = 'Booking ' || NEW.status || ' after completion',
         reversed_at = now()
   WHERE id = v_earning_id;

  UPDATE public.payout_allocations
     SET status = 'reversed',
         updated_at = now()
   WHERE id = v_alloc.id;

  IF v_alloc.status = 'allocated' AND v_payout_status = 'paid' THEN
    INSERT INTO public.payout_adjustments (
      payout_id, partner_id, kind, amount, reason, status, actor_id
    ) VALUES (
      v_alloc.payout_id, NEW.partner_id, 'clawback', -v_earning_amount,
      'Clawback — booking ' || SUBSTRING(NEW.id::text, 1, 8) || ' reversed (' || NEW.status || ') after payout was paid',
      'pending',
      NULL
    );

    INSERT INTO public.payout_events (payout_id, event_type, actor_id, actor_role, metadata)
    VALUES (v_alloc.payout_id, 'clawback', NULL, 'system',
            jsonb_build_object('earning_id', v_earning_id, 'amount', v_earning_amount,
                               'reason', 'Booking reversed after paid payout'));

    RETURN NEW;
  END IF;

  IF v_payout_status IN ('requested', 'approved', 'processing') THEN
    UPDATE public.payouts
       SET status = 'cancelled',
           cancellation_reason = 'Booking reversed after payout request',
           cancelled_by = NULL,
           cancelled_at = now(),
           updated_at = now()
     WHERE id = v_alloc.payout_id
       AND status IN ('requested', 'approved', 'processing');

    INSERT INTO public.payout_events (payout_id, event_type, actor_id, actor_role, metadata)
    VALUES (v_alloc.payout_id, 'cancelled', NULL, 'system',
            jsonb_build_object('earning_id', v_earning_id,
                               'reason', 'Booking ' || NEW.status || ' after completion'));

    -- Release unaffected allocations
    SELECT COUNT(*) INTO v_released_count
      FROM public.payout_allocations nick
      JOIN public.partner_earnings pe_nick ON pe_nick.id = nick.earning_id
     WHERE nick.payout_id = v_alloc.payout_id
       AND nick.earning_id <> v_earning_id
       AND nick.status = 'allocated'
       AND pe_nick.status = 'reserved';

    UPDATE public.payout_allocations nick
       SET status = 'released',
           updated_at = now()
      FROM public.partner_earnings pe_nick
     WHERE nick.payout_id = v_alloc.payout_id
       AND nick.earning_id = pe_nick.id
       AND nick.earning_id <> v_earning_id
       AND nick.status = 'allocated'
       AND pe_nick.status = 'reserved';

    UPDATE public.partner_earnings pe
       SET status = 'eligible'
      FROM public.payout_allocations pa
     WHERE pa.payout_id = v_alloc.payout_id
       AND pa.earning_id = pe.id
       AND pa.earning_id <> v_earning_id
       AND pa.status = 'released'
       AND pe.status = 'reserved';

    -- Un-settle any clawbacks linked to this cancelled payout
    UPDATE public.payout_adjustments
       SET status = 'pending',
           settled_at = NULL,
           settled_payout_id = NULL
     WHERE settled_payout_id = v_alloc.payout_id;

    IF v_released_count > 0 THEN
      INSERT INTO public.payout_events (payout_id, event_type, actor_id, actor_role, metadata)
      VALUES (v_alloc.payout_id, 'released', NULL, 'system',
              jsonb_build_object('released_allocations', v_released_count));
    END IF;
  END IF;

  RETURN NEW;
END;
$$;


-- ─── 4. RPC: GET PARTNER PAYOUT SUMMARY ──────────────────────────────────────

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

  -- 1. Total Earned (excludes reversed snapshots; includes both cash and online)
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

  -- 4. Eligible (unreserved online earnings ready for withdrawal)
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

  -- Recent earnings (last 20)
  SELECT COALESCE(jsonb_agg(row_to_jsonb ORDER BY completed_at DESC), '[]'::jsonb) INTO v_earnings
    FROM (
      SELECT id, booking_id, total_amount, gst_amount, service_revenue,
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
             cancellation_reason, admin_note
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


-- ─── 5. RPC: REQUEST PARTNER PAYOUT ──────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.request_partner_payout(p_partner_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id           UUID;
  v_enabled            BOOLEAN;
  v_min                NUMERIC(10, 2);
  v_eligible           NUMERIC(10, 2) := 0;
  v_clawback_due       NUMERIC(10, 2) := 0;
  v_restitution        NUMERIC(10, 2) := 0;
  v_net_clawback       NUMERIC(10, 2) := 0;
  v_available          NUMERIC(10, 2) := 0;
  v_payout_id          UUID;
  v_payout_number      TEXT;
  v_gross_allocated    NUMERIC(10, 2) := 0;
  v_clawbacks_to_settle NUMERIC(10, 2) := 0;
  v_earning            RECORD;
  v_adj                RECORD;
BEGIN
  BEGIN
    v_actor_id := auth.uid();
  EXCEPTION WHEN OTHERS THEN
    v_actor_id := NULL;
  END;

  IF v_actor_id IS NOT NULL AND v_actor_id IS DISTINCT FROM p_partner_id THEN
    RAISE EXCEPTION 'Unauthorized: cannot request a payout for another professional.';
  END IF;

  SELECT pc.enabled, pc.min_amount INTO v_enabled, v_min
    FROM public.get_payout_config() AS pc;

  IF NOT COALESCE(v_enabled, TRUE) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Payouts are currently disabled. Please try later.');
  END IF;

  -- 1. Strictly serialize concurrent requests for the same partner via row-level lock
  PERFORM 1 FROM public.profiles WHERE id = p_partner_id FOR UPDATE;

  -- 2. Single active payout per partner
  IF EXISTS (
    SELECT 1 FROM public.payouts
     WHERE partner_id = p_partner_id AND status IN ('requested', 'approved', 'processing')
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'You already have a payout in progress.');
  END IF;

  -- 3. Lock eligible earning rows
  PERFORM 1 FROM public.partner_earnings
    WHERE partner_id = p_partner_id AND status = 'eligible'
    FOR UPDATE;

  SELECT COALESCE(SUM(partner_earning_amount), 0) INTO v_eligible
    FROM public.partner_earnings
   WHERE partner_id = p_partner_id AND status = 'eligible';

  -- Calculate unsettled deductions and restitutions
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
  v_available    := GREATEST(0, v_eligible - v_net_clawback);

  IF v_available <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'No available earnings to withdraw.');
  END IF;

  IF v_available < v_min THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Minimum payout is ₹' || TRIM(TO_CHAR(v_min, 'FM999G999G999G999')) ||
               '. You have ₹' || TRIM(TO_CHAR(v_available, 'FM999G999G999G999')) || ' available.'
    );
  END IF;

  v_payout_number := 'PAY-' || LPAD(nextval('public.payout_number_seq')::TEXT, 6, '0');

  INSERT INTO public.payouts (
    payout_number, partner_id, requested_amount, gross_amount, deductions_amount, status
  ) VALUES (
    v_payout_number, p_partner_id, v_available, v_eligible, v_net_clawback, 'requested'
  )
  RETURNING id INTO v_payout_id;

  -- Allocate all eligible earnings to this payout
  FOR v_earning IN
    SELECT id, partner_earning_amount
      FROM public.partner_earnings
     WHERE partner_id = p_partner_id AND status = 'eligible'
     ORDER BY completed_at ASC NULLS LAST, id ASC
  LOOP
    INSERT INTO public.payout_allocations (payout_id, earning_id, partner_id, amount, status)
    VALUES (v_payout_id, v_earning.id, p_partner_id, v_earning.partner_earning_amount, 'allocated');

    UPDATE public.partner_earnings
       SET status = 'reserved'
     WHERE id = v_earning.id;

    v_gross_allocated := v_gross_allocated + v_earning.partner_earning_amount;
  END LOOP;

  -- Settle pending clawback adjustments against this payout
  IF v_net_clawback > 0 THEN
    FOR v_adj IN
      SELECT id, amount
        FROM public.payout_adjustments
       WHERE partner_id = p_partner_id
         AND (status = 'pending' OR (status IS NULL AND settled_at IS NULL))
       ORDER BY created_at ASC
    LOOP
      UPDATE public.payout_adjustments
         SET status = 'settled',
             settled_at = now(),
             settled_payout_id = v_payout_id
       WHERE id = v_adj.id;

      IF v_adj.amount < 0 THEN
        v_clawbacks_to_settle := v_clawbacks_to_settle + ABS(v_adj.amount);
      END IF;
    END LOOP;
  END IF;

  -- Calculate final net payout amount
  v_available := GREATEST(0, v_gross_allocated - v_net_clawback);

  IF v_available < v_min THEN
    -- Roll back allocations and adjustment settlements
    DELETE FROM public.payouts WHERE id = v_payout_id;
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Unable to withdraw: available balance after deductions is below the minimum payout of ₹' ||
               TRIM(TO_CHAR(v_min, 'FM999G999G999G999')) || '.'
    );
  END IF;

  UPDATE public.payouts
     SET requested_amount  = v_available,
         gross_amount      = v_gross_allocated,
         deductions_amount = v_net_clawback
   WHERE id = v_payout_id;

  INSERT INTO public.payout_events (payout_id, event_type, actor_id, actor_role, metadata)
  VALUES (v_payout_id, 'requested', p_partner_id, 'partner',
          jsonb_build_object(
            'requested_amount', v_available,
            'gross_allocated', v_gross_allocated,
            'deductions', v_net_clawback
          ));

  RETURN jsonb_build_object(
    'success', true,
    'payout_id', v_payout_id,
    'payout_number', v_payout_number,
    'amount', v_available
  );
END;
$$;


-- ─── 6. RPC: REJECT PARTNER PAYOUT ───────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.reject_partner_payout(p_payout_id UUID, p_admin_id UUID, p_reason TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor UUID := COALESCE(p_admin_id, auth.uid());
BEGIN
  IF v_actor IS NULL OR NOT public.is_admin(v_actor) THEN
    RAISE EXCEPTION 'Administrative access required.';
  END IF;

  PERFORM 1 FROM public.payouts WHERE id = p_payout_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Payout not found.');
  END IF;

  UPDATE public.payouts
     SET status = 'rejected',
         rejection_reason = COALESCE(p_reason, 'Rejected by administrator'),
         rejected_by = v_actor,
         rejected_at = now(),
         updated_at = now()
   WHERE id = p_payout_id AND status IN ('requested', 'approved');

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Payout can only be rejected while requested or approved.');
  END IF;

  -- Release every allocated earning back to eligible
  UPDATE public.payout_allocations
     SET status = 'released',
         updated_at = now()
   WHERE payout_id = p_payout_id AND status = 'allocated';

  UPDATE public.partner_earnings pe
     SET status = 'eligible'
    FROM public.payout_allocations pa
   WHERE pa.payout_id = p_payout_id
     AND pa.earning_id = pe.id
     AND pa.status = 'released'
     AND pe.status = 'reserved';

  -- Un-settle any clawbacks linked to this payout back to pending
  UPDATE public.payout_adjustments
     SET status = 'pending',
         settled_at = NULL,
         settled_payout_id = NULL
   WHERE settled_payout_id = p_payout_id;

  INSERT INTO public.payout_events (payout_id, event_type, actor_id, actor_role, metadata)
  VALUES (p_payout_id, 'rejected', v_actor, 'admin',
          jsonb_build_object('reason', COALESCE(p_reason, '')));

  INSERT INTO public.payout_events (payout_id, event_type, actor_id, actor_role, metadata)
  VALUES (p_payout_id, 'released', v_actor, 'admin',
          jsonb_build_object('reason', 'Rejected payout released allocations and un-settled deductions'));

  RETURN jsonb_build_object('success', true, 'payout_id', p_payout_id, 'status', 'rejected');
END;
$$;


-- ─── 7. RPC: CANCEL PARTNER PAYOUT REQUEST ───────────────────────────────────

CREATE OR REPLACE FUNCTION public.cancel_partner_payout_request(p_payout_id UUID, p_partner_id UUID, p_reason TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor UUID := COALESCE(p_partner_id, auth.uid());
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Unauthorized.';
  END IF;

  PERFORM 1 FROM public.payouts WHERE id = p_payout_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Payout not found.');
  END IF;

  IF NOT public.is_admin(v_actor)
     AND NOT EXISTS (
       SELECT 1 FROM public.payouts
        WHERE id = p_payout_id AND partner_id = v_actor
     ) THEN
    RAISE EXCEPTION 'Unauthorized: cannot cancel another professional''s payout.';
  END IF;

  UPDATE public.payouts
     SET status = 'cancelled',
         cancellation_reason = COALESCE(p_reason, 'Cancelled by requester'),
         cancelled_by = v_actor,
         cancelled_at = now(),
         updated_at = now()
   WHERE id = p_payout_id AND status IN ('requested', 'approved');

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only requested or approved payouts can be cancelled.');
  END IF;

  -- Release allocations
  UPDATE public.payout_allocations
     SET status = 'released',
         updated_at = now()
   WHERE payout_id = p_payout_id AND status = 'allocated';

  UPDATE public.partner_earnings pe
     SET status = 'eligible'
    FROM public.payout_allocations pa
   WHERE pa.payout_id = p_payout_id
     AND pa.earning_id = pe.id
     AND pa.status = 'released'
     AND pe.status = 'reserved';

  -- Un-settle any clawbacks linked to this payout back to pending
  UPDATE public.payout_adjustments
     SET status = 'pending',
         settled_at = NULL,
         settled_payout_id = NULL
   WHERE settled_payout_id = p_payout_id;

  INSERT INTO public.payout_events (payout_id, event_type, actor_id, actor_role, metadata)
  VALUES (p_payout_id, 'cancelled', v_actor,
          CASE WHEN public.is_admin(v_actor) THEN 'admin' ELSE 'partner' END,
          jsonb_build_object('reason', COALESCE(p_reason, '')));

  INSERT INTO public.payout_events (payout_id, event_type, actor_id, actor_role, metadata)
  VALUES (p_payout_id, 'released', v_actor, 'system',
          jsonb_build_object('reason', 'Cancelled payout released allocations and un-settled deductions'));

  RETURN jsonb_build_object('success', true, 'payout_id', p_payout_id, 'status', 'cancelled');
END;
$$;


-- ─── 8. BACKFILL & HISTORICAL RECONCILIATION ─────────────────────────────────
-- Protect historical cash bookings from double-payment:
-- Flip any cash booking earning from 'eligible' to 'paid' so it cannot be withdrawn.
-- Also ensure platform commission clawback is recorded.

DO $$
DECLARE
  rec RECORD;
BEGIN
  -- 1. Identify all cash bookings in partner_earnings
  UPDATE public.partner_earnings pe
     SET is_cash = TRUE,
         payment_method = 'Cash'
    FROM public.bookings bk
   WHERE pe.booking_id = bk.id
     AND LOWER(COALESCE(bk.payment_method, '')) = 'cash';

  -- 2. Flip any unreserved eligible cash earnings to 'paid' (prevents double-payout)
  UPDATE public.partner_earnings
     SET status = 'paid'
   WHERE is_cash = TRUE
     AND status = 'eligible';

  -- 3. Record commission clawback for completed cash bookings where not yet recorded
  FOR rec IN
    SELECT pe.id AS earning_id,
           pe.booking_id,
           pe.partner_id,
           pe.platform_commission_amount
      FROM public.partner_earnings pe
     WHERE pe.is_cash = TRUE
       AND pe.status <> 'reversed'
       AND pe.platform_commission_amount > 0
       AND NOT EXISTS (
         SELECT 1 FROM public.payout_adjustments pa
          WHERE pa.booking_id = pe.booking_id
            AND pa.kind = 'clawback'
       )
  LOOP
    INSERT INTO public.payout_adjustments (
      payout_id, partner_id, booking_id, kind, amount, reason, status, actor_id
    ) VALUES (
      NULL,
      rec.partner_id,
      rec.booking_id,
      'clawback',
      -rec.platform_commission_amount,
      'Platform commission for cash-collected booking #' || SUBSTRING(rec.booking_id::text, 1, 8),
      'pending',
      NULL
    );
  END LOOP;

  -- 4. Check for any historical cash bookings that were already paid via a pre-fix payout (double-paid)
  --    Record a clawback for the double-paid partner earning to recover the overpayment
  FOR rec IN
    SELECT pe.id AS earning_id,
           pe.booking_id,
           pe.partner_id,
           pe.partner_earning_amount
      FROM public.partner_earnings pe
      JOIN public.payout_allocations pa ON pa.earning_id = pe.id
      JOIN public.payouts po ON po.id = pa.payout_id
     WHERE pe.is_cash = TRUE
       AND pa.status = 'paid'
       AND po.status = 'paid'
       AND NOT EXISTS (
         SELECT 1 FROM public.payout_adjustments adj
          WHERE adj.partner_id = pe.partner_id
            AND adj.reason LIKE '%pre-fix cash payout overpayment%'
            AND adj.amount = -pe.partner_earning_amount
       )
  LOOP
    INSERT INTO public.payout_adjustments (
      payout_id, partner_id, booking_id, kind, amount, reason, status, actor_id
    ) VALUES (
      NULL,
      rec.partner_id,
      rec.booking_id,
      'clawback',
      -rec.partner_earning_amount,
      'Clawback — historical pre-fix cash payout overpayment for booking #' || SUBSTRING(rec.booking_id::text, 1, 8),
      'pending',
      NULL
    );
  END LOOP;
END;
$$;
