-- ═══════════════════════════════════════════════════════════════
-- Customer Booking Management — Reschedule & Cancellation
-- Created: 2026-08-09
-- Purpose:
--   * Cancellation (customer-initiated) with server-side refund window.
--   * Rescheduling to a new slot (price unchanged — snapshot stays authoritative).
--   * Idempotent, concurrency-safe (FOR UPDATE), auditable transitions.
--   * Customers get NO direct UPDATE grant on bookings — RPCs are the only
--     mutation path (RLS/security boundary).
-- ═══════════════════════════════════════════════════════════════

-- 1. New bookings columns
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS refund_eligible BOOLEAN DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS rescheduled_at TIMESTAMPTZ DEFAULT NULL;

-- refund_eligible semantics:
--   NULL       -> legacy/unknown, treated as eligible (preserves old behavior)
--   TRUE       -> this cancellation is entitled to an automatic wallet refund
--   FALSE      -> cancellation NOT entitled to an automatic wallet refund
--   Writer rules: customer RPC computes it; partner/admin cancels explicitly set TRUE.

-- 2. Slot parser → timestamptz (Asia/Kolkata). NULL when invalid.
CREATE OR REPLACE FUNCTION public.parse_slot_timestamp(p_date DATE, p_time TEXT)
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_tok   TEXT[];
  v_hour  INTEGER;
  v_min   INTEGER;
  v_mod   TEXT;
BEGIN
  IF p_date IS NULL OR p_time IS NULL THEN
    RETURN NULL;
  END IF;

  v_tok := regexp_match(UPPER(BTRIM(p_time)), '^(\d{1,2}):(\d{2})\s*(AM|PM)$');
  IF v_tok IS NULL THEN
    RETURN NULL;
  END IF;

  v_hour := v_tok[1]::INTEGER;
  v_min  := v_tok[2]::INTEGER;

  -- Only 30-minute boundaries are offered by the scheduling UI (7:00 AM - 9:00 PM)
  IF v_min NOT IN (0, 30) THEN
    RETURN NULL;
  END IF;

  IF v_tok[3] = 'PM' AND v_hour <> 12 THEN
    v_hour := v_hour + 12;
  ELSIF v_tok[3] = 'AM' AND v_hour = 12 THEN
    v_hour := 0;
  END IF;

  IF v_hour < 7 OR v_hour > 21 OR (v_hour = 21 AND v_min > 0) THEN
    RETURN NULL;
  END IF;

  RETURN (p_date::TIMESTAMP + make_interval(hours => v_hour, mins => v_min)) AT TIME ZONE 'Asia/Kolkata';
END;
$$;

-- 3. Shared release helper — precise partner availability restoration.
--    Clears the assignment's outstanding offers and only re-enables the partner
--    when they have NO OTHER live booking. Never flips suspension/block state.
--    p_clear_offers = TRUE (reschedule): DELETE all offers so the released
--    partner and previously-offered tiers become re-eligible for the new slot.
--    p_clear_offers = FALSE (cancel): expire outstanding 'offered' rows only.
--    Returns the released partner id (or NULL).
CREATE OR REPLACE FUNCTION public.release_partner_assignment(
  p_booking_id   UUID,
  p_partner_id   UUID,
  p_clear_offers BOOLEAN DEFAULT FALSE
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_active_other INTEGER;
  v_profile_role TEXT;
BEGIN
  IF p_clear_offers THEN
    DELETE FROM public.booking_job_offers
     WHERE booking_id = p_booking_id;
  ELSE
    UPDATE public.booking_job_offers
       SET status = 'expired'
     WHERE booking_id = p_booking_id
       AND status     = 'offered';
  END IF;

  IF p_partner_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Only mark available again when the partner has no other live assignments
  SELECT count(*) INTO v_active_other
    FROM public.bookings
   WHERE partner_id   = p_partner_id
     AND id          <> p_booking_id
     AND status      NOT IN ('completed', 'cancelled', 'expired', 'refunded');

  IF v_active_other = 0 THEN
    SELECT role INTO v_profile_role
      FROM public.profiles
     WHERE id = p_partner_id;

    IF v_profile_role = 'partner' THEN
      UPDATE public.profiles
         SET is_available = TRUE
       WHERE id = p_partner_id
         AND status NOT IN ('suspended', 'blocked');
    END IF;
  END IF;

  RETURN p_partner_id;
END;
$$;

-- 4. Customer cancellation (server-side authoritative refund policy)
CREATE OR REPLACE FUNCTION public.customer_cancel_booking(p_booking_id UUID, p_reason TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking         RECORD;
  v_window_minutes  INTEGER;
  v_elapsed_minutes NUMERIC;
  v_refund_eligible BOOLEAN;
  v_released        UUID;
  v_reason          TEXT;
  v_metadata        JSONB;
BEGIN
  -- Lock the booking row; revalidate ownership/status AFTER the lock.
  SELECT * INTO v_booking
    FROM public.bookings
   WHERE id = p_booking_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'booking_not_found');
  END IF;

  IF v_booking.customer_id IS DISTINCT FROM auth.uid() THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthorized');
  END IF;

  -- Idempotency: a repeated/duplicate cancel returns success without side effects.
  IF v_booking.status IN ('cancelled', 'expired', 'refunded') THEN
    RETURN jsonb_build_object('success', true, 'already_cancelled', true, 'refunded', false, 'released_partner_id', NULL);
  END IF;

  -- Only allowed before the professional leaves for the location / service starts.
  IF v_booking.status NOT IN ('pending', 'confirmed', 'assigned', 'accepted', 'reassigned') THEN
    RETURN jsonb_build_object('success', false, 'error', 'booking_not_cancellable');
  END IF;

  -- Server-side refund window (never accepts client input).
  v_window_minutes  := public.get_free_cancellation_window_minutes();
  v_elapsed_minutes := EXTRACT(EPOCH FROM (now() - v_booking.created_at)) / 60;
  v_refund_eligible := (v_elapsed_minutes <= v_window_minutes);

  v_reason := NULLIF(BTRIM(p_reason), '');

  -- Release partner BEFORE marking cancelled so the partner-score trigger sees NULL.
  v_released := public.release_partner_assignment(p_booking_id, v_booking.partner_id);

  UPDATE public.bookings
     SET status             = 'cancelled',
         partner_id         = NULL,
         cancelled_at       = now(),
         cancelled_by       = 'USER',
         cancellation_reason = v_reason,
         refund_eligible    = v_refund_eligible
   WHERE id = p_booking_id;
  -- The rewritten handle_booking_cancellation_refund (BEFORE UPDATE trigger below)
  -- credits the wallet + flips payment_status -> 'refunded' only when
  -- refund_eligible IS NOT FALSE, and is guarded against double refunds.

  -- Keep the parent order consistent: when this cancels the order's last live
  -- booking, close the order (and mark its payment refunded when the cancel refunds).
  IF v_booking.order_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.bookings
       WHERE order_id = v_booking.order_id
         AND id      <> p_booking_id
         AND status  NOT IN ('completed', 'cancelled', 'expired', 'refunded')
    ) THEN
      UPDATE public.orders
         SET status         = 'cancelled',
             payment_status = CASE
                                WHEN v_refund_eligible THEN 'refunded'
                                ELSE payment_status
                              END,
             updated_at     = now()
       WHERE id = v_booking.order_id
         AND status <> 'cancelled';
    END IF;
  END IF;

  v_metadata := jsonb_build_object(
    'reason', v_reason,
    'refund_eligible', v_refund_eligible,
    'cancelled_by', 'customer',
    'window_minutes', v_window_minutes,
    'elapsed_minutes', ROUND(v_elapsed_minutes, 1),
    'released_partner_id', v_released
  );

  INSERT INTO public.booking_status_history (booking_id, status, changed_by, remarks)
  VALUES (p_booking_id, 'cancelled', auth.uid(), 'Cancelled by customer');

  INSERT INTO public.booking_events (booking_id, event_type, actor, metadata)
  VALUES (p_booking_id, 'JOB_CANCELLED', 'USER', v_metadata);

  INSERT INTO public.booking_audit_trail (booking_id, action, actor, metadata)
  VALUES (p_booking_id, 'BOOKING_CANCELLED', 'CUSTOMER', v_metadata);

  RETURN jsonb_build_object(
    'success', true,
    'already_cancelled', false,
    'refunded', v_refund_eligible,
    'refund_eligible', v_refund_eligible,
    'released_partner_id', v_released
  );
END;
$$;

-- 5. Customer reschedule (new slot, price snapshot unchanged)
CREATE OR REPLACE FUNCTION public.customer_reschedule_booking(
  p_booking_id UUID,
  p_new_date   DATE,
  p_new_time   TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking       RECORD;
  v_new_ts        TIMESTAMPTZ;
  v_service_active  BOOLEAN;
  v_service_status  TEXT;
  v_released      UUID;
  v_old_scheduled TIMESTAMPTZ;
  v_metadata      JSONB;
BEGIN
  SELECT * INTO v_booking
    FROM public.bookings
   WHERE id = p_booking_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'booking_not_found');
  END IF;

  IF v_booking.customer_id IS DISTINCT FROM auth.uid() THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthorized');
  END IF;

  -- Terminal bookings can never be rescheduled
  IF v_booking.status IN ('completed', 'cancelled', 'expired', 'refunded') THEN
    RETURN jsonb_build_object('success', false, 'error', 'booking_not_reschedulable');
  END IF;

  -- Only before dispatch-to-location / service start
  IF v_booking.status NOT IN ('pending', 'confirmed', 'assigned', 'accepted', 'reassigned') THEN
    RETURN jsonb_build_object('success', false, 'error', 'booking_not_reschedulable');
  END IF;

  -- Slot validity (server-side)
  v_new_ts := public.parse_slot_timestamp(p_new_date, p_new_time);
  IF v_new_ts IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_slot');
  END IF;
  IF v_new_ts <= now() THEN
    RETURN jsonb_build_object('success', false, 'error', 'slot_in_past');
  END IF;

  -- Service must still be bookable
  SELECT is_active, status INTO v_service_active, v_service_status
    FROM public.services
   WHERE id = v_booking.service_id;
  IF v_service_active IS NOT TRUE OR COALESCE(v_service_status, 'published') <> 'published' THEN
    RETURN jsonb_build_object('success', false, 'error', 'service_unavailable');
  END IF;

  -- Idempotency: identical slot on an already-pending booking is a no-op
  IF v_booking.status = 'pending'
     AND v_booking.scheduled_date IS NOT DISTINCT FROM v_new_ts THEN
    RETURN jsonb_build_object('success', true, 'already_done', true,
      'old_scheduled_date', v_booking.scheduled_date,
      'released_partner_id', NULL);
  END IF;

  v_old_scheduled := v_booking.scheduled_date;

  -- Release old assignment; clear offers so the old partner + prior tiers become
  -- re-eligible for the new slot, then reset broadcast metadata for a fresh dispatch.
  v_released := public.release_partner_assignment(p_booking_id, v_booking.partner_id, TRUE);

  UPDATE public.bookings
     SET scheduled_date    = v_new_ts,
         status            = 'pending',
         partner_id        = NULL,
         rescheduled_at    = now(),
         broadcast_tier    = 1,
         last_broadcast_at = NULL
   WHERE id = p_booking_id;

  -- Keep the parent order grouping in sync (when present)
  IF v_booking.order_id IS NOT NULL THEN
    UPDATE public.orders
       SET scheduled_date = v_new_ts
     WHERE id = v_booking.order_id;
  END IF;

  v_metadata := jsonb_build_object(
    'old_date', (v_old_scheduled AT TIME ZONE 'Asia/Kolkata')::DATE::TEXT,
    'old_time', to_char(v_old_scheduled AT TIME ZONE 'Asia/Kolkata', 'HH12:MI AM'),
    'new_date', p_new_date::TEXT,
    'new_time', p_new_time,
    'old_partner_id', v_released,
    'pricing_changed', false
  );

  INSERT INTO public.booking_status_history (booking_id, status, changed_by, remarks)
  VALUES (p_booking_id, 'pending', auth.uid(), 'Rescheduled by customer');

  INSERT INTO public.booking_events (booking_id, event_type, actor, metadata)
  VALUES (p_booking_id, 'BOOKING_RESCHEDULED', 'USER', v_metadata);

  INSERT INTO public.booking_audit_trail (booking_id, action, actor, metadata)
  VALUES (p_booking_id, 'BOOKING_RESCHEDULED', 'CUSTOMER', v_metadata);

  RETURN jsonb_build_object(
    'success', true,
    'already_done', false,
    'old_scheduled_date', v_old_scheduled,
    'new_scheduled_date', v_new_ts,
    'released_partner_id', v_released
  );
END;
$$;

-- 7. Rewritten wallet-refund trigger (replaces the unguarded version).
--    Refunds ONLY when:
--      * status transitions to 'cancelled' (not already cancelled),
--      * payment was 'paid',
--      * refund_eligible IS NOT FALSE (customer's late cancellation = no refund),
--      * no refund for this booking already exists (double-refund guard).
CREATE OR REPLACE FUNCTION public.handle_booking_cancellation_refund()
RETURNS TRIGGER AS $$
DECLARE
  v_new_balance NUMERIC(10, 2);
BEGIN
  IF NEW.status = 'cancelled'
     AND OLD.status IS DISTINCT FROM 'cancelled'
     AND NEW.payment_status = 'paid'
     AND NEW.refund_eligible IS NOT FALSE
     AND NOT EXISTS (
       SELECT 1 FROM public.wallet_transactions
        WHERE reference_id = NEW.id
          AND source       = 'refund'
     ) THEN
    UPDATE public.profiles
       SET wallet_balance = wallet_balance + NEW.total_amount
     WHERE id = NEW.customer_id
     RETURNING wallet_balance INTO v_new_balance;

    INSERT INTO public.wallet_transactions (
      user_id, type, source, amount, balance_after, description, reference_id
    ) VALUES (
      NEW.customer_id,
      'credit',
      'refund',
      NEW.total_amount,
      v_new_balance,
      'Refund for cancelled booking #' || SUBSTRING(NEW.id::text, 1, 8),
      NEW.id
    );

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

-- 8. Grant execution to authenticated + service_role only (no anon, no public).
REVOKE EXECUTE ON FUNCTION public.customer_cancel_booking(UUID, TEXT) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.customer_reschedule_booking(UUID, DATE, TEXT) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.release_partner_assignment(UUID, UUID, BOOLEAN) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.customer_cancel_booking(UUID, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.customer_reschedule_booking(UUID, DATE, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.release_partner_assignment(UUID, UUID, BOOLEAN) TO authenticated, service_role;