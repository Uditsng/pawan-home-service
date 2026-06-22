-- ═══════════════════════════════════════════════════════════════
-- Wallet Refund on Booking Cancellation
-- Created: 2026-06-22
-- Purpose: Auto-refund booking total_amount to customer wallet on cancellation
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.handle_booking_cancellation_refund()
RETURNS TRIGGER AS $$
DECLARE
  v_new_balance NUMERIC(10, 2);
BEGIN
  -- Check if status changed to cancelled and payment was 'paid'
  IF NEW.status = 'cancelled' AND OLD.status IS DISTINCT FROM 'cancelled' AND NEW.payment_status = 'paid' THEN
    -- 1. Credit the customer's wallet balance
    UPDATE public.profiles
    SET wallet_balance = wallet_balance + NEW.total_amount
    WHERE id = NEW.customer_id
    RETURNING wallet_balance INTO v_new_balance;

    -- 2. Insert wallet transaction
    INSERT INTO public.wallet_transactions (
      user_id,
      type,
      source,
      amount,
      balance_after,
      description,
      reference_id
    ) VALUES (
      NEW.customer_id,
      'credit',
      'refund',
      NEW.total_amount,
      v_new_balance,
      'Refund for cancelled booking #' || SUBSTRING(NEW.id::text, 1, 8),
      NEW.id
    );

    -- 3. Set booking payment status to refunded
    NEW.payment_status := 'refunded';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_bookings_cancellation_refund ON public.bookings;
CREATE TRIGGER tr_bookings_cancellation_refund
  BEFORE UPDATE OF status ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_booking_cancellation_refund();
