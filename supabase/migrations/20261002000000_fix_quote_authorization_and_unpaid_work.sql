-- ════════════════════════════════════════════════════════════════════════════
-- Migration: Fix Quote Authorization, Unpaid Extra Work & Cash Settlements (BUG-08)
-- File: 20261002000000_fix_quote_authorization_and_unpaid_work.sql
--
-- Problems Addressed:
--   1. Quote Authorization & RLS Vulnerabilities:
--      - Public RLS allowed any authenticated partner to INSERT quotes for ANY booking.
--      - Public RLS allowed partners/customers to UPDATE quotes without WITH CHECK
--        restrictions (e.g. self-approving or modifying total_amount).
--      - Public RLS allowed direct manipulation of booking_quote_items.
--   2. Unpaid Extra Work & Inspection Quote Financial Leak:
--      - Inspection base fees paid online (e.g. ₹99) followed by quotes (e.g. ₹2,500)
--        were approved without payment gateway or cash collection tracking.
--      - Setting bookings.payment_status = 'partially_paid' threw a DB check constraint violation.
--      - Partner completion flow did not prompt for or verify quote cash collections.
--      - Partner completion trigger did not account for quote cash collections when
--        computing partner earnings and platform commission clawbacks.
--
-- Remediation:
--   1. Schema Enhancements:
--      - bookings: add `unpaid_quote_amount` NUMERIC(10, 2) NOT NULL DEFAULT 0.
--      - bookings.payment_status: update CHECK constraint to permit 'partially_paid'.
--      - booking_quotes: add `payment_method`, `payment_status`, `razorpay_order_id`,
--        `razorpay_payment_id`, and `paid_at`.
--   2. Strict RLS Hardening:
--      - booking_quotes & booking_quote_items: strictly SELECT-only for authenticated clients.
--      - Drop all client INSERT/UPDATE/DELETE policies. Writes are restricted to
--        trusted server actions (admin client) with authorization checks.
--   3. Partner Completion Trigger Enhancement:
--      - Computes physical cash collected across base booking and paid cash quotes.
--      - Accurately tracks partner earnings status and platform commission clawbacks.
-- ════════════════════════════════════════════════════════════════════════════

-- ─── 1. SCHEMA ENHANCEMENTS ──────────────────────────────────────────────────

-- 1.1 Update bookings.payment_status CHECK constraint to permit 'partially_paid'
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT tc.constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.constraint_column_usage ccu
      ON tc.constraint_name = ccu.constraint_name
     AND tc.table_schema = ccu.table_schema
    WHERE tc.table_schema = 'public'
      AND tc.table_name = 'bookings'
      AND ccu.column_name = 'payment_status'
      AND tc.constraint_type = 'CHECK'
  ) LOOP
    EXECUTE 'ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS ' || quote_ident(r.constraint_name);
  END LOOP;
END $$;

ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_payment_status_check
  CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded', 'partially_paid'));

-- 1.2 Add unpaid_quote_amount to bookings
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS unpaid_quote_amount NUMERIC(10, 2) NOT NULL DEFAULT 0;

-- 1.3 Add payment tracking columns to booking_quotes
ALTER TABLE public.booking_quotes
  ADD COLUMN IF NOT EXISTS payment_method TEXT CHECK (payment_method IN ('Online', 'Cash')),
  ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed')),
  ADD COLUMN IF NOT EXISTS razorpay_order_id TEXT,
  ADD COLUMN IF NOT EXISTS razorpay_payment_id TEXT,
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_booking_quotes_booking_status
  ON public.booking_quotes (booking_id, status);

CREATE INDEX IF NOT EXISTS idx_booking_quotes_payment
  ON public.booking_quotes (booking_id, payment_method, payment_status);


-- ─── 2. RLS SECURITY HARDENING ───────────────────────────────────────────────

-- Ensure RLS is active
ALTER TABLE public.booking_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_quote_items ENABLE ROW LEVEL SECURITY;

-- Drop all old permissive policies on booking_quotes
DROP POLICY IF EXISTS "Users can select own booking_quotes" ON public.booking_quotes;
DROP POLICY IF EXISTS "Pros and Admins can insert booking_quotes" ON public.booking_quotes;
DROP POLICY IF EXISTS "Users can update own booking_quotes" ON public.booking_quotes;

-- Create read-only SELECT policy on booking_quotes
-- Customers can view quotes for their bookings; assigned pros can view quotes for their jobs; admins can view all.
CREATE POLICY "booking_quotes_select_policy" ON public.booking_quotes
  FOR SELECT
  USING (
    customer_id = auth.uid()
    OR professional_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_quotes.booking_id
        AND (b.customer_id = auth.uid() OR b.partner_id = auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Drop all old policies on booking_quote_items
DROP POLICY IF EXISTS "Users can select own booking_quote_items" ON public.booking_quote_items;
DROP POLICY IF EXISTS "Pros and Admins can manage booking_quote_items" ON public.booking_quote_items;

-- Create read-only SELECT policy on booking_quote_items
CREATE POLICY "booking_quote_items_select_policy" ON public.booking_quote_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.booking_quotes bq
      WHERE bq.id = booking_quote_items.quote_id
        AND (
          bq.customer_id = auth.uid()
          OR bq.professional_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.bookings b
            WHERE b.id = bq.booking_id
              AND (b.customer_id = auth.uid() OR b.partner_id = auth.uid())
          )
          OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'admin'
          )
        )
    )
  );

-- No INSERT, UPDATE, or DELETE policies exist for booking_quotes and booking_quote_items.
-- All write operations are restricted to server-side privileged admin actions.


-- ─── 3. ENHANCE COMPLETION TRIGGER (QUOTE CASH SETTLEMENTS) ──────────────────

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
  v_earning_status      VARCHAR(20);
  v_payment_method      VARCHAR(30);
  v_earning_id          UUID;

  -- Cash collection breakdown
  v_base_cash           NUMERIC(10, 2) := 0;
  v_quotes_cash         NUMERIC(10, 2) := 0;
  v_cash_collected      NUMERIC(10, 2) := 0;
  v_is_cash             BOOLEAN := FALSE;
  v_clawback_amount     NUMERIC(10, 2) := 0;
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

  -- 1. Compute physical cash collected by partner in hand
  v_payment_method := COALESCE(NULLIF(TRIM(NEW.payment_method), ''), 'Online');
  IF LOWER(v_payment_method) = 'cash' THEN
    v_base_cash := v_total_amount;
  ELSE
    v_base_cash := 0;
  END IF;

  -- Add approved and paid cash quotes
  SELECT COALESCE(SUM(total_amount), 0)
    INTO v_quotes_cash
    FROM public.booking_quotes
   WHERE booking_id = NEW.id
     AND status = 'approved'
     AND payment_method = 'Cash'
     AND payment_status = 'paid';

  -- Total physical cash collected by the partner
  v_cash_collected := LEAST(v_total_amount, v_base_cash + v_quotes_cash);

  -- 2. Determine partner earning status and clawback obligations
  IF v_cash_collected >= v_partner_earning THEN
    -- Partner collected 100% of their earnings in cash (and collected platform commission in cash)
    v_earning_status  := 'paid';
    v_is_cash         := TRUE;
    v_clawback_amount := v_cash_collected - v_partner_earning;
  ELSIF v_cash_collected > 0 THEN
    -- Partner collected some cash, but less than their total earning.
    -- Earning is marked 'eligible' for the full earning, and a clawback adjustment is recorded
    -- for the cash amount already collected so net payout = (v_partner_earning - v_cash_collected).
    v_earning_status  := 'eligible';
    v_is_cash         := FALSE;
    v_clawback_amount := v_cash_collected;
  ELSE
    -- Pure online booking (0 cash collected by partner)
    v_earning_status  := 'eligible';
    v_is_cash         := FALSE;
    v_clawback_amount := 0;
  END IF;

  -- 3. Record or update partner earning
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

  -- 4. Record pending clawback for cash collections due to platform
  IF v_clawback_amount > 0 THEN
    INSERT INTO public.payout_adjustments (
      payout_id, partner_id, booking_id, kind, amount, reason, status, actor_id
    ) VALUES (
      NULL,
      NEW.partner_id,
      NEW.id,
      'clawback',
      -v_clawback_amount,
      'Platform commission / cash settlement for booking #' || SUBSTRING(NEW.id::text, 1, 8),
      'pending',
      NULL
    )
    ON CONFLICT (booking_id, kind) WHERE booking_id IS NOT NULL DO UPDATE SET
      amount     = -v_clawback_amount,
      partner_id = EXCLUDED.partner_id
    WHERE payout_adjustments.status = 'pending';
  END IF;

  RETURN NEW;
END;
$$;
