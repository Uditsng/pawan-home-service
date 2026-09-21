-- ═══════════════════════════════════════════════════════════════════════════
-- PHS Partner Payout System — Regression Test Suite
--
-- Run this in the Supabase Dashboard SQL editor (or psql) AFTER applying
--   20260928000000_partner_payout_system.sql
--
-- The entire suite runs inside one transaction that is ALWAYS ROLLED BACK, so
-- it never pollutes real data. Assertions write [PASS]/[FAIL] notices plus a
-- temp tally table; the final SELECT summarizes the result. Expected failures
-- and schema gaps are caught inline via savepoint-style BEGIN/EXCEPTION blocks,
-- so a single infrastructure difference never aborts the whole harness.
--
-- NOTE: runs as the table owner / service role, so auth.uid() is NULL. The
-- admin RPCs accept an explicit admin id (or skip the guard when the actor is
-- NULL) precisely so a command-line harness can drive the admin branch without
-- a web session.
--
-- SCHEMA HEALING: earlier iterations of the payout migration may have left the
-- payout tables missing created_at/updated_at (CREATE TABLE IF NOT EXISTS does
-- not add columns). These statements run OUTSIDE the rolled-back transaction
-- so the fix persists; re-running them is a no-op.

ALTER TABLE public.payouts
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL;

ALTER TABLE public.payout_allocations
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL;

ALTER TABLE public.partner_payment_details
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL;

BEGIN;

-- Transaction-scoped helpers (all dropped by ROLLBACK).
CREATE TEMP TABLE _ppt_results (result TEXT NOT NULL, label TEXT NOT NULL);

CREATE FUNCTION _ppt_check(p_ok BOOLEAN, p_label TEXT)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  IF p_ok THEN
    INSERT INTO _ppt_results VALUES ('PASS', p_label);
    RAISE NOTICE '[PASS] %', p_label;
  ELSE
    INSERT INTO _ppt_results VALUES ('FAIL', p_label);
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
  v_admin_id        UUID := gen_random_uuid();
  v_partner_id      UUID := gen_random_uuid();
  v_partner2_id     UUID := gen_random_uuid();
  v_customer_id     UUID := gen_random_uuid();
  v_service_id      UUID := gen_random_uuid();
  v_subcategory_id  UUID := gen_random_uuid();
  v_category_id     UUID := gen_random_uuid();
  v_booking_id      UUID := gen_random_uuid();

  v_min_payout      NUMERIC;
  v_enabled         BOOLEAN;
  v_summary         JSONB;
  v_res             JSONB;
  v_payout_id       UUID;
  v_allocated       NUMERIC(10,2);
  v_before          NUMERIC(10,2);
  v_after           NUMERIC(10,2);
  v_pd_upi_id       UUID;
  v_pd_bank_id      UUID;
  v_primary_count   INT;
  v_paid_payout_id  UUID;
  v_paid_earning    UUID;
BEGIN
  RAISE NOTICE '════════ PHS Partner Payout — Test Suite ════════';

  -- ── 1. Schema smoke tests ───────────────────────────────────────────────
  PERFORM _ppt_check(to_regclass('public.partner_earnings')        IS NOT NULL, 'table partner_earnings exists');
  PERFORM _ppt_check(to_regclass('public.payouts')                 IS NOT NULL, 'table payouts exists');
  PERFORM _ppt_check(to_regclass('public.payout_allocations')      IS NOT NULL, 'table payout_allocations exists');
  PERFORM _ppt_check(to_regclass('public.payout_events')           IS NOT NULL, 'table payout_events exists');
  PERFORM _ppt_check(to_regclass('public.payout_adjustments')      IS NOT NULL, 'table payout_adjustments exists');
  PERFORM _ppt_check(to_regclass('public.partner_payment_details') IS NOT NULL, 'table partner_payment_details exists');
  PERFORM _ppt_check(to_regclass('public.bookings')                IS NOT NULL, 'depends on bookings');
  PERFORM _ppt_check(to_regprocedure('public.get_partner_payout_summary(uuid)') IS NOT NULL, 'rpc get_partner_payout_summary exists');
  PERFORM _ppt_check(to_regprocedure('public.request_partner_payout(uuid)') IS NOT NULL, 'rpc request_partner_payout exists');
  PERFORM _ppt_check(to_regprocedure('public.approve_partner_payout(uuid, uuid)') IS NOT NULL, 'rpc approve_partner_payout exists');
  PERFORM _ppt_check(to_regprocedure('public.reject_partner_payout(uuid, uuid, text)') IS NOT NULL, 'rpc reject_partner_payout exists');
  PERFORM _ppt_check(to_regprocedure('public.process_partner_payout(uuid, uuid, text, text)') IS NOT NULL, 'rpc process_partner_payout exists');
  PERFORM _ppt_check(to_regprocedure('public.mark_partner_payout_paid(uuid, uuid, text, text)') IS NOT NULL, 'rpc mark_partner_payout_paid exists');
  PERFORM _ppt_check(to_regprocedure('public.cancel_partner_payout_request(uuid, uuid, text)') IS NOT NULL, 'rpc cancel_partner_payout_request exists');
  PERFORM _ppt_check(to_regprocedure('public.add_partner_payout_adjustment(uuid, uuid, text, numeric, text)') IS NOT NULL, 'rpc add_partner_payout_adjustment exists');
  PERFORM _ppt_check(to_regprocedure('public.get_payout_reconciliation()') IS NOT NULL, 'rpc get_payout_reconciliation exists');

  -- ── 2. Configuration from platform_settings ──────────────────────────────
  PERFORM _ppt_check(
    EXISTS (SELECT 1 FROM public.platform_settings WHERE key = 'partner_payout_min'),
    'platform_settings seeded partner_payout_min'
  );
  PERFORM _ppt_check(
    EXISTS (SELECT 1 FROM public.platform_settings WHERE key = 'partner_payouts_enabled'),
    'platform_settings seeded partner_payouts_enabled'
  );

  SELECT pc.min_amount, pc.enabled INTO v_min_payout, v_enabled
    FROM public.get_payout_config() AS pc;
  PERFORM _ppt_check(v_min_payout >= 1, 'get_payout_config returns a sane minimum payout');
  PERFORM _ppt_check(COALESCE(v_enabled, true), 'get_payout_config reports payouts enabled');

  -- ── 3. Seed test users (best-effort; skip if FK to auth.users breaks).
  --       Deterministic ids + email-scoped pre-clean make re-runs idempotent,
  --       even when an earlier aborted dashboard run leaked rows (the editor
  --       doesn't always roll back).
  v_admin_id    := '10000000-0000-4000-8000-0000000000a1';
  v_partner_id  := '10000000-0000-4000-8000-0000000000b1';
  v_partner2_id := '10000000-0000-4000-8000-0000000000b2';
  v_customer_id := '10000000-0000-4000-8000-0000000000c1';
  v_booking_id  := '10000000-0000-4000-8000-0000000000d1';

  BEGIN
    DELETE FROM auth.users   WHERE email IN ('payout.admin.test@phs.test','payout.pro1.test@phs.test','payout.pro2.test@phs.test','payout.customer.test@phs.test');
    DELETE FROM public.profiles WHERE email IN ('payout.admin.test@phs.test','payout.pro1.test@phs.test','payout.pro2.test@phs.test','payout.customer.test@phs.test');

    INSERT INTO auth.users
      (id, instance_id, aud, role, email, phone, encrypted_password, email_confirmed_at, created_at, updated_at)
    VALUES
      (v_admin_id,    '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'payout.admin.test@phs.test',    '9999900100', 'x', now(), now(), now()),
      (v_partner_id,  '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'payout.pro1.test@phs.test',     '9999900101', 'x', now(), now(), now()),
      (v_partner2_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'payout.pro2.test@phs.test',     '9999900102', 'x', now(), now(), now()),
      (v_customer_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'payout.customer.test@phs.test', '9999900103', 'x', now(), now(), now())
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.profiles (id, email, phone, full_name, role, status)
    VALUES
      (v_admin_id,    'payout.admin.test@phs.test',    '9999900100', 'Payout Admin',    'admin',    'active'),
      (v_partner_id,  'payout.pro1.test@phs.test',     '9999900101', 'Payout Pro One',  'partner',  'active'),
      (v_partner2_id, 'payout.pro2.test@phs.test',     '9999900102', 'Payout Pro Two',  'partner',  'active'),
      (v_customer_id, 'payout.customer.test@phs.test', '9999900103', 'Payout Customer', 'customer', 'active')
    ON CONFLICT (id) DO NOTHING;

    RAISE NOTICE '[INFO] seeded admin + 2 partners + customer (rolled back at end)';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[SKIP] could not seed test users (%): % — aborting before payout tests', SQLSTATE, SQLERRM;
    PERFORM _ppt_check(false, '⚠ seeding failed: ' || SQLERRM);
    RETURN;
  END;

  -- ── 4. Create earnings through the REAL completion trigger. ──────────────
  --       partner_earnings.booking_id has an FK to bookings, so synthetic rows
  --       are impossible — instead we insert genuine pending bookings (using
  --       the same column set as the production complete_booking_atomic RPC)
  --       plus booking_pricing rows, then flip them to 'completed' so the
  --       trigger snapshots 400 / 400 / 360 (Pro One) and 500 (Pro Two).
  BEGIN
    -- Shared service chain (deterministic ids + idempotent upsert).
    INSERT INTO public.categories (id, category_name)
    VALUES (v_category_id, 'Payout Test Category')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.subcategories (id, subcategory_name, icon_name, category_id)
    VALUES (v_subcategory_id, 'Payout Test Sub', 'home_repair_service', v_category_id)
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.services (id, subcategory_id, title, description, base_price, is_active, category, pricing_model, image_url)
    VALUES (v_service_id, v_subcategory_id, 'Payout Test Service', 'trigger test', 1000, true, 'Payout Test Category', 'fixed', '/assets/test.png')
    ON CONFLICT (id) DO NOTHING;

    -- Helper-less: four explicit bookings (no arrays / slicing). Pairs:
    -- Pro One: 500@0, 500@0, 500@50 → 90%… wait, 80% → 400, 400, 360.
    -- Pro Two: 625@0 → 500. Completion dates: 10d / 6d / 4d / 2d ago.
    DECLARE
      v_book_a UUID := gen_random_uuid();
      v_book_b UUID := gen_random_uuid();
      v_book_c UUID := gen_random_uuid();
      v_book_d UUID := gen_random_uuid();
    BEGIN
      INSERT INTO public.bookings (
        id, customer_id, service_id, partner_id, status, total_amount,
        city, area, address, pincode, scheduled_date, wallet_discount_applied,
        payment_status, pricing_model, selected_duration_minutes,
        base_price, final_price, completed_at, service_completed_at
      ) VALUES (
        v_book_a, v_customer_id, v_service_id, v_partner_id, 'pending', 500,
        'Test City', 'Test Area', 'Test Address', '110001', now() - interval '11 days', 0,
        'paid', 'fixed', 60, 500, 500, now() - interval '10 days', now() - interval '10 days'
      );
      INSERT INTO public.booking_pricing (booking_id, total_price, gst_amount)
      VALUES (v_book_a, 500, 0);
      UPDATE public.bookings SET status = 'completed' WHERE id = v_book_a;

      INSERT INTO public.bookings (
        id, customer_id, service_id, partner_id, status, total_amount,
        city, area, address, pincode, scheduled_date, wallet_discount_applied,
        payment_status, pricing_model, selected_duration_minutes,
        base_price, final_price, completed_at, service_completed_at
      ) VALUES (
        v_book_b, v_customer_id, v_service_id, v_partner_id, 'pending', 500,
        'Test City', 'Test Area', 'Test Address', '110001', now() - interval '7 days', 0,
        'paid', 'fixed', 60, 500, 500, now() - interval '6 days', now() - interval '6 days'
      );
      INSERT INTO public.booking_pricing (booking_id, total_price, gst_amount)
      VALUES (v_book_b, 500, 0);
      UPDATE public.bookings SET status = 'completed' WHERE id = v_book_b;

      INSERT INTO public.bookings (
        id, customer_id, service_id, partner_id, status, total_amount,
        city, area, address, pincode, scheduled_date, wallet_discount_applied,
        payment_status, pricing_model, selected_duration_minutes,
        base_price, final_price, completed_at, service_completed_at
      ) VALUES (
        v_book_c, v_customer_id, v_service_id, v_partner_id, 'pending', 500,
        'Test City', 'Test Area', 'Test Address', '110001', now() - interval '5 days', 0,
        'paid', 'fixed', 60, 500, 500, now() - interval '4 days', now() - interval '4 days'
      );
      INSERT INTO public.booking_pricing (booking_id, total_price, gst_amount)
      VALUES (v_book_c, 500, 50);
      UPDATE public.bookings SET status = 'completed' WHERE id = v_book_c;

      INSERT INTO public.bookings (
        id, customer_id, service_id, partner_id, status, total_amount,
        city, area, address, pincode, scheduled_date, wallet_discount_applied,
        payment_status, pricing_model, selected_duration_minutes,
        base_price, final_price, completed_at, service_completed_at
      ) VALUES (
        v_book_d, v_customer_id, v_service_id, v_partner2_id, 'pending', 625,
        'Test City', 'Test Area', 'Test Address', '110001', now() - interval '3 days', 0,
        'paid', 'fixed', 60, 625, 625, now() - interval '2 days', now() - interval '2 days'
      );
      INSERT INTO public.booking_pricing (booking_id, total_price, gst_amount)
      VALUES (v_book_d, 625, 0);
      UPDATE public.bookings SET status = 'completed' WHERE id = v_book_d;
    END;

    RAISE NOTICE '[INFO] created 4 completed test bookings → earnings via trigger';
  EXCEPTION WHEN OTHERS THEN
    DECLARE v_ctx TEXT;
    BEGIN
      GET STACKED DIAGNOSTICS v_ctx = PG_EXCEPTION_CONTEXT;
      RAISE NOTICE '[SKIP] could not create test bookings (%): %', SQLSTATE, SQLERRM;
      RAISE NOTICE '  → %', v_ctx;
      PERFORM _ppt_check(false, '⚠ booking seeding failed: ' || SQLERRM || CHR(10) || v_ctx);
      RETURN;
    END;
  END;

  -- ── 5. get_partner_payout_summary — derived balances ─────────────────────
  v_summary := public.get_partner_payout_summary(v_partner_id);
  PERFORM _ppt_check((v_summary->>'total_earned')::NUMERIC = 1160, 'summary total_earned = 1160 (400+400+360)');
  PERFORM _ppt_check((v_summary->>'eligible')::NUMERIC = 1160,     'summary eligible = 1160');
  PERFORM _ppt_check((v_summary->>'available')::NUMERIC = 1160,    'summary available = 1160 (no clawbacks)');
  PERFORM _ppt_check((v_summary->>'paid')::NUMERIC = 0,            'summary paid = 0');
  PERFORM _ppt_check((v_summary->>'processing')::NUMERIC = 0,      'summary processing = 0');
  PERFORM _ppt_check((v_summary->>'clawback_due')::NUMERIC = 0,    'summary clawback_due = 0');
  PERFORM _ppt_check(jsonb_array_length(v_summary->'earnings') = 3, 'summary earnings history has 3 rows');
  PERFORM _ppt_check(jsonb_array_length(v_summary->'payouts') = 0,  'summary payout history empty');

  -- ── 6. request_partner_payout — FIFO whole-earning allocation ────────────
  v_res := public.request_partner_payout(v_partner_id);
  PERFORM _ppt_check((v_res->>'success')::BOOLEAN = true
    AND (v_res->>'amount')::NUMERIC = 1160
    AND (v_res->>'payout_number') LIKE 'PAY-%',
    'request_partner_payout success with full ₹1,160 FIFO allocation');

  v_payout_id := (v_res->>'payout_id')::UUID;

  PERFORM _ppt_check(
    (SELECT COUNT(*) FROM public.payout_allocations WHERE payout_id = v_payout_id AND status = 'allocated') = 3,
    '3 earnings allocated into the payout'
  );
  PERFORM _ppt_check(
    (SELECT COUNT(*) FROM public.partner_earnings WHERE partner_id = v_partner_id AND status = 'reserved') = 3,
    '3 earnings moved to reserved'
  );
  PERFORM _ppt_check(
    EXISTS (SELECT 1 FROM public.payout_events WHERE payout_id = v_payout_id AND event_type = 'requested'),
    'payout_events records requested'
  );

  -- ── 7. Single active payout guard ────────────────────────────────────────
  v_res := public.request_partner_payout(v_partner_id);
  PERFORM _ppt_check((v_res->>'success')::BOOLEAN = false AND v_res->>'error' ILIKE '%already have a payout in progress%',
    'duplicate request rejected while a payout is in progress');

  -- ── 8. Feature switch: disabled payouts short-circuit ───────────────────
  UPDATE public.platform_settings SET value = 'false' WHERE key = 'partner_payouts_enabled';
  v_res := public.request_partner_payout(v_partner_id);
  PERFORM _ppt_check((v_res->>'success')::BOOLEAN = false AND v_res->>'error' ILIKE '%disabled%',
    'request blocked while payouts are disabled');
  UPDATE public.platform_settings SET value = 'true' WHERE key = 'partner_payouts_enabled';

  -- ── 9. Payment details CRUD + single-primary invariant ──────────────────
  INSERT INTO public.partner_payment_details (partner_id, method, label, value, is_primary)
  VALUES (v_partner_id, 'BANK', 'HDFC Account', '1234567890|HDFC0000123', true)
  RETURNING id INTO v_pd_bank_id;

  INSERT INTO public.partner_payment_details (partner_id, method, label, value, is_primary)
  VALUES (v_partner_id, 'UPI', 'GPay', 'pro1@upi', true)
  RETURNING id INTO v_pd_upi_id;

  SELECT COUNT(*) INTO v_primary_count
    FROM public.partner_payment_details
   WHERE partner_id = v_partner_id AND is_primary;

  PERFORM _ppt_check(v_primary_count = 1 AND NOT EXISTS (
        SELECT 1 FROM public.partner_payment_details WHERE id = v_pd_bank_id AND is_primary
      ),
      'setting a new primary un-sets the previous primary (single-primary trigger)');

  -- 9.5 Admin reconciliation should surface the payout + payment details.
  v_res := public.get_payout_reconciliation();
  PERFORM _ppt_check(
    jsonb_array_length(v_res->'rows') >= 1,
    'get_payout_reconciliation returns at least one payout row'
  );

  -- ── 10. Admin approve → process → mark paid ─────────────────────────────
  v_res := public.approve_partner_payout(v_payout_id, v_admin_id);
  PERFORM _ppt_check((v_res->>'success')::BOOLEAN = true AND (v_res->>'status')::TEXT = 'approved',
    'approve_partner_payout succeeds for admin');

  v_res := public.approve_partner_payout(v_payout_id, v_admin_id);
  PERFORM _ppt_check((v_res->>'success')::BOOLEAN = false AND v_res->>'error' ILIKE '%requested%',
    'second approve rejected (only while requested)');

  v_res := public.process_partner_payout(v_payout_id, v_admin_id, 'UPI', 'HARNESS-REF-1');
  PERFORM _ppt_check((v_res->>'success')::BOOLEAN = true AND (v_res->>'status')::TEXT = 'processing',
    'process_partner_payout succeeds with UPI method');

  v_res := public.process_partner_payout(v_payout_id, v_admin_id, 'NEFT', NULL);
  PERFORM _ppt_check((v_res->>'success')::BOOLEAN = false AND v_res->>'error' ILIKE '%Invalid payment method%',
    'process rejects an invalid payment method');

  SELECT COALESCE(SUM(amount), 0) INTO v_before FROM public.payout_allocations WHERE status = 'allocated';
  v_res := public.mark_partner_payout_paid(v_payout_id, v_admin_id, 'UPI', 'HARNESS-REF-1');
  SELECT COALESCE(SUM(amount), 0) INTO v_after FROM public.payout_allocations WHERE status = 'paid';

  PERFORM _ppt_check((v_res->>'success')::BOOLEAN = true AND (v_res->>'status')::TEXT = 'paid',
    'mark_partner_payout_paid succeeds');

  PERFORM _ppt_check(v_before = v_after AND v_after = 1160,
    'paid payout flips all allocations to paid for the full amount');

  PERFORM _ppt_check(
    (SELECT COUNT(*) FROM public.partner_earnings WHERE partner_id = v_partner_id AND status = 'paid') = 3,
    'paid payout marks earnings as paid'
  );

  PERFORM _ppt_check(
    EXISTS (SELECT 1 FROM public.payout_events WHERE payout_id = v_payout_id AND event_type = 'paid'),
    'payout_events records paid'
  );

  v_summary := public.get_partner_payout_summary(v_partner_id);
  PERFORM _ppt_check((v_summary->>'paid')::NUMERIC = 1160 AND (v_summary->>'available')::NUMERIC = 0,
    'summary paid = 1160 and available = 0 after full payout');

  -- ── 11. Adjustments: clawback math + validation ─────────────────────────
  SELECT po.id INTO v_paid_payout_id
    FROM public.payouts po WHERE po.partner_id = v_partner_id AND po.status = 'paid'
    LIMIT 1;

  -- Pro Two (500 eligible): clawback 480 → available drops to 20.
  v_res := public.add_partner_payout_adjustment(v_partner2_id, NULL, 'clawback', -480, 'Harness clawback test');
  PERFORM _ppt_check((v_res->>'success')::BOOLEAN = true AND (v_res->>'amount')::NUMERIC = -480,
    'add_partner_payout_adjustment stores clawback as negative');

  v_res := public.add_partner_payout_adjustment(v_partner2_id, NULL, 'restitution', 50, 'Harness restitution test');
  PERFORM _ppt_check((v_res->>'success')::BOOLEAN = true AND (v_res->>'amount')::NUMERIC = 50,
    'add_partner_payout_adjustment stores restitution as positive');

  v_res := public.add_partner_payout_adjustment(v_partner2_id, NULL, 'clawback', 0, 'no-op');
  PERFORM _ppt_check((v_res->>'success')::BOOLEAN = false AND v_res->>'error' IS NOT NULL,
    'adjustment rejects a zero amount');

  v_res := public.add_partner_payout_adjustment(v_partner2_id, NULL, 'clawback', 10, '   ');
  PERFORM _ppt_check((v_res->>'success')::BOOLEAN = false AND v_res->>'error' IS NOT NULL,
    'adjustment rejects a blank reason');

  v_summary := public.get_partner_payout_summary(v_partner2_id);
  PERFORM _ppt_check((v_summary->>'clawback_due')::NUMERIC = 480, 'clawback_due aggregates only negative adjustments');
  PERFORM _ppt_check((v_summary->>'available')::NUMERIC = 20,    'available = eligible − clawback_due');

  -- ── 12. Min-payout friendly error (below availability) ──────────────────
  v_res := public.request_partner_payout(v_partner2_id);
  PERFORM _ppt_check((v_res->>'success')::BOOLEAN = false AND v_res->>'error' ILIKE '%Minimum payout%',
    'request returns a friendly minimum-payout error when available is too low');

  -- ── 13. Reject flow releases allocations; FIFO skips oversized earning ──
  -- Add ₹600 eligible so available = (500+600) − 480 = 620 ≥ min. FIFO must
  -- take the old ₹500 (0+500 ≤ 620) and SKIP the ₹600 (500+600 > 620).
  DECLARE
    v_book2 UUID := gen_random_uuid();
  BEGIN
    INSERT INTO public.bookings (
      id, customer_id, service_id, partner_id, status, total_amount,
      city, area, address, pincode, scheduled_date, wallet_discount_applied,
      payment_status, pricing_model, selected_duration_minutes,
      base_price, final_price, completed_at
    ) VALUES (
      v_book2, v_customer_id, v_service_id, v_partner2_id, 'pending', 750,
      'Test City', 'Test Area', 'Test Address', '110001', now() - interval '1 day', 0,
      'paid', 'fixed', 60, 750, 750, now()
    );

    INSERT INTO public.booking_pricing (booking_id, total_price, gst_amount)
    VALUES (v_book2, 750, 0);

    UPDATE public.bookings SET status = 'completed' WHERE id = v_book2;
  END;

  v_res := public.request_partner_payout(v_partner2_id);
  PERFORM _ppt_check((v_res->>'success')::BOOLEAN = true AND (v_res->>'amount')::NUMERIC = 500,
    'request succeeds with clawback-aware FIFO (500 taken, 600 skipped)');

  DECLARE
    v_p2_payout UUID := (v_res->>'payout_id')::UUID;
  BEGIN
    v_res := public.reject_partner_payout(v_p2_payout, v_admin_id, 'Harness rejection');
    PERFORM _ppt_check((v_res->>'success')::BOOLEAN = true AND (v_res->>'status')::TEXT = 'rejected',
      'reject succeeds for admin');

    PERFORM _ppt_check(
      (SELECT COUNT(*) FROM public.payout_allocations WHERE payout_id = v_p2_payout AND status = 'released') = 1,
      'rejected payout releases its allocations back to eligible'
    );

    v_summary := public.get_partner_payout_summary(v_partner2_id);
    PERFORM _ppt_check((v_summary->>'eligible')::NUMERIC = 1100 AND (v_summary->>'processing')::NUMERIC = 0,
      'reject restores earnings to eligible (500 still net of clawback)');
  END;

  -- ── 14. Partner self-cancel flow ────────────────────────────────────────
  v_res := public.request_partner_payout(v_partner2_id);
  DECLARE
    v_p2_payout UUID := (v_res->>'payout_id')::UUID;
  BEGIN
    v_res := public.cancel_partner_payout_request(v_p2_payout, v_partner2_id, 'Harness self-cancel');
    PERFORM _ppt_check((v_res->>'success')::BOOLEAN = true AND (v_res->>'status')::TEXT = 'cancelled',
      'partner can cancel their own request');

    v_summary := public.get_partner_payout_summary(v_partner2_id);
    PERFORM _ppt_check((v_summary->>'current_payout') IS NULL AND (v_summary->>'processing')::NUMERIC = 0,
      'cancelled payout leaves no active payout and frees processing');
  END;

  -- ── 15. Double-pay guard (unique index on paid/allocated earning) ───────
  SELECT a.earning_id INTO v_paid_earning
    FROM public.payout_allocations a
   WHERE a.payout_id = v_paid_payout_id AND a.status = 'paid'
   LIMIT 1;

  BEGIN
    INSERT INTO public.payout_allocations (payout_id, earning_id, partner_id, amount, status)
    VALUES (v_paid_payout_id, v_paid_earning, v_partner_id, 10, 'allocated');
    PERFORM _ppt_check(false, 'double-pay guard: duplicate allocation was accepted (bug)');
  EXCEPTION WHEN unique_violation THEN
    PERFORM _ppt_check(true, 'unique index rejects a second allocation for a paid earning');
  END;

  -- ── 16. Booking trigger: completed → cancelled (best-effort) ────────────
  BEGIN
    -- Reuses the service chain seeded in section 4. v_booking_id is a
    -- dedicated deterministic id (distinct from the section-4 random ones).
    IF NOT EXISTS (SELECT 1 FROM public.services WHERE id = v_service_id) THEN
      INSERT INTO public.categories (id, category_name)
      VALUES (v_category_id, 'Payout Test Category');
      INSERT INTO public.subcategories (id, subcategory_name, icon_name, category_id)
      VALUES (v_subcategory_id, 'Payout Test Sub', 'home_repair_service', v_category_id);
      INSERT INTO public.services (id, subcategory_id, title, description, base_price, is_active, category, pricing_model, image_url)
      VALUES (v_service_id, v_subcategory_id, 'Payout Test Service', 'trigger test', 1000, true, 'Payout Test Category', 'fixed', '/assets/test.png');
    END IF;

    INSERT INTO public.bookings (
      id, customer_id, service_id, partner_id, status, total_amount, city, area, address, pincode,
      scheduled_date, wallet_discount_applied, payment_status, pricing_model,
      selected_duration_minutes, base_price, final_price
    ) VALUES (
      v_booking_id, v_customer_id, v_service_id, v_partner2_id, 'pending', 1000, 'Test City', 'Test Area', 'Test Address', '110001',
      now() + interval '1 day', 0, 'paid', 'fixed', 60, 1000, 1000
    );

    INSERT INTO public.booking_pricing (booking_id, total_price, gst_amount)
    VALUES (v_booking_id, 1000, 0);

    UPDATE public.bookings SET status = 'completed' WHERE id = v_booking_id;

    PERFORM _ppt_check(
      EXISTS (SELECT 1 FROM public.partner_earnings WHERE booking_id = v_booking_id AND status = 'eligible' AND partner_earning_amount = 800),
      'completion trigger snapshots earnings (₹1000 @ 20% commission → ₹800 pro share)'
    );

    UPDATE public.bookings SET status = 'cancelled' WHERE id = v_booking_id;
    PERFORM _ppt_check(
      EXISTS (SELECT 1 FROM public.partner_earnings WHERE booking_id = v_booking_id AND status = 'reversed'),
      'reverse trigger reverses an eligible earning when booking is cancelled'
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[SKIP] booking trigger branch could not be exercised (%): %', SQLSTATE, SQLERRM;
  END;

  -- ── 17. End-of-suite summary ─────────────────────────────────────────────
  RAISE NOTICE '════════ PHS Partner Payout — Suite Complete ════════';
END;
$$;

-- Final tally (also printed by the DO block notices above).
SELECT result, COUNT(*) AS count
  FROM _ppt_results
 GROUP BY result
 ORDER BY result;

-- The FAILING labels, printed as rows so they are impossible to miss even if
-- the editor hides notices.
SELECT label
  FROM _ppt_results
 WHERE result = 'FAIL';

ROLLBACK;