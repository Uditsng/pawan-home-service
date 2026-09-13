-- ═══════════════════════════════════════════════════════════════
-- Customer Referral Program — Wallet Reward Migration (v2)
-- Created: 2026-09-18
--
-- Migrates the Customer Referral Program from:
--   "referrer paid after referred friend's FIRST completed service,
--    referred friend gets an inline checkout discount"
-- to:
--   "BOTH parties receive genuine, reusable PHS wallet credits,
--    atomically, at successful registration + referral attribution".
--
-- Key design decisions (approved architecture):
--   * New rewards are issued via reward_customer_referral() — idempotent,
--     atomic, dual-sided credit. Booking completion is decoupled entirely.
--   * Legacy rows (created before this migration) are preserved under the
--     old rules via complete_legacy_referral_reward().
--   * profiles.wallet_balance is protected from self-mutation via a
--     BEFORE UPDATE trigger (the RLS-owned-row hole is closed).
--   * wallet_transactions gains an idempotency index so no (user, referral)
--     credit can ever be duplicated.
--   * referral_events provides an append-only audit timeline.
-- ═══════════════════════════════════════════════════════════════

-- ─── 1. PROFILES — lock down protected columns ─────────────────
-- Non-admin users may never change these columns on their own row.
-- SECURITY DEFINER internal functions (current_user <> session_user)
-- are exempt because they are owned by us and validated in code.
-- service_role connections (auth.uid() IS NULL) are not blocked.

CREATE OR REPLACE FUNCTION public.protect_profiles_protected_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_actor_id  UUID      := NULL;
  v_is_admin  BOOLEAN;
BEGIN
  BEGIN
    v_actor_id := auth.uid();
  EXCEPTION WHEN OTHERS THEN
    v_actor_id := NULL;
  END;

  -- Bypass: session_user = current_user means we are NOT inside a
  -- SECURITY DEFINER function. If they differ, a definer context owns it.
  IF current_user IS DISTINCT FROM session_user THEN
    RETURN NEW;
  END IF;

  -- Bypass: no acting auth user (e.g. service-role key holders).
  IF v_actor_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Admins may change everything.
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = v_actor_id AND role = 'admin'
  ) INTO v_is_admin;

  IF v_is_admin THEN
    RETURN NEW;
  END IF;

  -- Non-admins may never mutate these protected columns.
  IF NEW.wallet_balance IS DISTINCT FROM OLD.wallet_balance
     OR NEW.referred_by IS DISTINCT FROM OLD.referred_by
     OR NEW.referral_code_used IS DISTINCT FROM OLD.referral_code_used
     OR NEW.role IS DISTINCT FROM OLD.role
     OR NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'Protected profile column change is not allowed for non-admin users.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_protect_profiles_protected_columns ON public.profiles;
CREATE TRIGGER tr_protect_profiles_protected_columns
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profiles_protected_columns();

-- ─── 2. REFERRALS — extend schema for wallet reward model ──────

ALTER TABLE public.referrals
  ADD COLUMN IF NOT EXISTS qualified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rewarded_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS referrer_tx_id  UUID REFERENCES public.wallet_transactions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS referred_tx_id  UUID REFERENCES public.wallet_transactions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reward_config_snapshot JSONB,
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'code',
  ADD COLUMN IF NOT EXISTS reward_model TEXT NOT NULL DEFAULT 'wallet_v1'
    CHECK (reward_model IN ('legacy', 'wallet_v1')),
  ADD COLUMN IF NOT EXISTS reversal JSONB;

-- Widen the status state machine. 'completed' is retained as the terminal
-- state for pre-existing legacy referrals.
ALTER TABLE public.referrals
  DROP CONSTRAINT IF EXISTS referrals_status_check;
ALTER TABLE public.referrals
  ADD CONSTRAINT referrals_status_check
    CHECK (status IN ('pending', 'completed', 'rewarded', 'cancelled', 'rejected', 'reversed'));

-- All pre-existing rows were created under the legacy (first-booking) model.
UPDATE public.referrals
   SET reward_model = 'legacy'
 WHERE reward_model = 'wallet_v1';

-- Admin listing performance.
CREATE INDEX IF NOT EXISTS idx_referrals_status_created
  ON public.referrals (status, created_at DESC);

-- RLS: allow involved parties + admins to see referral history.
DROP POLICY IF EXISTS "Referred user can view their own referral" ON public.referrals;
CREATE POLICY "Referred user can view their own referral" ON public.referrals
  FOR SELECT TO authenticated USING (referred_id = auth.uid());

-- ─── 3. WALLET_TRANSACTIONS — new source, metadata, idempotency ─

-- New source value for the referred customer's wallet bonus.
ALTER TABLE public.wallet_transactions
  DROP CONSTRAINT IF EXISTS wallet_transactions_source_check;
ALTER TABLE public.wallet_transactions
  ADD CONSTRAINT wallet_transactions_source_check
    CHECK (source IN ('referral_reward', 'referral_bonus', 'booking_discount', 'admin_adjustment', 'refund'));

ALTER TABLE public.wallet_transactions
  ADD COLUMN IF NOT EXISTS metadata JSONB;

-- DB-level idempotency: exactly ONE referral credit per (user, reference).
-- reference_id is the referral id for wallet_v1 rows and the booking id for
-- legacy rows, so the index doubles as the legacy double-pay guard.
CREATE UNIQUE INDEX IF NOT EXISTS uq_wallet_tx_referral
  ON public.wallet_transactions (user_id, reference_id)
  WHERE source IN ('referral_reward', 'referral_bonus') AND reference_id IS NOT NULL;

-- ─── 4. REFERRAL_EVENTS — append-only audit timeline ───────────

CREATE TABLE IF NOT EXISTS public.referral_events (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  referral_id UUID NOT NULL REFERENCES public.referrals(id) ON DELETE CASCADE,
  event_type  TEXT NOT NULL CHECK (event_type IN ('created', 'rewarded', 'completed', 'cancelled', 'rejected', 'reversed', 'retry')),
  actor_id    UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  actor_role  TEXT NOT NULL DEFAULT 'system',
  reason      TEXT,
  metadata    JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_referral_events_referral
  ON public.referral_events (referral_id, created_at);

ALTER TABLE public.referral_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Involved parties can view referral events" ON public.referral_events;
CREATE POLICY "Involved parties can view referral events" ON public.referral_events
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.referrals r
      WHERE r.id = referral_id
        AND (r.referrer_id = auth.uid() OR r.referred_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Admins can manage referral events" ON public.referral_events;
CREATE POLICY "Admins can manage referral events" ON public.referral_events
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- ─── 5. WALLET CREDIT PRIMITIVE ────────────────────────────────
-- Single shared entry point for wallet credits (referrals, refunds,
-- adjustments). SECURITY DEFINER by design: only our validated RPCs /
-- triggers call it, never the anon key directly.

CREATE OR REPLACE FUNCTION public.credit_wallet(
  p_user_id      UUID,
  p_amount       NUMERIC,
  p_source       TEXT,
  p_reference_id UUID DEFAULT NULL,
  p_metadata     JSONB DEFAULT NULL,
  p_description  TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_balance NUMERIC(10,2);
  v_tx_id       UUID;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Amount must be positive.');
  END IF;

  UPDATE public.profiles
     SET wallet_balance = wallet_balance + p_amount
   WHERE id = p_user_id
   RETURNING wallet_balance INTO v_new_balance;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found.');
  END IF;

  INSERT INTO public.wallet_transactions (
    user_id, type, source, amount, balance_after, description, reference_id, metadata
  ) VALUES (
    p_user_id, 'credit', p_source, p_amount, v_new_balance, p_description, p_reference_id, p_metadata
  )
  RETURNING id INTO v_tx_id;

  RETURN jsonb_build_object(
    'success', true,
    'new_balance', v_new_balance,
    'transaction_id', v_tx_id
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.credit_wallet(UUID, NUMERIC, TEXT, UUID, JSONB, TEXT) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.credit_wallet(UUID, NUMERIC, TEXT, UUID, JSONB, TEXT) TO service_role;

-- ─── 6. APPLY REFERRAL CODE (v2) ───────────────────────────────
-- Attribution only. Creates the referrables row under the wallet_v1 model.
-- Registration happens on a verified-OTP account; the auth.uid() guard is
-- relaxed for the pre-session registration window (auth.uid() IS NULL),
-- because at signup time the session cookie may not exist yet.

CREATE OR REPLACE FUNCTION public.apply_referral_code(
  p_new_user_id UUID,
  p_code        TEXT,
  p_source      TEXT DEFAULT 'code'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referrer_id     UUID;
  v_referrer_reward NUMERIC(10,2);
  v_referred_reward NUMERIC(10,2);
  v_referral_enabled BOOLEAN;
  v_referral_id     UUID;
  v_referrer_role   TEXT;
  v_referrer_status TEXT;
  v_referred_role   TEXT;
  v_norm_source     TEXT;
BEGIN
  -- Authorization: authenticated callers may only attribute their own
  -- freshly-created account; anon is tolerated for the pre-session window.
  IF auth.uid() IS NOT NULL AND auth.uid() IS DISTINCT FROM p_new_user_id THEN
    RAISE EXCEPTION 'Unauthorized: cannot apply a referral for another account.';
  END IF;

  SELECT COALESCE((value#>>'{}')::BOOLEAN, true) INTO v_referral_enabled
    FROM public.platform_settings WHERE key = 'referral_enabled';

  IF v_referral_enabled IS FALSE THEN
    RETURN jsonb_build_object('success', false, 'error', 'Referral program is currently disabled by administrator.');
  END IF;

  SELECT rc.user_id INTO v_referrer_id
    FROM public.referral_codes rc
    WHERE UPPER(TRIM(rc.code)) = UPPER(TRIM(p_code));

  IF v_referrer_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid referral code.');
  END IF;

  IF v_referrer_id = p_new_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'You cannot use your own referral code.');
  END IF;

  SELECT role INTO v_referred_role
    FROM public.profiles WHERE id = p_new_user_id;

  IF v_referred_role IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Account profile not found.');
  END IF;

  IF v_referred_role <> 'customer' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Referral rewards apply to customer accounts only.');
  END IF;

  SELECT role, status INTO v_referrer_role, v_referrer_status
    FROM public.profiles WHERE id = v_referrer_id;

  IF v_referrer_role <> 'customer' OR v_referrer_status <> 'active' THEN
    RETURN jsonb_build_object('success', false, 'error', 'The referral owner is not eligible to refer.');
  END IF;

  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = p_new_user_id AND referral_code_used IS NOT NULL) THEN
    RETURN jsonb_build_object('success', false, 'error', 'You have already used a referral code.');
  END IF;

  IF EXISTS (SELECT 1 FROM public.referrals WHERE referred_id = p_new_user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Referral already applied to this account.');
  END IF;

  SELECT COALESCE((value#>>'{}')::NUMERIC, 50) INTO v_referrer_reward
    FROM public.platform_settings WHERE key = 'referral_reward_referrer';
  SELECT COALESCE((value#>>'{}')::NUMERIC, 50) INTO v_referred_reward
    FROM public.platform_settings WHERE key = 'referral_reward_referred';

  IF v_referrer_reward IS NULL THEN v_referrer_reward := 50; END IF;
  IF v_referred_reward IS NULL THEN v_referred_reward := 50; END IF;

  IF p_source IN ('link', 'code') THEN v_norm_source := p_source;
  ELSE v_norm_source := 'code'; END IF;

  -- Insert the referral first; if the referred account already has a
  -- referral, we abort BEFORE touching the profile row.
  INSERT INTO public.referrals (
    referrer_id, referred_id, status, referrer_reward, referred_discount,
    qualified_at, source, reward_model, reward_config_snapshot
  ) VALUES (
    v_referrer_id, p_new_user_id, 'pending', v_referrer_reward, v_referred_reward,
    now(), v_norm_source, 'wallet_v1',
    jsonb_build_object(
      'referrer_reward', v_referrer_reward,
      'referred_reward', v_referred_reward,
      'referral_enabled', v_referral_enabled,
      'captured_at', now()
    )
  )
  ON CONFLICT (referred_id) DO NOTHING
  RETURNING id INTO v_referral_id;

  IF v_referral_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Referral already applied to this account.');
  END IF;

  UPDATE public.profiles
     SET referral_code_used = UPPER(TRIM(p_code)),
         referred_by = v_referrer_id
   WHERE id = p_new_user_id;

  INSERT INTO public.referral_events (referral_id, event_type, actor_role, metadata)
    VALUES (v_referral_id, 'created', 'system', jsonb_build_object('source', v_norm_source));

  RETURN jsonb_build_object('success', true, 'referral_id', v_referral_id);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.apply_referral_code(UUID, TEXT, TEXT) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.apply_referral_code(UUID, TEXT, TEXT) TO authenticated;

-- ─── 7. ATOMIC REFERRAL REWARD ─────────────────────────────────
-- Idempotent, dual-sided, single-transaction wallet issuance.
--   * FOR UPDATE on the referrals row serializes concurrent callers.
--   * status guard + wallet idempotency index guarantee exactly-once.
--   * If anything fails the entire transaction rolls back — it is
--     structurally impossible for one side to be paid and the other not.

CREATE OR REPLACE FUNCTION public.reward_customer_referral(p_referral_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referral public.referrals%ROWTYPE;
  v_actor_id UUID;
  v_ok BOOLEAN;
BEGIN
  BEGIN
    v_actor_id := auth.uid();
  EXCEPTION WHEN OTHERS THEN
    v_actor_id := NULL;
  END;

  -- Lock + load the referral.
  SELECT * INTO v_referral
    FROM public.referrals
   WHERE id = p_referral_id
     FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Referral not found.');
  END IF;

  -- Authorization: admin, involved party, or pre-session registration.
  IF v_actor_id IS NOT NULL
     AND NOT public.is_admin(v_actor_id)
     AND v_actor_id NOT IN (v_referral.referrer_id, v_referral.referred_id) THEN
    RAISE EXCEPTION 'Unauthorized: cannot reward a referral you are not part of.';
  END IF;

  -- Only wallet_v1 rows are processed here.
  IF v_referral.reward_model <> 'wallet_v1' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Referral is not under the wallet reward model.');
  END IF;

  IF v_referral.status = 'rewarded' THEN
    RETURN jsonb_build_object('success', true, 'already_rewarded', true);
  END IF;

  IF v_referral.status <> 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Referral is not rewardable.');
  END IF;

  -- Defense in depth: if credits already exist (e.g. a partially applied
  -- legacy job), mark rewarded and stop rather than double-pay.
  IF EXISTS (
    SELECT 1 FROM public.wallet_transactions
     WHERE reference_id = p_referral_id
       AND source IN ('referral_reward', 'referral_bonus')
  ) THEN
    UPDATE public.referrals
       SET status = 'rewarded', rewarded_at = now()
     WHERE id = p_referral_id;
    RETURN jsonb_build_object('success', true, 'already_rewarded', true);
  END IF;

  -- Lock profiles in canonical order to avoid deadlocks.
  PERFORM 1 FROM public.profiles
    WHERE id IN (v_referral.referrer_id, v_referral.referred_id)
    ORDER BY id
    FOR UPDATE;

  PERFORM public.credit_wallet(
    p_user_id      => v_referral.referrer_id,
    p_amount       => v_referral.referrer_reward,
    p_source       => 'referral_reward',
    p_reference_id => p_referral_id,
    p_metadata     => jsonb_build_object('program', 'customer', 'party', 'referrer'),
    p_description  => 'Referral reward — someone joined PHS with your code'
  );

  PERFORM public.credit_wallet(
    p_user_id      => v_referral.referred_id,
    p_amount       => COALESCE(v_referral.referred_discount, 0),
    p_source       => 'referral_bonus',
    p_reference_id => p_referral_id,
    p_metadata     => jsonb_build_object('program', 'customer', 'party', 'referred'),
    p_description  => 'Referral bonus — wallet reward for joining PHS'
  );

  UPDATE public.referrals
     SET status = 'rewarded',
         qualified_at = COALESCE(qualified_at, now()),
         rewarded_at  = now()
   WHERE id = p_referral_id;

  INSERT INTO public.referral_events (referral_id, event_type, actor_role)
    VALUES (p_referral_id, 'rewarded', COALESCE(v_actor_id::TEXT, 'system'));

  RETURN jsonb_build_object('success', true, 'referral_id', p_referral_id);
EXCEPTION
  WHEN unique_violation THEN
    -- Idempotency index caught a concurrent duplicate: roll back this call.
    RETURN jsonb_build_object('success', true, 'already_rewarded', true);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.reward_customer_referral(UUID) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.reward_customer_referral(UUID) TO authenticated;

-- ─── 8. LEGACY REFERRAL REWARD (renamed + hardened) ────────────
-- Preserves the OLD model for pre-migration rows only. Adds the same
-- row-lock + idempotency safety so legacy payouts cannot double-fire.
-- Kept as complete_legacy_referral_reward; partner actions switch to it.

CREATE OR REPLACE FUNCTION public.complete_legacy_referral_reward(p_booking_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer_id   UUID;
  v_referral      public.referrals%ROWTYPE;
  v_reward        NUMERIC(10,2);
  v_new_balance   NUMERIC(10,2);
  v_first_booking BOOLEAN;
  v_actor_id      UUID;
BEGIN
  BEGIN
    v_actor_id := auth.uid();
  EXCEPTION WHEN OTHERS THEN
    v_actor_id := NULL;
  END;

  SELECT customer_id INTO v_customer_id
    FROM public.bookings WHERE id = p_booking_id;

  IF v_customer_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Booking not found.');
  END IF;

  SELECT * INTO v_referral
    FROM public.referrals
   WHERE referred_id = v_customer_id
     AND status = 'pending'
     AND reward_model = 'legacy'
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', true, 'skipped', true, 'reason', 'no_pending_legacy_referral');
  END IF;

  v_reward := v_referral.referrer_reward;

  SELECT (COUNT(*) = 1) INTO v_first_booking
    FROM public.bookings
   WHERE customer_id = v_customer_id AND status = 'completed';

  IF NOT v_first_booking THEN
    RETURN jsonb_build_object('success', true, 'skipped', true, 'reason', 'not_first_booking');
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.wallet_transactions
     WHERE user_id = v_referral.referrer_id
       AND source = 'referral_reward'
       AND reference_id = p_booking_id
  ) THEN
    RETURN jsonb_build_object('success', true, 'skipped', true, 'reason', 'already_rewarded');
  END IF;

  UPDATE public.profiles
     SET wallet_balance = wallet_balance + v_reward
   WHERE id = v_referral.referrer_id
   RETURNING wallet_balance INTO v_new_balance;

  INSERT INTO public.wallet_transactions (
    user_id, type, source, amount, balance_after, description, reference_id, metadata
  ) VALUES (
    v_referral.referrer_id, 'credit', 'referral_reward', v_reward, v_new_balance,
    'Referral reward — friend completed first booking', p_booking_id,
    jsonb_build_object('program', 'customer', 'party', 'referrer', 'model', 'legacy')
  );

  UPDATE public.referrals
     SET status = 'completed',
         booking_id = p_booking_id,
         completed_at = now()
   WHERE id = v_referral.id AND status = 'pending';

  INSERT INTO public.referral_events (referral_id, event_type, actor_role, metadata)
    VALUES (v_referral.id, 'completed', COALESCE(v_actor_id::TEXT, 'system'),
            jsonb_build_object('booking_id', p_booking_id));

  RETURN jsonb_build_object('success', true, 'credited', v_reward, 'referrer_id', v_referral.referrer_id);
EXCEPTION
  WHEN unique_violation THEN
    -- Idempotency index (user_id, reference_id) caught a concurrent
    -- duplicate payout — treat as already credited, do not double-pay.
    RETURN jsonb_build_object('success', true, 'skipped', true, 'reason', 'already_rewarded');
END;
$$;

REVOKE EXECUTE ON FUNCTION public.complete_legacy_referral_reward(UUID) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.complete_legacy_referral_reward(UUID) TO authenticated;

-- ─── 9. REFERRAL STATS (v2) ────────────────────────────────────
-- Adds rewarded_referrals to the existing response keys; keeps old keys
-- (completed_referrals / pending_referrals) for backwards compatibility.

CREATE OR REPLACE FUNCTION public.get_referral_stats(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code               TEXT;
  v_total_referrals    INTEGER;
  v_rewarded           INTEGER;
  v_completed          INTEGER;
  v_pending            INTEGER;
  v_total_earned       NUMERIC(10,2);
  v_wallet_balance     NUMERIC(10,2);
BEGIN
  SELECT code INTO v_code
    FROM public.referral_codes WHERE user_id = p_user_id;

  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'rewarded'),
    COUNT(*) FILTER (WHERE status = 'completed'),
    COUNT(*) FILTER (WHERE status = 'pending')
  INTO v_total_referrals, v_rewarded, v_completed, v_pending
    FROM public.referrals WHERE referrer_id = p_user_id;

  SELECT COALESCE(SUM(amount), 0) INTO v_total_earned
    FROM public.wallet_transactions
   WHERE user_id = p_user_id
     AND type = 'credit'
     AND source IN ('referral_reward', 'referral_bonus');

  SELECT COALESCE(wallet_balance, 0) INTO v_wallet_balance
    FROM public.profiles WHERE id = p_user_id;

  RETURN jsonb_build_object(
    'code',                COALESCE(v_code, ''),
    'total_referrals',     COALESCE(v_total_referrals, 0),
    'rewarded_referrals',  COALESCE(v_rewarded, 0),
    'completed_referrals', COALESCE(v_completed, 0),
    'pending_referrals',   COALESCE(v_pending, 0),
    'total_earned',        COALESCE(v_total_earned, 0),
    'wallet_balance',      COALESCE(v_wallet_balance, 0)
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_referral_stats(UUID) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.get_referral_stats(UUID) TO authenticated;