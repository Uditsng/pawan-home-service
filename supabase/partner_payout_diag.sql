-- ═══════════════════════════════════════════════════════════════════════════
-- PHS Partner Payout harness — step-by-step DIAGNOSTIC
--
-- Runs each seeding step in its own savepoint and prints one clear line per
-- step. Paste the whole output (the [DIAG-n ...] lines) back to diagnose.
-- Everything is rolled back at the end; nothing persists.
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

DO $$
DECLARE
  v_admin        UUID := '10000000-0000-4000-8000-0000000000a1';
  v_pro1         UUID := '10000000-0000-4000-8000-0000000000b1';
  v_pro2         UUID := '10000000-0000-4000-8000-0000000000b2';
  v_cust         UUID := '10000000-0000-4000-8000-0000000000c1';
  v_cat          UUID := '10000000-0000-4000-8000-0000000000e1';
  v_sub          UUID := '10000000-0000-4000-8000-0000000000e2';
  v_svc          UUID := '10000000-0000-4000-8000-0000000000e3';
  v_book         UUID := '10000000-0000-4000-8000-0000000000d1';
  v_emails       TEXT[] := ARRAY['payout.admin.test@phs.test','payout.pro1.test@phs.test','payout.pro2.test@phs.test','payout.customer.test@phs.test'];
  v_leak_count   INT;
BEGIN
  RAISE NOTICE '════ DIAG START ════';

  -- Step 0: how many leaked rows already exist? (earlier aborted runs)
  SELECT COUNT(*) INTO v_leak_count FROM public.profiles WHERE email = ANY(v_emails);
  RAISE NOTICE '[DIAG-0] leaked test profiles found: %', v_leak_count;

  -- Step 1: clean auth.users
  BEGIN
    DELETE FROM auth.users WHERE email = ANY(v_emails);
    RAISE NOTICE '[DIAG-1 OK] auth.users cleanup';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[DIAG-1 FAIL] % : %', SQLSTATE, SQLERRM;
  END;

  -- Step 2: clean profiles
  BEGIN
    DELETE FROM public.profiles WHERE email = ANY(v_emails);
    RAISE NOTICE '[DIAG-2 OK] profiles cleanup';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[DIAG-2 FAIL] % : %', SQLSTATE, SQLERRM;
  END;

  -- Step 3: insert auth.users
  BEGIN
    INSERT INTO auth.users
      (id, instance_id, aud, role, email, phone, encrypted_password, email_confirmed_at, created_at, updated_at)
    VALUES
      (v_admin, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'payout.admin.test@phs.test',    '9999900100', 'x', now(), now(), now()),
      (v_pro1,  '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'payout.pro1.test@phs.test',     '9999900101', 'x', now(), now(), now()),
      (v_pro2,  '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'payout.pro2.test@phs.test',     '9999900102', 'x', now(), now(), now()),
      (v_cust,  '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'payout.customer.test@phs.test', '9999900103', 'x', now(), now(), now());
    RAISE NOTICE '[DIAG-3 OK] auth.users inserted';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[DIAG-3 FAIL] % : %', SQLSTATE, SQLERRM;
  END;

  -- Step 4: insert profiles
  BEGIN
    INSERT INTO public.profiles (id, email, phone, full_name, role, status)
    VALUES
      (v_admin, 'payout.admin.test@phs.test',    '9999900100', 'Payout Admin',    'admin',    'active'),
      (v_pro1,  'payout.pro1.test@phs.test',     '9999900101', 'Payout Pro One',  'partner',  'active'),
      (v_pro2,  'payout.pro2.test@phs.test',     '9999900102', 'Payout Pro Two',  'partner',  'active'),
      (v_cust,  'payout.customer.test@phs.test', '9999900103', 'Payout Customer', 'customer', 'active');
    RAISE NOTICE '[DIAG-4 OK] profiles inserted';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[DIAG-4 FAIL] % : %', SQLSTATE, SQLERRM;
  END;

  -- Step 5: service chain
  BEGIN
    INSERT INTO public.categories (id, category_name) VALUES (v_cat, 'Payout Test Category');
    INSERT INTO public.subcategories (id, subcategory_name, icon_name, category_id) VALUES (v_sub, 'Payout Test Sub', 'home_repair_service', v_cat);
    INSERT INTO public.services (id, subcategory_id, title, description, base_price, is_active, category, pricing_model, image_url)
    VALUES (v_svc, v_sub, 'Payout Test Service', 'trigger test', 1000, true, 'Payout Test Category', 'fixed', '/assets/test.png');
    RAISE NOTICE '[DIAG-5 OK] category/subcategory/service inserted';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[DIAG-5 FAIL] % : %', SQLSTATE, SQLERRM;
  END;

  -- Step 6: one booking + pricing + completion trigger
  BEGIN
    INSERT INTO public.bookings (
      id, customer_id, service_id, partner_id, status, total_amount,
      city, area, address, pincode, scheduled_date, wallet_discount_applied,
      payment_status, pricing_model, selected_duration_minutes, base_price, final_price
    ) VALUES (
      v_book, v_cust, v_svc, v_pro2, 'pending', 1000,
      'Test City', 'Test Area', 'Test Address', '110001', now(), 0,
      'paid', 'fixed', 60, 1000, 1000
    );
    INSERT INTO public.booking_pricing (booking_id, total_price, gst_amount) VALUES (v_book, 1000, 0);
    UPDATE public.bookings SET status = 'completed' WHERE id = v_book;
    RAISE NOTICE '[DIAG-6 OK] booking created + completed → earnings written';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[DIAG-6 FAIL] % : %', SQLSTATE, SQLERRM;
  END;

  RAISE NOTICE '════ DIAG END ════';
END;
$$;

ROLLBACK;