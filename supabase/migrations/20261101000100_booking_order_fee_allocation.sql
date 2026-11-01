-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
-- Migration: Booking Order Fee Allocation & Authoritative Total
-- File: supabase/migrations/20261101000100_booking_order_fee_allocation.sql
--
-- Objective:
--   1. Add order_fee column to public.booking_pricing so each booking's allocated
--      fee share is explicitly recorded.
--   2. Update public.create_order_bookings_atomic to persist order_fee.
--   3. Maintain service_role-only execution grant.
-- â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

-- 1. Add order_fee to booking_pricing
ALTER TABLE public.booking_pricing
  ADD COLUMN IF NOT EXISTS order_fee NUMERIC(10,2) NOT NULL DEFAULT 0.00;

-- 2. Update create_order_bookings_atomic to insert order_fee
-- Remove the legacy 4-JSONB overload so PostgREST cannot resolve an
-- unhardened function with the same call shape.
DROP FUNCTION IF EXISTS public.create_order_bookings_atomic(UUID, JSONB, JSONB, JSONB);

CREATE OR REPLACE FUNCTION public.create_order_bookings_atomic(
  p_order_id      UUID,
  p_bookings      JSONB,
  p_order_updates JSONB,
  p_offer_context JSONB DEFAULT NULL,
  p_customer_id   UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order          public.orders%ROWTYPE;
  v_existing_count INT;
  v_existing_ids   JSONB;
  v_item           JSONB;
  v_booking_id     UUID;
  v_created_ids    UUID[] := ARRAY[]::UUID[];
  v_is_first       BOOLEAN := TRUE;
  v_pricing        JSONB;
  v_answers        JSONB;
  v_ans            JSONB;
  v_actor          TEXT;
  v_remarks        TEXT;
  v_metadata       JSONB;
  v_total_items    INT;
  v_customer_id    UUID;
BEGIN
  -- 1. Lock and verify the parent order
  SELECT * INTO v_order
    FROM public.orders
   WHERE id = p_order_id
     FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'order_not_found');
  END IF;

  -- Defence-in-depth: caller must be service_role or the order customer.
  IF auth.role() <> 'service_role' AND auth.uid() IS DISTINCT FROM v_order.customer_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthorized_order_fulfillment');
  END IF;

  v_customer_id := COALESCE(p_customer_id, v_order.customer_id);
  IF v_customer_id IS DISTINCT FROM v_order.customer_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order ownership mismatch');
  END IF;

  -- 2. Idempotency check
  SELECT count(*), coalesce(jsonb_agg(id), '[]'::jsonb)
    INTO v_existing_count, v_existing_ids
    FROM public.bookings
   WHERE order_id = p_order_id;

  IF v_existing_count > 0 THEN
    RETURN jsonb_build_object(
      'success', true,
      'already_created', true,
      'booking_ids', v_existing_ids,
      'count', v_existing_count
    );
  END IF;

  v_total_items := jsonb_array_length(COALESCE(p_bookings, '[]'::jsonb));
  IF v_total_items = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'empty_bookings_array');
  END IF;

  -- 3. Insert each booking and its dependants in one transaction.
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_bookings)
  LOOP
    v_booking_id := gen_random_uuid();

    INSERT INTO public.bookings (
      id,
      service_id,
      customer_id,
      order_id,
      status,
      total_amount,
      city,
      area,
      address,
      pincode,
      scheduled_date,
      payment_status,
      payment_method,
      selected_duration_minutes,
      base_price,
      final_price,
      wallet_discount_applied,
      business_name,
      business_gstin,
      meeting_location,
      destination,
      expected_bags,
      latitude,
      longitude
    ) VALUES (
      v_booking_id,
      (v_item->>'service_id')::UUID,
      v_order.customer_id,
      p_order_id,
      coalesce(v_item->>'status', 'pending'),
      (v_item->>'total_amount')::NUMERIC,
      v_item->>'city',
      v_item->>'area',
      v_item->>'address',
      v_item->>'pincode',
      (v_item->>'scheduled_date')::TIMESTAMPTZ,
      coalesce(v_item->>'payment_status', 'pending'),
      v_item->>'payment_method',
      (v_item->>'selected_duration_minutes')::INT,
      (v_item->>'base_price')::NUMERIC,
      (v_item->>'final_price')::NUMERIC,
      coalesce((v_item->>'wallet_discount_applied')::NUMERIC, 0),
      v_item->>'business_name',
      v_item->>'business_gstin',
      v_item->>'meeting_location',
      v_item->>'destination',
      coalesce((v_item->>'expected_bags')::INT, 0),
      (v_item->>'latitude')::NUMERIC,
      (v_item->>'longitude')::NUMERIC
    );

    -- Link offer entitlement/application to the first booking.
    IF v_is_first AND p_offer_context IS NOT NULL THEN
      IF (p_offer_context->>'entitlement_id') IS NOT NULL THEN
        UPDATE public.offer_redemptions
           SET booking_id = v_booking_id
         WHERE entitlement_id = (p_offer_context->>'entitlement_id')::UUID
           AND order_id = p_order_id;
      END IF;

      IF (p_offer_context->>'application_id') IS NOT NULL THEN
        UPDATE public.offer_applications
           SET booking_id = v_booking_id
         WHERE id = (p_offer_context->>'application_id')::UUID;
      END IF;
    END IF;

    -- booking_pricing (includes the per-booking allocated order fee)
    v_pricing := v_item->'pricing';
    IF v_pricing IS NOT NULL THEN
      INSERT INTO public.booking_pricing (
        booking_id,
        base_price,
        hourly_price,
        area_price,
        quantity_price,
        distance_price,
        inspection_fee,
        travel_fee,
        surcharges,
        addons_total,
        addons_breakdown,
        gst_amount,
        discount_amount,
        coupon_discount,
        wallet_discount,
        offer_id,
        offer_entitlement_id,
        offer_discount,
        order_fee,
        total_price
      ) VALUES (
        v_booking_id,
        coalesce((v_pricing->>'base_price')::NUMERIC, 0),
        coalesce((v_pricing->>'hourly_price')::NUMERIC, 0),
        coalesce((v_pricing->>'area_price')::NUMERIC, 0),
        coalesce((v_pricing->>'quantity_price')::NUMERIC, 0),
        coalesce((v_pricing->>'distance_price')::NUMERIC, 0),
        coalesce((v_pricing->>'inspection_fee')::NUMERIC, 0),
        coalesce((v_pricing->>'travel_fee')::NUMERIC, 0),
        coalesce(v_pricing->'surcharges', '[]'::jsonb),
        coalesce((v_pricing->>'addons_total')::NUMERIC, 0),
        coalesce(v_pricing->'addons_breakdown', '[]'::jsonb),
        coalesce((v_pricing->>'gst_amount')::NUMERIC, 0),
        coalesce((v_pricing->>'discount_amount')::NUMERIC, 0),
        coalesce((v_pricing->>'coupon_discount')::NUMERIC, 0),
        coalesce((v_pricing->>'wallet_discount')::NUMERIC, 0),
        (v_pricing->>'offer_id')::UUID,
        (v_pricing->>'offer_entitlement_id')::UUID,
        coalesce((v_pricing->>'offer_discount')::NUMERIC, 0),
        coalesce((v_pricing->>'order_fee')::NUMERIC, 0),
        coalesce((v_pricing->>'total_price')::NUMERIC, 0)
      );
    END IF;

    -- Form answers
    v_answers := v_item->'form_answers';
    IF v_answers IS NOT NULL AND jsonb_typeof(v_answers) = 'array' THEN
      FOR v_ans IN SELECT * FROM jsonb_array_elements(v_answers)
      LOOP
        INSERT INTO public.booking_form_answers (
          booking_id, field_name, field_label, field_value
        ) VALUES (
          v_booking_id,
          coalesce(v_ans->>'field_name', 'field'),
          coalesce(v_ans->>'field_label', 'Field'),
          coalesce(v_ans->>'field_value', '')
        );
      END LOOP;
    END IF;

    -- Status history
    INSERT INTO public.booking_status_history (
      booking_id, status, remarks, changed_by
    ) VALUES (
      v_booking_id,
      coalesce(v_item->>'status', 'pending'),
      coalesce(v_item->>'status_remarks', 'Booking created'),
      NULL
    );

    -- Timeline event (restored from the legacy RPC)
    v_actor := coalesce(v_item->>'event_actor', 'SYSTEM');
    v_remarks := coalesce(v_item->>'status_remarks', 'Booking created');
    v_metadata := coalesce(v_item->'event_metadata', '{}'::jsonb);

    INSERT INTO public.booking_events (
      booking_id, event_type, actor, metadata
    ) VALUES (
      v_booking_id, 'BOOKING_CREATED', v_actor, v_metadata
    );

    -- Admin audit trail
    INSERT INTO public.booking_audit_trail (
      booking_id, action, actor, metadata
    ) VALUES (
      v_booking_id,
      'BOOKING_CREATED',
      coalesce(v_item->>'event_actor', 'USER'),
      coalesce(v_item->'event_metadata', jsonb_build_object('order_id', p_order_id, 'source', 'atomic_batch'))
    );

    v_created_ids := array_append(v_created_ids, v_booking_id);
    v_is_first := FALSE;
  END LOOP;

  -- 4. Verify all items were inserted
  IF array_length(v_created_ids, 1) <> v_total_items THEN
    RAISE EXCEPTION 'Atomic booking creation failed: created %, expected %',
      array_length(v_created_ids, 1), v_total_items;
  END IF;

  -- 5. Update order state atomically
  UPDATE public.orders
     SET status = coalesce(p_order_updates->>'status', 'confirmed'),
         payment_status = coalesce(p_order_updates->>'payment_status', v_order.payment_status),
         item_count = array_length(v_created_ids, 1),
         final_amount = coalesce((p_order_updates->>'final_amount')::NUMERIC, final_amount),
         wallet_discount = coalesce((p_order_updates->>'wallet_discount')::NUMERIC, wallet_discount),
         offer_discount = coalesce((p_order_updates->>'offer_discount')::NUMERIC, offer_discount),
         updated_at = NOW()
   WHERE id = p_order_id;

  RETURN jsonb_build_object(
    'success', true,
    'already_created', false,
    'booking_ids', to_jsonb(v_created_ids),
    'count', array_length(v_created_ids, 1)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_order_bookings_atomic(UUID, JSONB, JSONB, JSONB, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_order_bookings_atomic(UUID, JSONB, JSONB, JSONB, UUID) TO service_role;
