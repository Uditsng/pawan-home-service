-- ═══════════════════════════════════════════════════════════════
-- Migration: Invoicing System V1 Hardening
-- Created: 2026-07-06
-- ═══════════════════════════════════════════════════════════════

-- 1. Alter public.invoices table to add snapshot column
ALTER TABLE public.invoices 
  ADD COLUMN IF NOT EXISTS snapshot JSONB DEFAULT NULL;

-- 2. Alter public.bookings table to add business billing columns
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS business_name TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS business_gstin TEXT DEFAULT NULL;

-- 3. Seed default company settings in public.platform_settings table
INSERT INTO public.platform_settings (key, value)
VALUES (
  'invoice_company_profile',
  '{
    "company_name": "PHS Cleaning Company",
    "legal_name": "PHS Cleaning Company Private Limited",
    "logo_url": "/PHS.png",
    "gst_number": "05AAACP9876M1ZX",
    "support_phone": "+91 98765 43210",
    "support_email": "support@phs.com",
    "website": "www.phs.com",
    "address": "123, Premium Heights, Civil Lines, Dehradun, Uttarakhand - 248001",
    "tagline": "Professional Home Services",
    "footer_text": "Thank you for choosing PHS Cleaning Company. We value your business!"
  }'::jsonb
)
ON CONFLICT (key) DO NOTHING;

-- 4. Recreate trigger function assign_invoice_number with snapshot compiler fallback
CREATE OR REPLACE FUNCTION public.assign_invoice_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  seq_val            INT;
  year_val           TEXT;
  v_cust_name        TEXT;
  v_cust_phone       TEXT;
  v_cust_email       TEXT;
  v_part_name        TEXT;
  v_booking_record   RECORD;
  v_company_profile  JSONB;
  v_line_items       JSONB;
  v_discounts        JSONB;
  v_discount_amt     NUMERIC;
BEGIN
  -- Assign invoice number if not already present
  IF NEW.invoice_number IS NULL THEN
    seq_val := nextval('public.invoice_number_seq');
    year_val := to_char(now(), 'YYYY');
    NEW.invoice_number := 'PHS-' || year_val || '-' || lpad(seq_val::text, 6, '0');
  END IF;

  -- Auto-generate snapshot if NULL (e.g. database trigger auto-creates invoice on completed booking)
  IF NEW.snapshot IS NULL THEN
    -- Fetch booking and service details
    SELECT b.*, s.title as service_title, c.category_name
    INTO v_booking_record
    FROM public.bookings b
    LEFT JOIN public.services s ON b.service_id = s.id
    LEFT JOIN public.subcategories sub ON s.subcategory_id = sub.id
    LEFT JOIN public.categories c ON sub.category_id = c.id
    WHERE b.id = NEW.booking_id;

    IF FOUND THEN
      -- Fetch customer details
      SELECT full_name, phone, email INTO v_cust_name, v_cust_phone, v_cust_email 
      FROM public.profiles WHERE id = NEW.customer_id;

      -- Fetch partner details
      IF NEW.partner_id IS NOT NULL THEN
        SELECT full_name INTO v_part_name 
        FROM public.profiles WHERE id = NEW.partner_id;
      END IF;

      -- Fetch company profile
      SELECT value INTO v_company_profile FROM public.platform_settings WHERE key = 'invoice_company_profile' LIMIT 1;
      IF v_company_profile IS NULL THEN
        v_company_profile := '{
          "company_name": "PHS Cleaning Company",
          "legal_name": "PHS Cleaning Company Private Limited",
          "logo_url": "/PHS.png",
          "gst_number": "05AAACP9876M1ZX",
          "support_phone": "+91 98765 43210",
          "support_email": "support@phs.com",
          "website": "www.phs.com",
          "address": "123, Premium Heights, Civil Lines, Dehradun, Uttarakhand - 248001",
          "tagline": "Professional Home Services",
          "footer_text": "Thank you for choosing PHS Cleaning Company. We value your business!"
        }'::jsonb;
      END IF;

      -- Build main service line item
      v_line_items := jsonb_build_array(
        jsonb_build_object(
          'description', COALESCE(v_booking_record.service_title, 'Home Service'),
          'quantity', 1,
          'unit_price', NEW.subtotal + NEW.discount_amount,
          'discount', NEW.discount_amount,
          'tax', NEW.tax_amount,
          'total', NEW.grand_total
        )
      );

      -- Build discount breakdown from database fields
      v_discount_amt := COALESCE(NEW.discount_amount, 0);
      IF v_discount_amt > 0 THEN
        v_discounts := jsonb_build_object(
          'wallet', v_discount_amt
        );
      ELSE
        v_discounts := '{}'::jsonb;
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
