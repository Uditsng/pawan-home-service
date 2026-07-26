-- Atomic Booking Completion RPC Function
-- Guarantees atomic transaction execution across bookings, payments, status history, and wallet debits.

CREATE OR REPLACE FUNCTION public.complete_booking_transaction(
  p_customer_id UUID,
  p_service_id UUID,
  p_status TEXT,
  p_total_amount NUMERIC,
  p_city TEXT,
  p_area TEXT,
  p_address TEXT,
  p_pincode TEXT,
  p_scheduled_date TIMESTAMPTZ,
  p_wallet_discount NUMERIC,
  p_payment_status TEXT,
  p_pricing_model TEXT,
  p_selected_duration INTEGER,
  p_base_price NUMERIC,
  p_final_price NUMERIC,
  p_meeting_location TEXT,
  p_destination TEXT,
  p_expected_bags INTEGER,
  p_business_name TEXT,
  p_business_gstin TEXT,
  p_razorpay_order_id TEXT,
  p_razorpay_payment_id TEXT,
  p_razorpay_signature TEXT,
  p_wallet_amount_to_use NUMERIC DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking_id UUID;
  v_wallet_res JSONB;
BEGIN
  -- 1. Create Booking Record
  INSERT INTO public.bookings (
    customer_id,
    service_id,
    status,
    total_amount,
    city,
    area,
    address,
    pincode,
    scheduled_date,
    wallet_discount_applied,
    payment_status,
    pricing_model,
    selected_duration_minutes,
    base_price,
    final_price,
    meeting_location,
    destination,
    expected_bags,
    business_name,
    business_gstin
  ) VALUES (
    p_customer_id,
    p_service_id,
    p_status,
    p_total_amount,
    p_city,
    p_area,
    p_address,
    p_pincode,
    p_scheduled_date,
    p_wallet_discount,
    p_payment_status,
    p_pricing_model,
    p_selected_duration,
    p_base_price,
    p_final_price,
    p_meeting_location,
    p_destination,
    p_expected_bags,
    p_business_name,
    p_business_gstin
  )
  RETURNING id INTO v_booking_id;

  -- 2. Record Status History
  INSERT INTO public.booking_status_history (
    booking_id,
    status,
    changed_by,
    remarks
  ) VALUES (
    v_booking_id,
    p_status,
    p_customer_id,
    'Booking created and verified server-side'
  );

  -- 3. Record Payment
  INSERT INTO public.payments (
    customer_id,
    booking_id,
    amount,
    payment_status,
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature
  ) VALUES (
    p_customer_id,
    v_booking_id,
    p_final_price,
    'completed',
    p_razorpay_order_id,
    p_razorpay_payment_id,
    p_razorpay_signature
  );

  -- 4. Deduct Wallet Balance if applicable
  IF p_wallet_amount_to_use > 0 THEN
    SELECT public.use_wallet_balance(
      p_user_id => p_customer_id,
      p_amount => p_wallet_amount_to_use,
      p_booking_id => v_booking_id
    ) INTO v_wallet_res;

    IF (v_wallet_res->>'success')::boolean IS NOT TRUE THEN
      RAISE EXCEPTION 'Wallet debit failed: %', (v_wallet_res->>'error');
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'booking_id', v_booking_id
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_booking_transaction TO authenticated;
