-- ════════════════════════════════════════════════════════════════════════════
-- Migration: Fix Razorpay Webhook Recovery & Order Fulfillment
-- File: 20261002030000_fix_razorpay_webhook_recovery.sql
-- Purpose:
--   1. Add razorpay_order_id and checkout_payload to public.orders.
--   2. Enforce unique index on orders.razorpay_order_id.
--   3. Add performance indexes on payments (razorpay_order_id, razorpay_payment_id).
--   4. Update orders_payment_status_check to allow 'processing' state.
--   5. Provide atomic claim_order_for_fulfillment RPC with row locking.
-- ════════════════════════════════════════════════════════════════════════════

-- 1. ADD razorpay_order_id and checkout_payload to public.orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS razorpay_order_id TEXT,
  ADD COLUMN IF NOT EXISTS checkout_payload JSONB;

-- Unique partial index: each Razorpay order id maps to exactly one internal order
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_razorpay_order_id
  ON public.orders (razorpay_order_id)
  WHERE razorpay_order_id IS NOT NULL;

-- 2. Indexes on payments table for instant gateway webhook lookups
CREATE INDEX IF NOT EXISTS idx_payments_razorpay_order_id
  ON public.payments (razorpay_order_id);

CREATE INDEX IF NOT EXISTS idx_payments_razorpay_payment_id
  ON public.payments (razorpay_payment_id);

-- 3. Update orders_payment_status_check to allow 'processing'
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_payment_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_payment_status_check
  CHECK (payment_status IN ('pending', 'processing', 'paid', 'failed', 'refunded'));

-- 4. Atomic claim_order_for_fulfillment RPC
-- Acquires a row lock (FOR UPDATE) on the order row.
-- Prevents race conditions between browser verify action and webhook recovery.
CREATE OR REPLACE FUNCTION public.claim_order_for_fulfillment(
  p_order_id UUID,
  p_razorpay_order_id TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_booking_count INT;
BEGIN
  -- Lock the order row
  SELECT * INTO v_order
    FROM public.orders
   WHERE id = p_order_id
     FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'reason', 'order_not_found');
  END IF;

  -- If razorpay_order_id was supplied and order row doesn't have it, set it now
  IF p_razorpay_order_id IS NOT NULL AND v_order.razorpay_order_id IS NULL THEN
    UPDATE public.orders
       SET razorpay_order_id = p_razorpay_order_id,
           updated_at = NOW()
     WHERE id = p_order_id;
    v_order.razorpay_order_id := p_razorpay_order_id;
  END IF;

  -- Count existing bookings for this order
  SELECT count(*) INTO v_booking_count
    FROM public.bookings
   WHERE order_id = p_order_id;

  -- If child bookings already exist and order is paid, it is already fulfilled
  IF v_booking_count > 0 AND v_order.payment_status = 'paid' THEN
    RETURN jsonb_build_object(
      'success', true,
      'already_fulfilled', true,
      'booking_count', v_booking_count,
      'order', row_to_json(v_order)
    );
  END IF;

  -- If actively processing by another request within the last 60 seconds
  IF v_order.payment_status = 'processing' AND v_order.updated_at > (NOW() - INTERVAL '60 seconds') THEN
    RETURN jsonb_build_object(
      'success', false,
      'reason', 'actively_processing',
      'booking_count', v_booking_count,
      'order', row_to_json(v_order)
    );
  END IF;

  -- Claim the order for fulfillment
  UPDATE public.orders
     SET payment_status = 'processing',
         updated_at = NOW()
   WHERE id = p_order_id;

  v_order.payment_status := 'processing';

  RETURN jsonb_build_object(
    'success', true,
    'already_fulfilled', false,
    'booking_count', v_booking_count,
    'order', row_to_json(v_order)
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.claim_order_for_fulfillment(UUID, TEXT) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.claim_order_for_fulfillment(UUID, TEXT) TO authenticated, service_role;
