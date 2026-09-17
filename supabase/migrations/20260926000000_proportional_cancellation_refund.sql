-- ════════════════════════════════════════════════════════════════════════════
-- Migration: Proportional cancellation refund + order-fee refund
-- File: 20260926000000_proportional_cancellation_refund.sql
--
-- Two defects in handle_booking_cancellation_refund() (20260920000000):
--
--   1. Platform/order fees (orders.order_fees, e.g. ₹10) were never refunded.
--      They are charged order-level on top of sum(bookings.total_amount)
--      (payableEngine: gross = services + orderFees -> wallet -> Razorpay),
--      but the refund credited only NEW.total_amount. Decision: refund the
--      order fee when the whole order is cancelled within the free window.
--
--   2. Refunds always credited CASH, while wallet checkout debits BONUS first
--      (use_wallet_balance). A customer could convert referral bonus into real
--      cash by booking then immediately cancelling. Fix: refund each booking's
--      value using the order's ORIGINAL cash/bonus/external mix.
--
-- Allocation model (order-level wallet, booking-level refunds):
--   gross        = sum(booking line totals) + order fees
--   walletTotal  = wallet cash_used + bonus_used (actual debit for this order)
--   For a cancelled booking, refundAmount = line total
--                                          + order fees ONLY IF it closes the order
--   wallet slice = walletTotal * refundAmount / gross   (split cash:bonus as debited)
--   cash  slice  = refundAmount - wallet slice           (the Razorpay-paid part)
--   Sum over the whole order = gross (exactly what the customer paid), so the
--   wallet-portion and external-portion always reconcile — including the case
--   where the wallet covered the order fees.
--
-- Idempotency: one 'refund' wallet_transactions row per booking
--   (reference_id = booking id, source = 'refund'), checked BEFORE crediting.
--
-- Apply AFTER 20260920000000_wallet_cash_bonus_ledger.sql (credit_wallet +
-- cash/bonus columns) and 20260925000000_add_bookings_refund_status.sql.
-- ════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.handle_booking_cancellation_refund()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_id         UUID;
  v_service_total    NUMERIC(10, 2) := 0;
  v_order_fees_total NUMERIC(10, 2) := 0;
  v_gross            NUMERIC(10, 2) := 0;
  v_wallet_cash      NUMERIC(10, 2) := 0;
  v_wallet_bonus     NUMERIC(10, 2) := 0;
  v_wallet_total     NUMERIC(10, 2) := 0;
  v_is_closing       BOOLEAN        := FALSE;
  v_refund_amount    NUMERIC(10, 2) := 0;
  v_wallet_slice     NUMERIC(10, 2) := 0;
  v_wallet_cash_part NUMERIC(10, 2) := 0;
  v_bonus_part       NUMERIC(10, 2) := 0;
  v_cash_part        NUMERIC(10, 2) := 0;
  v_credit           JSONB;
  v_refunded         BOOLEAN        := FALSE;
BEGIN
  -- Only a fresh, eligible, paid cancellation triggers a refund.
  IF NEW.status <> 'cancelled'
     OR OLD.status IS NOT DISTINCT FROM 'cancelled'
     OR NEW.payment_status <> 'paid'
     OR NEW.refund_eligible IS FALSE THEN
    RETURN NEW;
  END IF;

  v_order_id := NEW.order_id;

  -- Idempotency: never refund the same booking twice.
  IF EXISTS (
    SELECT 1 FROM public.wallet_transactions
     WHERE reference_id = NEW.id
       AND source       = 'refund'
  ) THEN
    RETURN NEW;
  END IF;

  -- Serialize sibling cancellations of the same order. Two bookings of one
  -- order cancelled concurrently would otherwise each read the other as still
  -- live and NEITHER would treat itself as the closing cancellation — the
  -- order fee would then never be refunded. Locking the order row makes the
  -- second transaction wait and re-evaluate against committed state.
  IF v_order_id IS NOT NULL THEN
    PERFORM 1 FROM public.orders WHERE id = v_order_id FOR UPDATE;
  END IF;

  -- ── 1. Order totals (services + order-level fees) ──────────────────────
  IF v_order_id IS NOT NULL THEN
    SELECT COALESCE(SUM(total_amount), 0)
      INTO v_service_total
      FROM public.bookings
     WHERE order_id = v_order_id;

    SELECT COALESCE(SUM((fee ->> 'amount')::NUMERIC), 0)
      INTO v_order_fees_total
      FROM public.orders o
      CROSS JOIN LATERAL jsonb_array_elements(
        CASE WHEN jsonb_typeof(o.order_fees) = 'array' THEN o.order_fees ELSE '[]'::jsonb END
      ) AS fee
     WHERE o.id = v_order_id;

    SELECT NOT EXISTS (
      SELECT 1 FROM public.bookings
       WHERE order_id = v_order_id
         AND id      <> NEW.id
         AND status NOT IN ('completed', 'cancelled', 'expired', 'refunded')
    ) INTO v_is_closing;
  END IF;

  IF v_service_total <= 0 THEN
    v_service_total := COALESCE(NEW.total_amount, 0);
  END IF;

  v_gross := v_service_total + v_order_fees_total;

  -- ── 2. Wallet debit split for this order ───────────────────────────────
  -- Wallet is debited once per order (reference_id = order id) by
  -- use_wallet_balance; legacy single-service flows keyed it by booking id.
  SELECT COALESCE((metadata ->> 'cash_used')::NUMERIC, 0),
         COALESCE((metadata ->> 'bonus_used')::NUMERIC, 0)
    INTO v_wallet_cash, v_wallet_bonus
    FROM public.wallet_transactions
   WHERE source       = 'booking_discount'
     AND reference_id = COALESCE(v_order_id, NEW.id)
   ORDER BY created_at DESC
   LIMIT 1;

  v_wallet_total := COALESCE(v_wallet_cash, 0) + COALESCE(v_wallet_bonus, 0);

  -- ── 3. Refund amount + cash/bonus split for THIS booking ───────────────
  v_refund_amount := COALESCE(NEW.total_amount, 0)
                     + CASE WHEN v_is_closing THEN v_order_fees_total ELSE 0 END;

  IF v_gross > 0 AND v_wallet_total > 0 THEN
    v_wallet_slice := LEAST(v_refund_amount, ROUND(v_wallet_total * (v_refund_amount / v_gross), 2));

    IF v_wallet_total > 0 THEN
      v_wallet_cash_part := ROUND(v_wallet_slice * (v_wallet_cash / v_wallet_total), 2);
      v_bonus_part       := v_wallet_slice - v_wallet_cash_part;
    END IF;
  END IF;

  -- Cash = external (Razorpay) portion + the wallet's original CASH portion.
  v_cash_part := GREATEST(0, v_refund_amount - v_wallet_slice) + v_wallet_cash_part;

  -- ── 4. Credit via credit_wallet (the only balance primitive) ───────────
  IF v_cash_part > 0 THEN
    v_credit := public.credit_wallet(
      p_user_id      => NEW.customer_id,
      p_amount       => v_cash_part,
      p_source       => 'refund',
      p_reference_id => NEW.id,
      p_metadata     => jsonb_build_object(
                          'booking_id', NEW.id,
                          'order_id',   v_order_id,
                          'kind',       'booking_refund',
                          'balance',    'cash'
                        ),
      p_description  => 'Refund for cancelled booking #' || SUBSTRING(NEW.id::text, 1, 8),
      p_balance_type => 'cash'
    );
    IF COALESCE((v_credit ->> 'success')::BOOLEAN, FALSE) THEN
      v_refunded := TRUE;
    ELSE
      RAISE WARNING 'Cancellation refund (cash) failed for booking %: %', NEW.id, v_credit ->> 'error';
    END IF;
  END IF;

  IF v_bonus_part > 0 THEN
    v_credit := public.credit_wallet(
      p_user_id      => NEW.customer_id,
      p_amount       => v_bonus_part,
      p_source       => 'refund',
      p_reference_id => NEW.id,
      p_metadata     => jsonb_build_object(
                          'booking_id', NEW.id,
                          'order_id',   v_order_id,
                          'kind',       'booking_refund',
                          'balance',    'bonus'
                        ),
      p_description  => 'Bonus refund for cancelled booking #' || SUBSTRING(NEW.id::text, 1, 8),
      p_balance_type => 'bonus'
    );
    IF COALESCE((v_credit ->> 'success')::BOOLEAN, FALSE) THEN
      v_refunded := TRUE;
    ELSE
      RAISE WARNING 'Cancellation refund (bonus) failed for booking %: %', NEW.id, v_credit ->> 'error';
    END IF;
  END IF;

  IF v_refunded THEN
    NEW.payment_status := 'refunded';
    NEW.refund_status  := 'refunded';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_bookings_cancellation_refund ON public.bookings;
CREATE TRIGGER tr_bookings_cancellation_refund
  BEFORE UPDATE OF status ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_booking_cancellation_refund();
