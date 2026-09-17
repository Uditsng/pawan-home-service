-- ═══════════════════════════════════════════════════════════════════════════
-- PHS Partner Referral Program — Regression Test Suite
--
-- Run against a staging database AFTER applying:
--   20260918000000_customer_referral_wallet_v2.sql
--   20260920000000_wallet_cash_bonus_ledger.sql
--   20260922000000_partner_referral_program.sql
--
--   psql "$DATABASE_URL" -f supabase/partner_referral_tests.sql
--
-- The entire suite runs inside one transaction that is ALWAYS ROLLED BACK, so
-- it never pollutes real data. Assertions write [PASS]/[FAIL] notices plus a
-- temp tally table; the final SELECT summarizes the result. No assertion aborts
-- the harness — expected exceptions are caught inline.
-- ═══════════════════════════════════════════════════════════════════════════

\set ON_ERROR_STOP off

BEGIN;

-- Transaction-scoped helpers (both dropped by ROLLBACK).
CREATE TEMP TABLE _prt_results (result TEXT NOT NULL, label TEXT NOT NULL);

CREATE FUNCTION _prt_check(p_ok BOOLEAN, p_label TEXT)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  IF p_ok THEN
    INSERT INTO _prt_results VALUES ('PASS', p_label);
    RAISE NOTICE '[PASS] %', p_label;
  ELSE
    INSERT INTO _prt_results VALUES ('FAIL', p_label);
    RAISE NOTICE '[FAIL] %', p_label;
  END IF;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Test driver: one DO block runs every scenario.
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  -- Ephemeral actors (fully rolled back at the end).
  v_partner_id          UUID := gen_random_uuid();
  v_partner2_id         UUID := gen_random_uuid();
  v_customer_id         UUID := gen_random_uuid();
  v_gateway_customer    UUID := gen_random_uuid();
  v_outside_customer    UUID := gen_random_uuid();

  v_code1               TEXT;
  v_ref_id_fb           UUID;      -- first_booking trigger referral
  v_ref_id_mark         UUID;      -- target for status-mark tests
  v_reward_amt          NUMERIC;

  v_res                 JSONB;
  v_partner_bal_0       NUMERIC;
  v_partner_bal_1       NUMERIC;
  v_partner_bal_2       NUMERIC;
  v_customer_bal_0      NUMERIC;
  v_customer_bal_1      NUMERIC;
  v_customer_bal_2      NUMERIC;
  v_prev_partner_tx     BIGINT;
  v_after_partner_tx    BIGINT;
  v_prev_customer_tx    BIGINT;
  v_after_customer_tx   BIGINT;
  v_enabled_was         TEXT;
  v_stats	              JSONB;
  v_claims_ok           BOOLEAN := true;
BEGIN
  RAISE NOTICE '════════ PHS Partner Referral — Test Suite ════════';

  -- ── 0. Auth harness detection (request.jwt.claims may not be predeclared) ─
  BEGIN
    PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', v_outside_customer, 'role', 'authenticated')::TEXT, true);
    PERFORM set_config('request.jwt.claim.sub', v_outside_customer::TEXT, true);
  EXCEPTION WHEN OTHERS THEN
    v_claims_ok := false;
    RAISE NOTICE '[SKIP] cannot set request.jwt.claims (%): % — auth-branch tests skipped', SQLSTATE, SQLERRM;
  END;
  IF v_claims_ok THEN
    PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', NULL, 'role', NULL)::TEXT, true);
    PERFORM set_config('request.jwt.claim.sub', '', true);
  END IF;

  -- ── 1. Schema & dependency smoke tests ─────────────────────────────────────
  PERFORM _prt_check(to_regclass('public.partner_referral_codes')  IS NOT NULL, 'table partner_referral_codes exists');
  PERFORM _prt_check(to_regclass('public.partner_referrals')       IS NOT NULL, 'table partner_referrals exists');
  PERFORM _prt_check(to_regclass('public.partner_referral_events') IS NOT NULL, 'table partner_referral_events exists');
  PERFORM _prt_check(to_regclass('public.wallet_transactions')     IS NOT NULL, 'depends on wallet_transactions (cash/bonus ledger)');
  PERFORM _prt_check(to_regclass('public.platform_settings')       IS NOT NULL, 'depends on platform_settings');

  -- ── 2. Seed test users (best-effort; skip if FK to auth.users breaks) ─────
  BEGIN
    INSERT INTO auth.users
      (id, instance_id, aud, role, email, phone, encrypted_password, email_confirmed_at, created_at, updated_at)
    VALUES
      (v_partner_id,          '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'partner.test@phs.test',  '9999900001', 'x', now(), now(), now()),
      (v_partner2_id,         '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'partner2.test@phs.test', '9999900002', 'x', now(), now(), now()),
      (v_customer_id,         '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'customer.test@phs.test', '9999900003', 'x', now(), now(), now()),
      (v_gateway_customer,    '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'gateway.test@phs.test',  '9999900004', 'x', now(), now(), now()),
      (v_outside_customer,    '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'outside.test@phs.test', '9999900005', 'x', now(), now(), now());

    INSERT INTO public.profiles (id, email, phone, full_name, role, status)
    VALUES
      (v_partner_id,        'partner.test@phs.test',   '9999900001', 'Test Pro One',   'partner',  'active'),
      (v_partner2_id,       'partner2.test@phs.test',  '9999900002', 'Test Pro Two',   'partner',  'active'),
      (v_customer_id,       'customer.test@phs.test',  '9999900003', 'Test Customer',  'customer', 'active'),
      (v_gateway_customer,  'gateway.test@phs.test',   '9999900004', 'Gateway Client', 'customer', 'active'),
      (v_outside_customer,  'outside.test@phs.test',   '9999900005', 'Outside Client', 'customer', 'active');

    RAISE NOTICE '[INFO] seeded 2 partners + 3 customers (rolled back at end)';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[SKIP] could not seed test users (%): % — user-level tests skipped', SQLSTATE, SQLERRM;
  END;

  SELECT COALESCE(wallet_balance, 0) INTO v_partner_bal_0  FROM public.profiles WHERE id = v_partner_id;
  SELECT COALESCE(wallet_balance, 0) INTO v_customer_bal_0 FROM public.profiles WHERE id = v_customer_id;
  RAISE NOTICE '[INFO] baseline balances — partner ₹%, customer ₹%', v_partner_bal_0, v_customer_bal_0;

  -- ── 3. ensure_partner_referral_code: idempotent, partner-only ─────────────
  v_res := public.ensure_partner_referral_code(v_partner_id);
  PERFORM _prt_check((v_res->>'success')::BOOLEAN = true AND (v_res->>'created')::BOOLEAN = true
                     AND (v_res->>'code') ~ '^PS[A-Z0-9]{5}$',
                     'ensure_partner_referral_code generates compact PS+5 code');
  v_code1 := v_res->>'code';

  PERFORM _prt_check(public.ensure_partner_referral_code(v_partner_id)->>'code' = v_code1
                     AND (public.ensure_partner_referral_code(v_partner_id)->>'created')::BOOLEAN = false,
                     'ensure_partner_referral_code is idempotent (same code returned)');

  v_res := public.ensure_partner_referral_code(v_gateway_customer);
  PERFORM _prt_check((v_res->>'success')::BOOLEAN = false AND v_res->>'error' ILIKE '%active professionals%',
                     'ensure_partner_referral_code rejects non-partners');

  -- ── 4. apply_partner_referral_code — validation gates ─────────────────────
  v_res := public.apply_partner_referral_code(v_customer_id, 'PSZZZZZ');
  PERFORM _prt_check((v_res->>'success')::BOOLEAN = false AND v_res->>'error' ILIKE '%not found%',
                     'apply rejects an unknown code');

  v_res := public.apply_partner_referral_code(v_customer_id, 'PHS-PAR-' || substring(v_code1 from 3));
  PERFORM _prt_check((v_res->>'success')::BOOLEAN = true AND v_res->>'referral_id' IS NOT NULL
                     AND v_res->>'trigger' = 'first_booking' AND (v_res->>'pending')::BOOLEAN = true,
                     'apply accepts marketing form PHS-PAR-XXXXX (normalized to compact)');
  v_ref_id_fb := (v_res->>'referral_id')::UUID;

  v_res := public.apply_partner_referral_code(v_customer_id, v_code1);
  PERFORM _prt_check((v_res->>'success')::BOOLEAN = false AND v_res->>'error' ILIKE '%already been applied%',
                     'apply blocks a second referral for the same account');

  v_res := public.apply_partner_referral_code(v_gateway_customer, v_code1);
  PERFORM _prt_check((v_res->>'success')::BOOLEAN = true AND (v_res->>'pending')::BOOLEAN = true,
                     'a second distinct customer can be referred by the same professional');
  v_ref_id_mark := (v_res->>'referral_id')::UUID;

  v_res := public.apply_partner_referral_code(v_partner_id, v_code1);
  PERFORM _prt_check((v_res->>'success')::BOOLEAN = false AND v_res->>'error' ILIKE '%own partner referral code%',
                     'apply blocks self-referral');

  -- Temp suspend the referring professional.
  UPDATE public.profiles SET status = 'suspended' WHERE id = v_partner_id;
  v_res := public.apply_partner_referral_code(v_outside_customer, v_code1);
  PERFORM _prt_check((v_res->>'success')::BOOLEAN = false AND v_res->>'error' ILIKE '%not currently eligible%',
                     'apply refuses when the referring professional is not active');
  UPDATE public.profiles SET status = 'active' WHERE id = v_partner_id;

  -- Program disabled.
  SELECT COALESCE((value #>> '{}')::TEXT, 'true') INTO v_enabled_was
    FROM public.platform_settings WHERE key = 'partner_referral_enabled';
  UPDATE public.platform_settings SET value = 'false' WHERE key = 'partner_referral_enabled';
  v_res := public.apply_partner_referral_code(v_outside_customer, v_code1);
  PERFORM _prt_check((v_res->>'success')::BOOLEAN = false AND v_res->>'error' ILIKE '%disabled%',
                     'apply refuses when the program is disabled');
  UPDATE public.platform_settings SET value = v_enabled_was WHERE key = 'partner_referral_enabled';

  -- ── 5. First-booking trigger: pending → qualified → rewarded (idempotent) ─
  v_res := public.reward_partner_referral(v_ref_id_fb);
  PERFORM _prt_check((v_res->>'success')::BOOLEAN = true AND (v_res->>'pending')::BOOLEAN = true
                     AND v_res->>'reason' = 'not_first_booking',
                     'first_booking referral stays pending until a completed booking exists');

  -- Simulate qualification (full booking creation is outside suite scope).
  INSERT INTO public.partner_referral_events (referral_id, event_type, actor_role, metadata)
    VALUES (v_ref_id_fb, 'eligible', 'system', jsonb_build_object('note', 'test-qualified'));
  UPDATE public.partner_referrals SET status = 'eligible', qualified_at = now() WHERE id = v_ref_id_fb;

  SELECT COUNT(*) INTO v_prev_partner_tx
    FROM public.wallet_transactions WHERE user_id = v_partner_id AND source = 'partner_referral_reward';
  SELECT COUNT(*) INTO v_prev_customer_tx
    FROM public.wallet_transactions WHERE user_id = v_customer_id AND source = 'partner_referral_bonus';

  v_res := public.reward_partner_referral(v_ref_id_fb);
  PERFORM _prt_check((v_res->>'success')::BOOLEAN = true AND (v_res->>'already_rewarded')::BOOLEAN IS DISTINCT FROM true,
                     'reward_partner_referral credits wallets on first reward');
  v_reward_amt := (v_res->>'partner_reward')::NUMERIC;

  SELECT COALESCE(wallet_balance, 0) INTO v_partner_bal_1  FROM public.profiles WHERE id = v_partner_id;
  SELECT COALESCE(wallet_balance, 0) INTO v_customer_bal_1 FROM public.profiles WHERE id = v_customer_id;
  PERFORM _prt_check(v_partner_bal_1 = v_partner_bal_0 + v_reward_amt
                     AND v_customer_bal_1 = v_customer_bal_0 + (v_res->>'customer_reward')::NUMERIC,
                     'both wallets credited atomically (partner + customer, bonus)');

  SELECT COUNT(*) INTO v_after_partner_tx
    FROM public.wallet_transactions WHERE user_id = v_partner_id AND source = 'partner_referral_reward';
  SELECT COUNT(*) INTO v_after_customer_tx
    FROM public.wallet_transactions WHERE user_id = v_customer_id AND source = 'partner_referral_bonus';
  PERFORM _prt_check(v_after_partner_tx = v_prev_partner_tx + 1 AND v_after_customer_tx = v_prev_customer_tx + 1,
                     'wallet_transactions rows written with correct partner sources');

  -- Idempotency / no double-pay.
  v_partner_bal_1 := COALESCE((SELECT wallet_balance FROM public.profiles WHERE id = v_partner_id), 0);
  v_customer_bal_1 := COALESCE((SELECT wallet_balance FROM public.profiles WHERE id = v_customer_id), 0);
  v_res := public.reward_partner_referral(v_ref_id_fb);
  v_partner_bal_2 := COALESCE((SELECT wallet_balance FROM public.profiles WHERE id = v_partner_id), 0);
  v_customer_bal_2 := COALESCE((SELECT wallet_balance FROM public.profiles WHERE id = v_customer_id), 0);
  PERFORM _prt_check((v_res->>'already_rewarded')::BOOLEAN = true
                     AND v_partner_bal_2 = v_partner_bal_1 AND v_customer_bal_2 = v_customer_bal_1,
                     'second reward call is idempotent (already_rewarded, no double-pay)');

  -- ── 6. get_partner_referral_stats ──────────────────────────────────────────
  v_stats := public.get_partner_referral_stats(v_partner_id);
  PERFORM _prt_check((v_stats->>'code') = v_code1
                     AND (v_stats->>'total_referrals')::BIGINT >= 1
                     AND (v_stats->>'rewarded_referrals')::BIGINT = 1
                     AND (v_stats->>'pending_referrals')::BIGINT >= 1
                     AND (v_stats->>'total_earned')::NUMERIC = v_reward_amt,
                     'get_partner_referral_stats reflects code, counts and earnings');

  -- ── 7. mark_partner_referral_status ────────────────────────────────────────
  v_res := public.mark_partner_referral_status(v_ref_id_fb, 'rejected', 'test demotion');
  PERFORM _prt_check((v_res->>'success')::BOOLEAN = false AND v_res->>'error' ILIKE '%cannot be re-marked%',
                     'mark_partner_referral_status refuses rewarded referrals');

  v_res := public.mark_partner_referral_status(v_ref_id_mark, 'fraud_review', 'suspicious signup');
  PERFORM _prt_check((v_res->>'success')::BOOLEAN = true AND v_res->>'to_status' = 'fraud_review',
                     'mark_partner_referral_status moves a non-rewarded referral');

  BEGIN
    v_res := public.mark_partner_referral_status(v_ref_id_mark, 'rewarded', 'should fail');
    PERFORM _prt_check(false, 'mark_partner_referral_status raises on out-of-band status');
  EXCEPTION WHEN OTHERS THEN
    PERFORM _prt_check(true, 'mark_partner_referral_status raises on out-of-band status');
  END;

  -- ── 8. reverse_partner_referral — bonus-only debit, back to baseline ──────
  v_partner_bal_1 := COALESCE((SELECT wallet_balance FROM public.profiles WHERE id = v_partner_id), 0);
  v_customer_bal_1 := COALESCE((SELECT wallet_balance FROM public.profiles WHERE id = v_customer_id), 0);

  v_res := public.reverse_partner_referral(v_ref_id_fb, 'test reversal');
  v_partner_bal_2 := COALESCE((SELECT wallet_balance FROM public.profiles WHERE id = v_partner_id), 0);
  v_customer_bal_2 := COALESCE((SELECT wallet_balance FROM public.profiles WHERE id = v_customer_id), 0);
  PERFORM _prt_check((v_res->>'success')::BOOLEAN = true
                     AND v_partner_bal_2 = v_partner_bal_0 AND v_customer_bal_2 = v_customer_bal_0,
                     'reverse_partner_referral debits both wallets back to baseline');

  v_res := public.reverse_partner_referral(v_ref_id_fb, 'double reverse');
  PERFORM _prt_check((v_res->>'success')::BOOLEAN = false AND v_res->>'error' ILIKE '%only rewarded%',
                     'second reverse is rejected');

  -- ── 9. Authorization branches (only if claims GUC is usable) ───────────────
  IF v_claims_ok THEN
    PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', v_outside_customer, 'role', 'authenticated')::TEXT, true);
    PERFORM set_config('request.jwt.claim.sub', v_outside_customer::TEXT, true);
    -- Reward the (now reversed) referral while impersonating an unrelated user.
    BEGIN
      v_res := public.reward_partner_referral(v_ref_id_fb);
      PERFORM _prt_check(false, 'reward_partner_referral blocks unrelated authenticated users');
    EXCEPTION WHEN OTHERS THEN
      PERFORM _prt_check(SQLERRM ILIKE '%Unauthorized%', 'reward_partner_referral blocks unrelated authenticated users');
    END;

    BEGIN
      v_res := public.apply_partner_referral_code(v_customer_id, v_code1);
      PERFORM _prt_check(false, 'apply_partner_referral_code blocks applying for another account');
    EXCEPTION WHEN OTHERS THEN
      PERFORM _prt_check(SQLERRM ILIKE '%Unauthorized%', 'apply_partner_referral_code blocks applying for another account');
    END;

    BEGIN
      v_res := public.get_partner_referral_stats(v_partner_id);
      PERFORM _prt_check(false, 'get_partner_referral_stats blocks unrelated users');
    EXCEPTION WHEN OTHERS THEN
      PERFORM _prt_check(SQLERRM ILIKE '%Unauthorized%', 'get_partner_referral_stats blocks unrelated users');
    END;

    BEGIN
      v_res := public.mark_partner_referral_status(v_ref_id_mark, 'rejected', 'fraud');
      PERFORM _prt_check(false, 'mark_partner_referral_status blocks non-admins');
    EXCEPTION WHEN OTHERS THEN
      PERFORM _prt_check(SQLERRM ILIKE '%admin%', 'mark_partner_referral_status blocks non-admins');
    END;

    PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', NULL, 'role', NULL)::TEXT, true);
    PERFORM set_config('request.jwt.claim.sub', '', true);
  ELSE
    RAISE NOTICE '[SKIP] auth-branch tests skipped (claims GUC unavailable)';
  END IF;

  RAISE NOTICE '════════ Partner Referral — Suite Executed ════════';
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Tally (and always discard — nothing is committed).
-- ─────────────────────────────────────────────────────────────────────────────
SELECT
  COUNT(*) FILTER (WHERE result = 'PASS') AS passed,
  COUNT(*) FILTER (WHERE result = 'FAIL') AS failed
FROM _prt_results;

ROLLBACK;

\echo 'partner_referral_tests.sql executed. All test rows were rolled back.'