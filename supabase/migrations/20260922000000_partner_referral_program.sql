-- ═══════════════════════════════════════════════════════════════════
-- Partner Referral Program — wallet_v1 (production migration)
--
-- A fully independent, auditable partner referral system. Nothing here
-- reuses or mutates the customer referral program's business tables
-- (referral_codes / referrals / referral_events) nor its RPCs.
--
--   * separate tables: partner_referral_codes / partner_referrals / partner_referral_events
--   * separate config keys (platform_settings.partner_referral_*)
--   * separate wallet sources (partner_referral_reward / partner_referral_bonus)
--   * separate idempotency index (uq_wallet_tx_partner_referral)
--
-- Shared generic infra deliberately REUSED (never re-implemented):
--   * credit_wallet()  — the ONLY wallet credit primitive
--   * is_admin()       — admin bypass helper used across all policies/RPCs
--   * tr_protect_profiles_protected_columns (SECURITY INVOKER) — our SECURITY
--     DEFINER RPCs bypass it correctly for balance writes.
--
-- Business rule (config-driven): reward trigger defaults to
-- 'first_booking' (the referred customer's 1st completed booking).
-- Also valid: 'registration' (kept in lock-step with attribution) and
-- 'admin' (manual payout only).
--
-- Apply order requirement: this file MUST be applied AFTER
--   20260918000000_customer_referral_wallet_v2.sql and
--   20260920000000_wallet_cash_bonus_ledger.sql
-- (credit_wallet, is_admin(), and the protected-columns trigger must exist).
-- ═══════════════════════════════════════════════════════════════════

-- ─── 1. CONFIG KEYS ─────────────────────────────────────────────
INSERT INTO public.platform_settings (key, value) VALUES
  ('partner_referral_enabled',           'true'::jsonb),
  ('partner_referral_reward_partner',    '100'::jsonb),
  ('partner_referral_reward_customer',   '50'::jsonb),
  ('partner_referral_reward_trigger',    '"first_booking"'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- ─── 2. TABLES ──────────────────────────────────────────────────

-- One active referral code per partner. Note: type column is intentionally
-- omitted — role lives on profiles (single source of truth).
CREATE TABLE IF NOT EXISTS public.partner_referral_codes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  code       TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Attribution + reward ledger. Unique on referred_id guarantees a customer
-- can be referred by a professional at most once (dual-program exclusion).
CREATE TABLE IF NOT EXISTS public.partner_referrals (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id            UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referred_id           UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  status                TEXT NOT NULL DEFAULT 'attributed',
  source                TEXT NOT NULL DEFAULT 'code',
  referral_code         TEXT NOT NULL,
  partner_reward        NUMERIC(10,2) NOT NULL DEFAULT 100,
  customer_reward       NUMERIC(10,2) NOT NULL DEFAULT 50,
  reward_model          TEXT NOT NULL DEFAULT 'wallet_v1',
  reward_config_snapshot JSONB,
  completed_booking_id  UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  reversal              JSONB,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  qualified_at          TIMESTAMPTZ,
  rewarded_at           TIMESTAMPTZ,
  CONSTRAINT partner_referrals_status_check CHECK (
    status IN ('attributed', 'eligible', 'rewarded',
               'invalid', 'duplicate', 'fraud_review', 'rejected', 'reversed')
  ),
  CONSTRAINT partner_referrals_source_check CHECK (source IN ('code', 'link')),
  CONSTRAINT partner_referrals_reward_model_check CHECK (reward_model IN ('legacy', 'wallet_v1'))
);

CREATE TABLE IF NOT EXISTS public.partner_referral_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_id UUID NOT NULL REFERENCES public.partner_referrals(id) ON DELETE CASCADE,
  event_type  TEXT NOT NULL,
  actor_id    UUID,
  actor_role  TEXT NOT NULL DEFAULT 'system',
  reason      TEXT,
  metadata    JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_partner_referrals_partner_id   ON public.partner_referrals (partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_referrals_referred_id  ON public.partner_referrals (referred_id);
CREATE INDEX IF NOT EXISTS idx_partner_referral_events_ref_id ON public.partner_referral_events (referral_id, created_at);

-- ─── 3. RLS ─────────────────────────────────────────────────────
ALTER TABLE public.partner_referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_referrals       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_referral_events ENABLE ROW LEVEL SECURITY;

-- Codes: professionals can read their own; admins can do everything.
DROP POLICY IF EXISTS "professionals_read_own_code" ON public.partner_referral_codes;
CREATE POLICY "professionals_read_own_code" ON public.partner_referral_codes
  FOR SELECT TO authenticated USING (partner_id = auth.uid());

DROP POLICY IF EXISTS "admins_manage_codes" ON public.partner_referral_codes;
CREATE POLICY "admins_manage_codes" ON public.partner_referral_codes
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Referrals: professionals see theirs, customers see theirs, admins all.
DROP POLICY IF EXISTS "professionals_read_own_referrals" ON public.partner_referrals;
CREATE POLICY "professionals_read_own_referrals" ON public.partner_referrals
  FOR SELECT TO authenticated USING (partner_id = auth.uid());

DROP POLICY IF EXISTS "customers_read_own_partner_referrals" ON public.partner_referrals;
CREATE POLICY "customers_read_own_partner_referrals" ON public.partner_referrals
  FOR SELECT TO authenticated USING (referred_id = auth.uid());

DROP POLICY IF EXISTS "admins_manage_partner_referrals" ON public.partner_referrals;
CREATE POLICY "admins_manage_partner_referrals" ON public.partner_referrals
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Events: involved parties can read; admins all. Inserts via RPC only.
DROP POLICY IF EXISTS "parties_read_partner_referral_events" ON public.partner_referral_events;
CREATE POLICY "parties_read_partner_referral_events" ON public.partner_referral_events
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.partner_referrals pr
      WHERE pr.id = referral_id
        AND (pr.partner_id = auth.uid() OR pr.referred_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "admins_manage_partner_referral_events" ON public.partner_referral_events;
CREATE POLICY "admins_manage_partner_referral_events" ON public.partner_referral_events
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- ─── 4. WALLET LEDGER — partner referral sources ───────────────
ALTER TABLE public.wallet_transactions
  DROP CONSTRAINT IF EXISTS wallet_transactions_source_check;
ALTER TABLE public.wallet_transactions
  ADD CONSTRAINT wallet_transactions_source_check
    CHECK (source IN (
      'referral_reward', 'referral_bonus', 'booking_discount',
      'admin_adjustment', 'refund', 'recharge', 'promo_credit', 'reversal',
      'offer_purchase',
      'partner_referral_reward', 'partner_referral_bonus'
    ));

-- Exactly ONE credit per (user, partner-referral). Same partial-index
-- technique used for uq_wallet_tx_referral in the customer program.
CREATE UNIQUE INDEX IF NOT EXISTS uq_wallet_tx_partner_referral
  ON public.wallet_transactions (user_id, reference_id)
  WHERE source IN ('partner_referral_reward', 'partner_referral_bonus')
    AND reference_id IS NOT NULL;

-- ─── 5. DEBIT WALLET — reversal primitive ───────────────────────
-- Mirrors credit_wallet() in structure; consum ES bonus-first then cash and
-- is clamped so no balance can ever go negative.
CREATE OR REPLACE FUNCTION public.debit_wallet(
  p_user_id      UUID,
  p_amount       NUMERIC,
  p_source       TEXT,
  p_reference_id UUID DEFAULT NULL,
  p_metadata     JSONB DEFAULT NULL,
  p_description  TEXT DEFAULT NULL,
  p_balance_type TEXT DEFAULT 'cash'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cash        NUMERIC(10,2);
  v_bonus       NUMERIC(10,2);
  v_spend_cash  NUMERIC(10,2) := 0;
  v_spend_bonus NUMERIC(10,2) := 0;
  v_new_total   NUMERIC(10,2);
  v_tx_id       UUID;
  v_balance_type TEXT;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Amount must be positive.');
  END IF;

  IF p_balance_type IN ('cash', 'bonus') THEN v_balance_type := p_balance_type;
  ELSE v_balance_type := 'cash'; END IF;

  SELECT wallet_cash_balance, wallet_bonus_balance
    INTO v_cash, v_bonus
    FROM public.profiles
   WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found.');
  END IF;

  v_spend_bonus := LEAST(v_bonus, p_amount);
  v_spend_cash  := LEAST(v_cash,  p_amount - v_spend_bonus);

  UPDATE public.profiles
     SET wallet_balance       = wallet_balance - (v_spend_bonus + v_spend_cash),
         wallet_bonus_balance = wallet_bonus_balance - v_spend_bonus,
         wallet_cash_balance  = wallet_cash_balance  - v_spend_cash
   WHERE id = p_user_id
   RETURNING wallet_balance INTO v_new_total;

  INSERT INTO public.wallet_transactions (
    user_id, type, source, amount, balance_after, description, reference_id, metadata, balance_type
  ) VALUES (
    p_user_id, 'debit', p_source, (v_spend_bonus + v_spend_cash), v_new_total,
    p_description, p_reference_id, p_metadata, v_balance_type
  )
  RETURNING id INTO v_tx_id;

  RETURN jsonb_build_object(
    'success', true,
    'new_balance', v_new_total,
    'transaction_id', v_tx_id,
    'debited', (v_spend_bonus + v_spend_cash),
    'cash_used', v_spend_cash,
    'bonus_used', v_spend_bonus
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.debit_wallet(UUID, NUMERIC, TEXT, UUID, JSONB, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.debit_wallet(UUID, NUMERIC, TEXT, UUID, JSONB, TEXT, TEXT) TO service_role;

-- ─── 6. CORE REWARD ENGINE (no auth guard — definer-only) ──────
-- Intentionally unprivileged: EXECUTE is revoked from every user role. Only
-- SECURITY DEFINER sibling functions (running as the owner) may call it.
CREATE OR REPLACE FUNCTION public._reward_partner_referral(p_referral_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ref             public.partner_referrals%ROWTYPE;
  v_actor_id        UUID;
  v_trigger         TEXT;
  v_enabled         BOOLEAN;
  v_first_booking   UUID;
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
    RETURN jsonb_build_object('success', false, 'error', 'Partner referral not found.');
  END IF;

  IF v_ref.status = 'rewarded' THEN
    RETURN jsonb_build_object('success', true, 'already_rewarded', true);
  END IF;

  IF v_ref.status NOT IN ('attributed', 'eligible') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Partner referral is not rewardable (status: ' || v_ref.status || ').');
  END IF;

  SELECT COALESCE((value #>> '{}')::BOOLEAN, true) INTO v_enabled
    FROM public.platform_settings
   WHERE key = 'partner_referral_enabled';

  IF v_enabled IS FALSE THEN
    RETURN jsonb_build_object('success', false, 'error', 'Partner referral program is currently disabled by administrator.');
  END IF;

  v_trigger := v_ref.reward_config_snapshot ->> 'trigger';
  IF v_trigger IS NULL OR v_trigger NOT IN ('registration', 'first_booking', 'admin') THEN
    v_trigger := 'first_booking';
  END IF;

  -- 'admin' trigger is the only one that demands an administrator at reward time.
  IF v_trigger = 'admin' AND v_actor_id IS NOT NULL AND NOT public.is_admin(v_actor_id) THEN
    RAISE EXCEPTION 'Unauthorized: this partner referral requires an administrator to reward.';
  END IF;

  IF v_trigger = 'first_booking' THEN
    SELECT id INTO v_first_booking
      FROM public.bookings
     WHERE customer_id = v_ref.referred_id
       AND status = 'completed'
     ORDER BY completed_at ASC
     LIMIT 1;

    IF v_first_booking IS NULL THEN
      RETURN jsonb_build_object('success', true, 'pending', true, 'reason', 'not_first_booking');
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

  -- Defense in depth: if credits already exist, mark rewarded — never double-pay.
  IF EXISTS (
    SELECT 1 FROM public.wallet_transactions
     WHERE reference_id = p_referral_id
       AND source IN ('partner_referral_reward', 'partner_referral_bonus')
  ) THEN
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

  PERFORM public.credit_wallet(
    p_user_id      => v_ref.partner_id,
    p_amount       => v_ref.partner_reward,
    p_source       => 'partner_referral_reward',
    p_reference_id => p_referral_id,
    p_metadata     => jsonb_build_object('program', 'partner', 'party', 'partner'),
    p_description  => 'Partner referral reward — a customer joined PHS with your code',
    p_balance_type => 'bonus'
  );

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

REVOKE EXECUTE ON FUNCTION public._reward_partner_referral(UUID) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public._reward_partner_referral(UUID) TO service_role;

-- ─── 7. RPC: ensure_partner_referral_code ───────────────────────
-- Idempotent code generation. Grants/else-drops a profile check.
CREATE OR REPLACE FUNCTION public.ensure_partner_referral_code(p_partner_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id  UUID;
  v_role      TEXT;
  v_status    TEXT;
  v_chars     TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_code      TEXT;
  v_tail      TEXT;
  v_attempt   INT;
  i           INT;
BEGIN
  BEGIN
    v_actor_id := auth.uid();
  EXCEPTION WHEN OTHERS THEN
    v_actor_id := NULL;
  END;

  IF v_actor_id IS NOT NULL
     AND v_actor_id IS DISTINCT FROM p_partner_id
     AND NOT public.is_admin(v_actor_id) THEN
    RAISE EXCEPTION 'Unauthorized: cannot manage another professional''s referral code.';
  END IF;

  SELECT code INTO v_code
    FROM public.partner_referral_codes
   WHERE partner_id = p_partner_id;

  IF v_code IS NOT NULL THEN
    RETURN jsonb_build_object('success', true, 'code', v_code, 'created', false);
  END IF;

  SELECT role, status INTO v_role, v_status
    FROM public.profiles
   WHERE id = p_partner_id;

  IF v_role IS DISTINCT FROM 'partner' OR v_status IS DISTINCT FROM 'active' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only active professionals can generate a referral code.');
  END IF;

  FOR v_attempt IN 1..20 LOOP
    v_tail := '';
    FOR i IN 1..5 LOOP
      v_tail := v_tail || substr(v_chars, 1 + floor(random() * length(v_chars))::INT, 1);
    END LOOP;
    v_code := 'PS' || v_tail;

    BEGIN
      INSERT INTO public.partner_referral_codes (partner_id, code)
      VALUES (p_partner_id, v_code);
      RETURN jsonb_build_object('success', true, 'code', v_code, 'created', true);
    EXCEPTION
      WHEN unique_violation THEN
        NULL; -- code or partner collision → retry with a fresh draw
    END;
  END LOOP;

  RETURN jsonb_build_object('success', false, 'error', 'Could not generate a unique referral code. Please retry.');
END;
$$;

REVOKE EXECUTE ON FUNCTION public.ensure_partner_referral_code(UUID) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.ensure_partner_referral_code(UUID) TO authenticated;
GRANT  EXECUTE ON FUNCTION public.ensure_partner_referral_code(UUID) TO service_role;

-- ─── 8. RPC: apply_partner_referral_code ────────────────────────
-- Attribution at registration time. Idempotent; reward is decoupled unless
-- the configured trigger is 'registration'.
CREATE OR REPLACE FUNCTION public.apply_partner_referral_code(
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
  v_actor_id          UUID;
  v_partner_id        UUID;
  v_referral_enabled  BOOLEAN;
  v_role              TEXT;
  v_status            TEXT;
  v_partner_reward    NUMERIC(10,2);
  v_customer_reward   NUMERIC(10,2);
  v_trigger           TEXT;
  v_norm_code         TEXT;
  v_norm_source       TEXT;
  v_referral_id       UUID;
  v_res               JSONB;
BEGIN
  BEGIN
    v_actor_id := auth.uid();
  EXCEPTION WHEN OTHERS THEN
    v_actor_id := NULL;
  END;

  -- Pre-session signup (auth cookie may not exist yet) is tolerated: the
  -- capability here is the referral code itself combined with the new user's
  -- own session, exactly like the customer program.
  IF v_actor_id IS NOT NULL
     AND v_actor_id IS DISTINCT FROM p_new_user_id
     AND NOT public.is_admin(v_actor_id) THEN
    RAISE EXCEPTION 'Unauthorized: cannot apply a referral for another account.';
  END IF;

  SELECT COALESCE((value #>> '{}')::BOOLEAN, true) INTO v_referral_enabled
    FROM public.platform_settings
   WHERE key = 'partner_referral_enabled';

  IF v_referral_enabled IS FALSE THEN
    RETURN jsonb_build_object('success', false, 'error', 'Partner referral program is currently disabled by administrator.');
  END IF;

  v_norm_code := UPPER(REGEXP_REPLACE(TRIM(p_code), '[\s-]', '', 'g'));

  -- Accept the marketing form "PHS-PAR-7K82X" (and the widely-shared, slightly
  -- redundant "PHS-PAR-PS7K82X") as well as the compact "PS7K82X". Note the
  -- admin UI historically rendered "PHS-PAR-{code}" where code already begins
  -- with "PS", so both forms must resolve to the compact code.
  IF v_norm_code LIKE 'PHSPARPS%' THEN
    -- e.g. PHSPARPS7K82X -> PS7K82X (the trailing PS is the real prefix)
    v_norm_code := SUBSTRING(v_norm_code FROM 7);
  ELSIF v_norm_code LIKE 'PHSPAR%' THEN
    v_norm_code := 'PS' || SUBSTRING(v_norm_code FROM 7);
  END IF;

  SELECT partner_id INTO v_partner_id
    FROM public.partner_referral_codes
   WHERE code = v_norm_code;

  IF v_partner_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Partner referral code not found. Please check and try again.');
  END IF;

  IF v_partner_id = p_new_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'You cannot use your own partner referral code.');
  END IF;

  SELECT role INTO v_role FROM public.profiles WHERE id = p_new_user_id;

  IF v_role IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Account profile not found.');
  END IF;

  IF v_role <> 'customer' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only customer accounts can be referred by a professional.');
  END IF;

  SELECT role, status INTO v_role, v_status FROM public.profiles WHERE id = v_partner_id;

  IF v_role <> 'partner' OR v_status <> 'active' THEN
    RETURN jsonb_build_object('success', false, 'error', 'The referring professional is not currently eligible to refer.');
  END IF;

  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = p_new_user_id AND referral_code_used IS NOT NULL) THEN
    RETURN jsonb_build_object('success', false, 'error', 'A referral code has already been applied to this account.');
  END IF;

  IF EXISTS (SELECT 1 FROM public.partner_referrals WHERE referred_id = p_new_user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'A partner referral has already been applied to this account.');
  END IF;

  SELECT COALESCE((value #>> '{}')::NUMERIC, 100) INTO v_partner_reward
    FROM public.platform_settings WHERE key = 'partner_referral_reward_partner';
  SELECT COALESCE((value #>> '{}')::NUMERIC, 50) INTO v_customer_reward
    FROM public.platform_settings WHERE key = 'partner_referral_reward_customer';
  SELECT COALESCE((value #>> '{}')::TEXT, 'first_booking') INTO v_trigger
    FROM public.platform_settings WHERE key = 'partner_referral_reward_trigger';

  v_partner_reward  := COALESCE(v_partner_reward, 100);
  v_customer_reward := COALESCE(v_customer_reward, 50);
  IF v_trigger NOT IN ('registration', 'first_booking', 'admin') THEN v_trigger := 'first_booking'; END IF;
  v_norm_source := CASE WHEN p_source = 'link' THEN 'link' ELSE 'code' END;

  -- Snapshot the terms at capture time so later config changes never change
  -- the economics of an already-attributed referral.
  INSERT INTO public.partner_referrals (
    partner_id, referred_id, status, source, referral_code,
    partner_reward, customer_reward, reward_model, reward_config_snapshot
  ) VALUES (
    v_partner_id, p_new_user_id, 'attributed', v_norm_source, v_norm_code,
    v_partner_reward, v_customer_reward, 'wallet_v1',
    jsonb_build_object(
      'partner_reward',  v_partner_reward,
      'customer_reward', v_customer_reward,
      'trigger',         v_trigger,
      'enabled',         v_referral_enabled,
      'captured_at',     now()
    )
  )
  ON CONFLICT (referred_id) DO NOTHING
  RETURNING id INTO v_referral_id;

  IF v_referral_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'A partner referral has already been applied to this account.');
  END IF;

  UPDATE public.profiles
     SET referral_code_used = v_norm_code,
         referred_by        = v_partner_id
   WHERE id = p_new_user_id;

  INSERT INTO public.partner_referral_events (referral_id, event_type, actor_role, metadata)
    VALUES (v_referral_id, 'created', COALESCE(v_actor_id::TEXT, 'system'),
            jsonb_build_object('source', v_norm_source, 'code', v_norm_code));

  IF v_trigger = 'registration' THEN
    v_res := public._reward_partner_referral(v_referral_id);
  ELSE
    v_res := jsonb_build_object('pending', true);
  END IF;

  RETURN jsonb_build_object('success', true, 'referral_id', v_referral_id, 'trigger', v_trigger) || v_res;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.apply_partner_referral_code(UUID, TEXT, TEXT) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.apply_partner_referral_code(UUID, TEXT, TEXT) TO authenticated;
GRANT  EXECUTE ON FUNCTION public.apply_partner_referral_code(UUID, TEXT, TEXT) TO service_role;

-- ─── 9. RPC: reward_partner_referral ────────────────────────────
-- Authenticated wrapper for the core engine. Any involved party or an admin
-- may call it; the engine itself enforces the configured trigger.
CREATE OR REPLACE FUNCTION public.reward_partner_referral(p_referral_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id     UUID;
  v_partner_id   UUID;
  v_referred_id  UUID;
BEGIN
  BEGIN
    v_actor_id := auth.uid();
  EXCEPTION WHEN OTHERS THEN
    v_actor_id := NULL;
  END;

  SELECT partner_id, referred_id INTO v_partner_id, v_referred_id
    FROM public.partner_referrals
   WHERE id = p_referral_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Partner referral not found.');
  END IF;

  IF v_actor_id IS NOT NULL
     AND NOT public.is_admin(v_actor_id)
     AND v_actor_id NOT IN (v_partner_id, v_referred_id) THEN
    RAISE EXCEPTION 'Unauthorized: cannot reward a referral you are not part of.';
  END IF;

  RETURN public._reward_partner_referral(p_referral_id);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.reward_partner_referral(UUID) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.reward_partner_referral(UUID) TO authenticated;
GRANT  EXECUTE ON FUNCTION public.reward_partner_referral(UUID) TO service_role;

-- ─── 10. RPC: reward_partner_referral_for_customer ──────────────
-- Called after a booking completes. Callers may be: the referred customer,
-- a professional who actually completed a job for them, the admin, or
-- service context. Returns 'pending' until the customer's first completed
-- booking actually arrives.
CREATE OR REPLACE FUNCTION public.reward_partner_referral_for_customer(p_customer_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id       UUID;
  v_enabled        BOOLEAN;
  v_referral_id    UUID;
BEGIN
  BEGIN
    v_actor_id := auth.uid();
  EXCEPTION WHEN OTHERS THEN
    v_actor_id := NULL;
  END;

  IF v_actor_id IS NOT NULL AND NOT public.is_admin(v_actor_id) THEN
    IF v_actor_id = p_customer_id THEN
      NULL; -- self-check ok
    ELSIF EXISTS (
      SELECT 1 FROM public.bookings b
       WHERE b.customer_id = p_customer_id
         AND b.partner_id = v_actor_id
         AND b.status = 'completed'
    ) THEN
      NULL; -- the completing professional ok
    ELSE
      RAISE EXCEPTION 'Unauthorized: no completed work relationship with this customer.';
    END IF;
  END IF;

  SELECT COALESCE((value #>> '{}')::BOOLEAN, true) INTO v_enabled
    FROM public.platform_settings
   WHERE key = 'partner_referral_enabled';

  IF v_enabled IS FALSE THEN
    RETURN jsonb_build_object('success', true, 'skipped', true, 'reason', 'disabled');
  END IF;

  SELECT id INTO v_referral_id
    FROM public.partner_referrals
   WHERE referred_id = p_customer_id
     AND status IN ('attributed', 'eligible')
   ORDER BY created_at ASC
   LIMIT 1;

  IF v_referral_id IS NULL THEN
    RETURN jsonb_build_object('success', true, 'skipped', true, 'reason', 'no_eligible_partner_referral');
  END IF;

  RETURN public._reward_partner_referral(v_referral_id);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.reward_partner_referral_for_customer(UUID) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.reward_partner_referral_for_customer(UUID) TO authenticated;
GRANT  EXECUTE ON FUNCTION public.reward_partner_referral_for_customer(UUID) TO service_role;

-- ─── 11. RPC: mark_partner_referral_status ──────────────────────
-- Admin-only manual state changes for non-rewarded referrals
-- (rejected / fraud_review / invalid). Fires a matching audit event.
CREATE OR REPLACE FUNCTION public.mark_partner_referral_status(
  p_referral_id UUID,
  p_status      TEXT,
  p_reason      TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id   UUID;
  v_old_status TEXT;
BEGIN
  BEGIN
    v_actor_id := auth.uid();
  EXCEPTION WHEN OTHERS THEN
    v_actor_id := NULL;
  END;

  IF v_actor_id IS NOT NULL AND NOT public.is_admin(v_actor_id) THEN
    RAISE EXCEPTION 'Unauthorized: admin action only.';
  END IF;

  IF p_status NOT IN ('invalid', 'duplicate', 'fraud_review', 'rejected', 'reversed') THEN
    RAISE EXCEPTION 'Invalid target status for manual update: %', p_status;
  END IF;

  SELECT status INTO v_old_status
    FROM public.partner_referrals
   WHERE id = p_referral_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Partner referral not found.');
  END IF;

  IF v_old_status = 'rewarded' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Rewarded referrals cannot be re-marked; use reversal.');
  END IF;

  IF v_old_status = p_status THEN
    RETURN jsonb_build_object('success', true, 'unchanged', true);
  END IF;

  UPDATE public.partner_referrals
     SET status = p_status
   WHERE id = p_referral_id;

  INSERT INTO public.partner_referral_events (referral_id, event_type, actor_id, actor_role, reason, metadata)
    VALUES (p_referral_id, p_status, v_actor_id, 'admin', p_reason,
            jsonb_build_object('from_status', v_old_status, 'to_status', p_status));

  RETURN jsonb_build_object('success', true, 'from_status', v_old_status, 'to_status', p_status);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.mark_partner_referral_status(UUID, TEXT, TEXT) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.mark_partner_referral_status(UUID, TEXT, TEXT) TO authenticated;
GRANT  EXECUTE ON FUNCTION public.mark_partner_referral_status(UUID, TEXT, TEXT) TO service_role;

-- ─── 12. RPC: reverse_partner_referral ──────────────────────────
-- Admin-only reversal of a rewarded referral. Deregisters the wallet credits
-- via debit_wallet (bonus-first, never negative) and records the reason.
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
  v_actor_id   UUID;
  v_ref        public.partner_referrals%ROWTYPE;
  v_partner_db JSONB;
  v_customer_db JSONB;
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
           'recovery',     'n/a',
           'partner_debit',  v_partner_db,
           'customer_debit', v_customer_db
         )
   WHERE id = p_referral_id;

  INSERT INTO public.partner_referral_events (referral_id, event_type, actor_id, actor_role, reason)
    VALUES (p_referral_id, 'reversed', v_actor_id, 'admin', p_reason);

  RETURN jsonb_build_object('success', true, 'referral_id', p_referral_id);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.reverse_partner_referral(UUID, TEXT) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.reverse_partner_referral(UUID, TEXT) TO authenticated;
GRANT  EXECUTE ON FUNCTION public.reverse_partner_referral(UUID, TEXT) TO service_role;

-- ─── 13. RPC: get_partner_referral_stats ────────────────────────
CREATE OR REPLACE FUNCTION public.get_partner_referral_stats(p_partner_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id   UUID;
  v_code       TEXT;
  v_total      BIGINT;
  v_pending    BIGINT;
  v_rewarded   BIGINT;
  v_reversed   BIGINT;
  v_total_earned NUMERIC(10,2);
  v_awaiting   NUMERIC(10,2);
BEGIN
  BEGIN
    v_actor_id := auth.uid();
  EXCEPTION WHEN OTHERS THEN
    v_actor_id := NULL;
  END;

  IF v_actor_id IS NOT NULL
     AND v_actor_id IS DISTINCT FROM p_partner_id
     AND NOT public.is_admin(v_actor_id) THEN
    RAISE EXCEPTION 'Unauthorized: cannot view another professional''s referral stats.';
  END IF;

  SELECT code INTO v_code
    FROM public.partner_referral_codes
   WHERE partner_id = p_partner_id;

  SELECT COUNT(*),
         COUNT(*) FILTER (WHERE status IN ('attributed', 'eligible')),
         COUNT(*) FILTER (WHERE status = 'rewarded'),
         COUNT(*) FILTER (WHERE status = 'reversed')
    INTO v_total, v_pending, v_rewarded, v_reversed
    FROM public.partner_referrals
   WHERE partner_id = p_partner_id;

  -- Net earnings: reward credits MINUS reversal debits that reference this
  -- partner's own referrals (reversals are recorded with source='reversal',
  -- so a plain SUM(source='partner_referral_reward') would overstate earnings
  -- for any referral an admin later reversed).
  SELECT COALESCE(SUM(CASE WHEN source = 'partner_referral_reward' THEN amount ELSE 0 END), 0)
         - COALESCE((
             SELECT SUM(wt.amount)
               FROM public.wallet_transactions wt
              WHERE wt.user_id = p_partner_id
                AND wt.source = 'reversal'
                AND wt.reference_id IN (
                  SELECT id FROM public.partner_referrals WHERE partner_id = p_partner_id
                )
           ), 0)
    INTO v_total_earned
    FROM public.wallet_transactions
   WHERE user_id = p_partner_id
     AND source = 'partner_referral_reward';

  SELECT COALESCE(SUM(partner_reward), 0) INTO v_awaiting
    FROM public.partner_referrals
   WHERE partner_id = p_partner_id AND status IN ('attributed', 'eligible');

  RETURN jsonb_build_object(
    'code',           v_code,
    'total_referrals',  v_total,
    'pending_referrals', v_pending,
    'rewarded_referrals', v_rewarded,
    'reversed_referrals', v_reversed,
    'total_earned',     v_total_earned,
    'awaiting_reward',  v_awaiting
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_partner_referral_stats(UUID) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.get_partner_referral_stats(UUID) TO authenticated;
GRANT  EXECUTE ON FUNCTION public.get_partner_referral_stats(UUID) TO service_role;

-- ─── 14. BACKFILL ───────────────────────────────────────────────
-- Give every active professional an existing partners a referral code so the
-- program is live immediately after deploy without a one-by-one rollout.
DO $$
DECLARE
  r          RECORD;
  v_code     TEXT;
  v_tail     TEXT;
  v_chars    TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_attempt  INT;
  i          INT;
BEGIN
  FOR r IN
    SELECT id FROM public.profiles
     WHERE role = 'partner' AND status = 'active'
  LOOP
    IF EXISTS (SELECT 1 FROM public.partner_referral_codes WHERE partner_id = r.id) THEN
      CONTINUE;
    END IF;

    v_attempt := 0;
    LOOP
      v_attempt := v_attempt + 1;
      EXIT WHEN v_attempt > 20;

      v_tail := '';
      FOR i IN 1..5 LOOP
        v_tail := v_tail || substr(v_chars, 1 + floor(random() * length(v_chars))::INT, 1);
      END LOOP;
      v_code := 'PS' || v_tail;

      BEGIN
        INSERT INTO public.partner_referral_codes (partner_id, code)
        VALUES (r.id, v_code);
        EXIT;
      EXCEPTION
        WHEN unique_violation THEN
          NULL; -- collision → retry
      END;
    END LOOP;
  END LOOP;
END $$;

-- ═══════════════════════════════════════════════════════════════════
-- END OF MIGRATION
-- ═══════════════════════════════════════════════════════════════════