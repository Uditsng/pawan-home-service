-- ════════════════════════════════════════════════════════════════════════════
-- Migration: Fix Wallet Discount Persistence & Multi-Service Allocation (BUG-07)
-- File: 20261002010000_fix_wallet_discount_persistence.sql
--
-- Problems Addressed:
--   1. Orders table lacked a `wallet_discount` column, causing order-level wallet
--      deductions to be lost from the authoritative orders snapshot.
--   2. Multi-service checkouts did not allocate the order's debited wallet amount
--      across child bookings, resulting in `booking_pricing.wallet_discount = 0`
--      and `bookings.wallet_discount_applied = 0` across all line items.
--   3. Partner earning trigger on completion (`handle_partner_earning_on_complete`)
--      calculated service revenue solely on `total_price` without restoring the
--      wallet payment portion. Because wallet is a customer payment method funded
--      to the platform (not a provider discount), partners were unfairly penalized
--      or shortchanged when customers paid using digital wallet balance.
--   4. Cancellation refunds and invoices failed to recognize wallet payments due
--      to the 0-value fields.
--
-- Remediation:
--   1. Schema:
--      - Add `wallet_discount NUMERIC(10, 2) NOT NULL DEFAULT 0` to `orders`.
--   2. Partner Completion Trigger:
--      - Restore wallet payment portion `COALESCE(bp.wallet_discount, NEW.wallet_discount_applied, 0)`
--        to the gross service value before subtracting GST, ensuring partners earn
--        their full commission regardless of customer payment method (Card/UPI/Wallet).
--   3. Historical Backfill:
--      - Backfill `orders.wallet_discount`, `bookings.wallet_discount_applied`, and
--        `booking_pricing.wallet_discount` from historical `wallet_transactions`.
-- ════════════════════════════════════════════════════════════════════════════

-- ─── 1. SCHEMA ENHANCEMENT ───────────────────────────────────────────────────

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS wallet_discount NUMERIC(10, 2) NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_orders_wallet_discount
  ON public.orders (wallet_discount)
  WHERE wallet_discount > 0;


-- ─── 2. UPDATE COMPLETION TRIGGER FUNCTION ───────────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_partner_earning_on_complete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_amount        NUMERIC(10, 2);
  v_gst_amount          NUMERIC(10, 2);
  v_wallet_discount     NUMERIC(10, 2);
  v_gross_service_value NUMERIC(10, 2);
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

  -- Fetch pricing breakdown snapshot
  SELECT COALESCE(bp.total_price, NEW.total_amount, 0),
         COALESCE(bp.gst_amount, 0),
         COALESCE(bp.wallet_discount, NEW.wallet_discount_applied, 0)
    INTO v_total_amount, v_gst_amount, v_wallet_discount
    FROM public.booking_pricing bp
   WHERE bp.booking_id = NEW.id;

  IF v_total_amount IS NULL THEN
    v_total_amount    := COALESCE(NEW.total_amount, 0);
    v_gst_amount      := 0;
    v_wallet_discount := COALESCE(NEW.wallet_discount_applied, 0);
  END IF;

  -- The gross service value is the payable amount plus any wallet payment
  -- (since wallet is a customer payment method funded to the platform, not a provider discount).
  v_gross_service_value := v_total_amount + COALESCE(v_wallet_discount, 0);
  v_service_revenue     := GREATEST(0, v_gross_service_value - COALESCE(v_gst_amount, 0));
  v_platform_commission := ROUND(v_service_revenue * (v_commission_percent / 100), 2);
  v_partner_earning     := ROUND(v_service_revenue * ((100 - v_commission_percent) / 100), 2);
  v_completed_at        := COALESCE(NEW.completed_at, NEW.service_completed_at, NEW.created_at, now());

  -- 1. Compute physical cash collected by partner in hand
  v_payment_method := COALESCE(NULLIF(TRIM(NEW.payment_method), ''), 'Online');
  IF LOWER(v_payment_method) = 'cash' THEN
    -- On cash bookings, the partner collects NEW.total_amount in cash (wallet was deducted online)
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
    -- Pure online or wallet booking (0 cash collected by partner in hand)
    -- Platform holds 100% of the funds, partner is fully eligible for platform withdrawal.
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
    NEW.id, NEW.partner_id, v_gross_service_value, COALESCE(v_gst_amount, 0), v_service_revenue,
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


-- ─── 3. HISTORICAL DATA RECONCILIATION / BACKFILL ────────────────────────────

-- 3.1 Backfill orders.wallet_discount from wallet_transactions
UPDATE public.orders o
   SET wallet_discount = wt.total_wallet_used
  FROM (
    SELECT reference_id, SUM(amount) AS total_wallet_used
      FROM public.wallet_transactions
     WHERE source = 'booking_discount'
     GROUP BY reference_id
  ) wt
 WHERE o.id = wt.reference_id
   AND o.wallet_discount = 0;

-- 3.2 Backfill legacy single-service bookings where reference_id was the booking_id
UPDATE public.bookings b
   SET wallet_discount_applied = wt.total_wallet_used
  FROM (
    SELECT reference_id, SUM(amount) AS total_wallet_used
      FROM public.wallet_transactions
     WHERE source = 'booking_discount'
     GROUP BY reference_id
  ) wt
 WHERE b.id = wt.reference_id
   AND (b.wallet_discount_applied IS NULL OR b.wallet_discount_applied = 0);

-- 3.3 Sync booking_pricing.wallet_discount with bookings.wallet_discount_applied
UPDATE public.booking_pricing bp
   SET wallet_discount = b.wallet_discount_applied
  FROM public.bookings b
 WHERE bp.booking_id = b.id
   AND b.wallet_discount_applied > 0
   AND (bp.wallet_discount IS NULL OR bp.wallet_discount = 0);
