-- ═══════════════════════════════════════════════════════════════
-- Fix: completion rolls back when booking_pricing row is missing
-- Created: 2026-10-29
--
-- Root cause:
--   tr_create_invoice_on_completion() reads the discount stack with
--   `SELECT ... INTO v_coupon, v_wallet, v_manual, v_offer
--      FROM public.booking_pricing WHERE booking_id = NEW.id;`
--   When no booking_pricing row exists (legacy order checkouts), PL/pgSQL
--   sets all four targets to NULL. v_discount then stays NULL, which makes
--   v_subtotal / v_tax_amount NULL, and the INSERT into public.invoices
--   violates NOT NULL on subtotal/tax_amount/discount_amount. Because the
--   trigger runs inside the same transaction as the status change, the whole
--   "mark as completed" UPDATE is rolled back (23502). This silently blocked
--   admin force-complete AND partner completion for those bookings.
--
-- Fix:
--   1. Make the invoice trigger NULL-safe for every amount it writes.
--   2. Backfill the missing booking_pricing rows so invoices and the admin
--      pricing drawer have real numbers (idempotent).
-- ═══════════════════════════════════════════════════════════════

-- ─── 1. NULL-safe invoice trigger ───────────────────────────────
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
  v_total_amount     NUMERIC(10, 2);
  v_discount         NUMERIC(10, 2) := 0;
  v_payment_method   TEXT           := 'Cash';
  v_transaction_id   TEXT           := '';
  v_tax_val          TEXT;
  v_gst_enabled      BOOLEAN;
  v_coupon           NUMERIC(10, 2) := 0;
  v_wallet           NUMERIC(10, 2) := 0;
  v_manual           NUMERIC(10, 2) := 0;
  v_offer            NUMERIC(10, 2) := 0;
BEGIN
  IF NEW.status = 'completed'
     AND (OLD.status IS DISTINCT FROM 'completed')
     AND NEW.completion_otp_verified = true
  THEN
    IF EXISTS (SELECT 1 FROM public.invoices WHERE booking_id = NEW.id) THEN
      RETURN NEW;
    END IF;

    v_total_amount := COALESCE(NEW.total_amount, 0);

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

    -- Extract full discount stack: coupon + offer + wallet (manual edits
    -- remain the explicit override). bookings.total_amount is stored after
    -- ALL of these were deducted, so the back-calculation must include offer.
    -- A missing booking_pricing row leaves every target NULL, so each value
    -- is coalesced back to 0 (legacy/order bookings may have no pricing row).
    SELECT
      COALESCE(coupon_discount, 0),
      COALESCE(wallet_discount, 0),
      COALESCE(discount_amount, 0),
      COALESCE(offer_discount, 0)
    INTO v_coupon, v_wallet, v_manual, v_offer
    FROM public.booking_pricing
    WHERE booking_id = NEW.id;

    v_coupon := COALESCE(v_coupon, 0);
    v_wallet := COALESCE(v_wallet, 0);
    v_manual := COALESCE(v_manual, 0);
    v_offer  := COALESCE(v_offer, 0);

    v_discount := v_manual;
    IF v_discount = 0 THEN v_discount := v_coupon + v_wallet + v_offer; END IF;
    IF v_discount = 0 THEN v_discount := COALESCE(NEW.wallet_discount_applied, 0); END IF;
    v_discount := COALESCE(v_discount, 0);

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

    -- Payment method: wallet-only orders have no Razorpay payment row, so
    -- label them "Wallet" instead of falling through to a misleading "Cash".
    IF v_payment_method IS NULL THEN
      IF COALESCE(NEW.wallet_discount_applied, 0) > 0
         AND v_total_amount <= COALESCE(NEW.wallet_discount_applied, 0) THEN
        v_payment_method := 'Wallet';
      ELSE
        v_payment_method := COALESCE(NEW.payment_method, 'Cash');
      END IF;
    END IF;

    v_tax_rate := COALESCE(v_tax_rate, 18.00);

    v_subtotal   := ROUND((v_total_amount + v_discount) / (1 + (v_tax_rate / 100.0)), 2);
    v_tax_amount := ROUND((v_total_amount + v_discount) - v_subtotal, 2);

    -- Defensive: never let a NULL reach a NOT NULL invoice column.
    v_subtotal     := COALESCE(v_subtotal, 0);
    v_tax_amount   := COALESCE(v_tax_amount, 0);
    v_discount     := COALESCE(v_discount, 0);

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
      v_total_amount,
      'paid',
      v_payment_method,
      v_transaction_id
    );
  END IF;
  RETURN NEW;
END;
$$;

-- ─── 2. Backfill missing booking_pricing rows (idempotent) ──────
-- Legacy order checkouts created bookings without a pricing row. Without it
-- the admin pricing drawer shows "not available" and the payout trigger relies
-- on its fallback. total_price mirrors the final booking amount (gst 0), which
-- is exactly what the payout fallback assumes.
INSERT INTO public.booking_pricing (booking_id, base_price, total_price)
SELECT b.id, COALESCE(b.total_amount, 0), COALESCE(b.total_amount, 0)
FROM public.bookings b
WHERE NOT EXISTS (
  SELECT 1 FROM public.booking_pricing bp WHERE bp.booking_id = b.id
)
ON CONFLICT (booking_id) DO NOTHING;
