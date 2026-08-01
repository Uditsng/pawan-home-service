-- ═══════════════════════════════════════════════════════════════
-- Migration: Fix Invoice Triggers V2 (Tax, GST flag, Discounts, Snapshot)
-- Created: 2026-08-01
-- Fixes (from invoice redesign audit):
--   1. tax lookup used `value->>0` on a JSON string, which returns NULL
--      (scalar element extraction) -> tax_rate always fell back to 18%.
--   2. `gst_enabled` platform setting was ignored -> tax applied even when GST disabled.
--   3. Coupon / manual discounts (booking_pricing) were ignored; only
--      bookings.wallet_discount_applied was used.
--   4. assign_invoice_number lost its snapshot compiler in the 2026-07-26
--      SECURITY DEFINER fix -> invoices created by the completion trigger
--      had snapshot = NULL (no real category, no discounts breakdown).
-- ═══════════════════════════════════════════════════════════════

-- 1. Recreate assign_invoice_number with restored snapshot compiler.
--    Also injects the generated invoice_number into any provided snapshot.
CREATE OR REPLACE FUNCTION public.assign_invoice_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  seq_val            INT;
  year_val           TEXT;
  v_booking_record   RECORD;
  v_cust_name        TEXT;
  v_cust_phone       TEXT;
  v_cust_email       TEXT;
  v_part_name        TEXT;
  v_company_profile  JSONB;
  v_line_items       JSONB;
  v_discounts        JSONB;
  v_coupon           NUMERIC(10, 2) := 0;
  v_wallet           NUMERIC(10, 2) := 0;
  v_manual           NUMERIC(10, 2) := 0;
BEGIN
  -- Assign invoice number if not already present
  IF NEW.invoice_number IS NULL THEN
    seq_val := nextval('public.invoice_number_seq');
    year_val := to_char(now(), 'YYYY');
    NEW.invoice_number := 'PHS-' || year_val || '-' || lpad(seq_val::text, 6, '0');
  END IF;

  -- Ensure the snapshot (if provided by the app) carries the invoice number
  IF NEW.snapshot IS NOT NULL AND NEW.invoice_number IS NOT NULL THEN
    NEW.snapshot := jsonb_set(NEW.snapshot, '{invoice_number}', to_jsonb(NEW.invoice_number));
  END IF;

  -- Auto-generate snapshot if NULL (e.g. database trigger auto-creates invoice on completed booking)
  IF NEW.snapshot IS NULL THEN
    SELECT b.*, s.title AS service_title, c.category_name
    INTO v_booking_record
    FROM public.bookings b
    LEFT JOIN public.services s ON b.service_id = s.id
    LEFT JOIN public.subcategories sub ON s.subcategory_id = sub.id
    LEFT JOIN public.categories c ON sub.category_id = c.id
    WHERE b.id = NEW.booking_id;

    IF FOUND THEN
      SELECT full_name, phone, email INTO v_cust_name, v_cust_phone, v_cust_email
      FROM public.profiles WHERE id = NEW.customer_id;

      IF NEW.partner_id IS NOT NULL THEN
        SELECT full_name INTO v_part_name FROM public.profiles WHERE id = NEW.partner_id;
      END IF;

      SELECT value INTO v_company_profile
      FROM public.platform_settings WHERE key = 'invoice_company_profile' LIMIT 1;
      IF v_company_profile IS NULL THEN
        v_company_profile := '{
          "company_name": "PHS Cleaning Company",
          "legal_name": "PHS Cleaning Company",
          "logo_url": "/PHS.png",
          "gst_number": "05AAACP9876M1ZX",
          "support_phone": "+917408702019",
          "support_email": "phscustomercare15@gmail.com",
          "website": "https://www.phscleaningcompany.com",
          "address": "Kanpur Nagar, Uttar Pradesh, India",
          "tagline": "Professional Home Services at Your Doorstep",
          "footer_text": "Thank you for choosing PHS Cleaning Company. We appreciate your trust and look forward to serving you again."
        }'::jsonb;
      END IF;

      -- Fetch discount breakdown from booking_pricing
      SELECT
        COALESCE(coupon_discount, 0),
        COALESCE(wallet_discount, 0),
        COALESCE(discount_amount, 0)
      INTO v_coupon, v_wallet, v_manual
      FROM public.booking_pricing
      WHERE booking_id = NEW.booking_id;

      -- Build main service line item with real category
      v_line_items := jsonb_build_array(
        jsonb_build_object(
          'description', COALESCE(v_booking_record.service_title, 'Home Service'),
          'quantity', 1,
          'unit_price', NEW.subtotal + NEW.discount_amount,
          'discount', NEW.discount_amount,
          'tax', NEW.tax_amount,
          'total', NEW.grand_total,
          'meta', jsonb_build_object(
            'category', COALESCE(v_booking_record.category_name, 'Cleaning')
          )
        )
      );

      -- Build discount breakdown
      IF v_coupon > 0 THEN
        v_discounts := jsonb_build_object('coupon', jsonb_build_object('code', 'COUPON', 'amount', v_coupon));
      ELSE
        v_discounts := '{}'::jsonb;
      END IF;
      IF v_wallet > 0 THEN
        v_discounts := v_discounts || jsonb_build_object('wallet', v_wallet);
      END IF;
      IF v_manual > 0 THEN
        v_discounts := v_discounts || jsonb_build_object('manual', v_manual);
      END IF;
      IF v_discounts = '{}'::jsonb AND NEW.discount_amount > 0 THEN
        v_discounts := jsonb_build_object('wallet', NEW.discount_amount);
      END IF;

      -- Compile snapshot
      NEW.snapshot := jsonb_build_object(
        'version', '1.0',
        'invoice_number', NEW.invoice_number,
        'invoice_date', to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
        'financials', jsonb_build_object(
          'subtotal', NEW.subtotal,
          'tax_rate', NEW.tax_rate,
          'tax_amount', NEW.tax_amount,
          'discount_amount', NEW.discount_amount,
          'grand_total', NEW.grand_total,
          'discounts', v_discounts
        ),
        'seller', v_company_profile,
        'customer', jsonb_build_object(
          'id', NEW.customer_id,
          'full_name', COALESCE(v_cust_name, 'Valued Customer'),
          'phone', v_cust_phone,
          'email', v_cust_email,
          'address', v_booking_record.address,
          'city', v_booking_record.city,
          'pincode', v_booking_record.pincode,
          'business_name', v_booking_record.business_name,
          'business_gstin', v_booking_record.business_gstin
        ),
        'partner', CASE WHEN NEW.partner_id IS NOT NULL THEN jsonb_build_object(
          'id', NEW.partner_id,
          'full_name', v_part_name
        ) ELSE NULL END,
        'booking', jsonb_build_object(
          'id', NEW.booking_id,
          'scheduled_date', v_booking_record.scheduled_date,
          'created_at', v_booking_record.created_at,
          'service_title', COALESCE(v_booking_record.service_title, 'Home Service'),
          'category_name', v_booking_record.category_name,
          'pricing_model', COALESCE(v_booking_record.pricing_model, 'fixed'),
          'meeting_location', v_booking_record.meeting_location,
          'destination', v_booking_record.destination,
          'expected_bags', v_booking_record.expected_bags
        ),
        'line_items', v_line_items,
        'payment', jsonb_build_object(
          'method', NEW.payment_method,
          'status', NEW.payment_status,
          'transaction_id', NEW.transaction_id,
          'paid_at', to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
        )
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- 2. Recreate tr_create_invoice_on_completion with fixed tax lookup,
--    gst_enabled handling, and full discount extraction.
CREATE OR REPLACE FUNCTION public.tr_create_invoice_on_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_subtotal         NUMERIC(10, 2);
  v_tax_rate         NUMERIC(5, 2)  := 18.00;
  v_tax_amount       NUMERIC(10, 2);
  v_discount         NUMERIC(10, 2) := 0;
  v_payment_method   TEXT           := 'Cash';
  v_transaction_id   TEXT           := '';
  v_tax_val          TEXT;
  v_gst_enabled      BOOLEAN;
  v_coupon           NUMERIC(10, 2) := 0;
  v_wallet           NUMERIC(10, 2) := 0;
  v_manual           NUMERIC(10, 2) := 0;
BEGIN
  IF NEW.status = 'completed'
     AND (OLD.status IS DISTINCT FROM 'completed')
     AND NEW.completion_otp_verified = true
  THEN
    IF EXISTS (SELECT 1 FROM public.invoices WHERE booking_id = NEW.id) THEN
      RETURN NEW;
    END IF;

    -- Read tax_rate as a JSON string scalar: value#>>'{}' (value->>0 is wrong
    -- for a scalar and always returned NULL -> tax was hardcoded to 18%).
    SELECT (value#>>'{}')::TEXT
    INTO   v_tax_val
    FROM   public.platform_settings
    WHERE  key = 'tax_rate'
    LIMIT  1;

    IF v_tax_val IS NOT NULL THEN
      BEGIN
        v_tax_rate := REPLACE(v_tax_val, '%', '')::NUMERIC;
      EXCEPTION WHEN OTHERS THEN
        v_tax_rate := 18.00;
      END;
    END IF;

    -- Honor gst_enabled: if disabled, no tax on the invoice.
    SELECT COALESCE((value#>>'{}')::BOOLEAN, true)
    INTO   v_gst_enabled
    FROM   public.platform_settings
    WHERE  key = 'gst_enabled'
    LIMIT  1;

    IF v_gst_enabled IS FALSE THEN
      v_tax_rate := 0;
    END IF;

    -- Extract full discount: manual discount_amount, else coupon + wallet,
    -- else legacy bookings.wallet_discount_applied.
    SELECT
      COALESCE(coupon_discount, 0),
      COALESCE(wallet_discount, 0),
      COALESCE(discount_amount, 0)
    INTO v_coupon, v_wallet, v_manual
    FROM public.booking_pricing
    WHERE booking_id = NEW.id;

    v_discount := v_manual;
    IF v_discount = 0 THEN v_discount := v_coupon + v_wallet; END IF;
    IF v_discount = 0 THEN v_discount := COALESCE(NEW.wallet_discount_applied, 0); END IF;

    SELECT
      COALESCE(razorpay_payment_id, ''),
      'Razorpay'
    INTO v_transaction_id, v_payment_method
    FROM public.payments
    WHERE booking_id = NEW.id
       OR (order_id = NEW.order_id AND NEW.order_id IS NOT NULL)
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_transaction_id IS NULL OR v_transaction_id = '' THEN
      v_transaction_id := 'TXN-' || UPPER(SUBSTRING(NEW.id::text, 1, 8));
    END IF;

    IF v_payment_method IS NULL THEN
      v_payment_method := COALESCE(NEW.payment_method, 'Cash');
    END IF;

    v_subtotal   := ROUND((NEW.total_amount + v_discount) / (1 + (v_tax_rate / 100.0)), 2);
    v_tax_amount := ROUND((NEW.total_amount + v_discount) - v_subtotal, 2);

    INSERT INTO public.invoices (
      booking_id,
      customer_id,
      partner_id,
      subtotal,
      tax_rate,
      tax_amount,
      discount_amount,
      grand_total,
      payment_status,
      payment_method,
      transaction_id
    ) VALUES (
      NEW.id,
      NEW.customer_id,
      NEW.partner_id,
      v_subtotal,
      v_tax_rate,
      v_tax_amount,
      v_discount,
      NEW.total_amount,
      'paid',
      v_payment_method,
      v_transaction_id
    );
  END IF;
  RETURN NEW;
END;
$$;
