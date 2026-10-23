-- ════════════════════════════════════════════════════════════════════════════
-- Migration: Fix Cancellation Policy, Window Calculation & 10% Fee (BUG-09)
-- File: 20261002050000_fix_cancellation_policy_and_fee.sql
--
-- Defect:
--   Previously, customer_cancel_booking evaluated cancellation refund eligibility
--   using EXTRACT(EPOCH FROM (now() - v_booking.created_at)) / 60.0 <= 15 minutes.
--   Any cancellation beyond 15 minutes after *booking creation* resulted in
--   100% forfeiture of payment (0% refund), even if the service was scheduled
--   5 days in advance!
--
-- Policy Specification (docs/workflows/booking-lifecycle.md):
--   Tier 1 (Instant Grace Period): Cancelled within 15 minutes of booking creation
--          -> 100% refund (0% fee), plus order fee if closing order.
--   Tier 2 (Advance Cancellation): Cancelled > 15 min after creation, but at least
--          30 minutes before scheduled service time (scheduled_date - now >= 30 min)
--          -> 90% refund (10% platform cancellation fee deducted).
--   Tier 3 (Late Cancellation): Cancelled < 30 minutes before service time
--          -> 0% refund (100% fee retained as Pro is already en route/ready).
-- ════════════════════════════════════════════════════════════════════════════

-- 1. Add cancellation_fee and refund_amount columns to public.bookings
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS cancellation_fee NUMERIC(10, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS refund_amount    NUMERIC(10, 2) DEFAULT 0;

-- 2. Update customer_cancel_booking RPC
CREATE OR REPLACE FUNCTION public.customer_cancel_booking(
  p_booking_id UUID,
  p_reason     TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking                 public.bookings%ROWTYPE;
  v_window_minutes          INTEGER;
  v_elapsed_since_create    NUMERIC;
  v_minutes_until_service   NUMERIC;
  v_refund_eligible         BOOLEAN;
  v_cancellation_fee        NUMERIC(10, 2) := 0;
  v_refund_amount           NUMERIC(10, 2) := 0;
  v_released                JSONB;
  v_reason                  TEXT;
  v_metadata                JSONB;
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

  -- Idempotent exit if already cancelled
  IF v_booking.status = 'cancelled' THEN
    RETURN jsonb_build_object(
      'success', true,
      'already_cancelled', true,
      'refund_eligible', COALESCE(v_booking.refund_eligible, false),
      'cancellation_fee', COALESCE(v_booking.cancellation_fee, 0),
      'refund_amount', COALESCE(v_booking.refund_amount, 0)
    );
  END IF;

  IF v_booking.status IN ('completed', 'expired', 'refunded') THEN
    RETURN jsonb_build_object('success', false, 'error', 'booking_not_cancellable');
  END IF;

  IF v_booking.status NOT IN ('pending', 'confirmed', 'assigned', 'accepted', 'reassigned') THEN
    RETURN jsonb_build_object('success', false, 'error', 'booking_not_cancellable');
  END IF;

  -- ── Refund Policy Evaluation ────────────────────────────────────────────────
  v_window_minutes        := public.get_free_cancellation_window_minutes();
  v_elapsed_since_create  := EXTRACT(EPOCH FROM (now() - v_booking.created_at)) / 60.0;
  v_minutes_until_service := CASE
    WHEN v_booking.scheduled_date IS NOT NULL
    THEN EXTRACT(EPOCH FROM (v_booking.scheduled_date - now())) / 60.0
    ELSE -1.0
  END;

  IF v_elapsed_since_create <= v_window_minutes THEN
    -- Tier 1: Within free cancellation grace period (100% refund, 0% fee)
    v_refund_eligible  := TRUE;
    v_cancellation_fee := 0.00;
    v_refund_amount    := COALESCE(v_booking.total_amount, 0);
  ELSIF v_minutes_until_service >= 30.0 THEN
    -- Tier 2: In advance (at least 30 min before service) -> 90% refund, 10% fee
    v_refund_eligible  := TRUE;
    v_cancellation_fee := ROUND(COALESCE(v_booking.total_amount, 0) * 0.10, 2);
    v_refund_amount    := GREATEST(0.00, COALESCE(v_booking.total_amount, 0) - v_cancellation_fee);
  ELSE
    -- Tier 3: Late cancellation (< 30 min before scheduled service) -> 0% refund
    v_refund_eligible  := FALSE;
    v_cancellation_fee := COALESCE(v_booking.total_amount, 0);
    v_refund_amount    := 0.00;
  END IF;

  v_reason := NULLIF(TRIM(p_reason), '');
  IF v_reason IS NULL THEN
    v_reason := 'Cancelled by customer';
  END IF;

  -- Release assigned partner (if any) and clear offers
  v_released := public.release_partner_assignment(p_booking_id, v_booking.partner_id, TRUE);

  UPDATE public.bookings
     SET status              = 'cancelled',
         dispatch_status     = 'cancelled',
         dispatch_locked_at  = NULL,
         cancelled_at        = now(),
         cancelled_by        = 'USER',
         cancellation_reason = v_reason,
         cancellation_fee    = v_cancellation_fee,
         refund_amount       = v_refund_amount,
         refund_eligible     = v_refund_eligible,
         refund_status       = CASE
                                 WHEN NOT v_refund_eligible THEN 'non_refundable'
                                 WHEN v_booking.payment_status = 'paid' THEN 'pending'
                                 ELSE 'not_applicable'
                               END
   WHERE id = p_booking_id;

  -- If all sibling bookings in this parent order are now terminal, update the order
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
    'cancellation_fee', v_cancellation_fee,
    'refund_amount', v_refund_amount,
    'cancelled_by', 'customer',
    'partner_released', COALESCE((v_released->>'released')::boolean, false),
    'released_partner_id', v_released->>'partner_id'
  );

  INSERT INTO public.booking_status_history (booking_id, status, changed_by, remarks)
  VALUES (p_booking_id, 'cancelled', auth.uid(), v_reason);

  INSERT INTO public.booking_events (booking_id, event_type, actor, metadata)
  VALUES (p_booking_id, 'BOOKING_CANCELLED', 'USER', v_metadata);

  RETURN jsonb_build_object(
    'success', true,
    'booking_id', p_booking_id,
    'refund_eligible', v_refund_eligible,
    'cancellation_fee', v_cancellation_fee,
    'refund_amount', v_refund_amount,
    'partner_released', COALESCE((v_released->>'released')::boolean, false),
    'released_partner_id', v_released->>'partner_id'
  );
END;
$$;

-- 3. Update handle_booking_cancellation_refund Trigger Function
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
  v_desc_suffix      TEXT           := '';
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

  -- Serialize sibling cancellations of the same order.
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
  SELECT COALESCE((metadata ->> 'cash_used')::NUMERIC, 0),
         COALESCE((metadata ->> 'bonus_used')::NUMERIC, 0)
    INTO v_wallet_cash, v_wallet_bonus
    FROM public.wallet_transactions
   WHERE source       = 'booking_discount'
     AND reference_id = COALESCE(v_order_id, NEW.id)
   ORDER BY created_at DESC
   LIMIT 1;

  v_wallet_total := COALESCE(v_wallet_cash, 0) + COALESCE(v_wallet_bonus, 0);

  -- ── 3. Refund amount calculation (accounting for cancellation_fee) ─────
  -- Net line refund after deducting cancellation fee
  v_refund_amount := GREATEST(0, COALESCE(NEW.total_amount, 0) - COALESCE(NEW.cancellation_fee, 0))
                     + CASE WHEN v_is_closing AND COALESCE(NEW.cancellation_fee, 0) = 0 THEN v_order_fees_total ELSE 0 END;

  IF v_refund_amount <= 0 THEN
    NEW.payment_status := 'refunded';
    NEW.refund_status  := 'refunded';
    NEW.refund_amount  := 0.00;
    RETURN NEW;
  END IF;

  IF v_gross > 0 AND v_wallet_total > 0 THEN
    v_wallet_slice := LEAST(v_refund_amount, ROUND(v_wallet_total * (v_refund_amount / v_gross), 2));

    IF v_wallet_total > 0 THEN
      v_wallet_cash_part := ROUND(v_wallet_slice * (v_wallet_cash / v_wallet_total), 2);
      v_bonus_part       := v_wallet_slice - v_wallet_cash_part;
    END IF;
  END IF;

  -- Cash = external (Razorpay) portion + the wallet's original CASH portion.
  v_cash_part := GREATEST(0, v_refund_amount - v_wallet_slice) + v_wallet_cash_part;

  IF COALESCE(NEW.cancellation_fee, 0) > 0 THEN
    v_desc_suffix := ' (after 10% cancellation fee)';
  END IF;

  -- ── 4. Credit via credit_wallet ────────────────────────────────────────
  IF v_cash_part > 0 THEN
    v_credit := public.credit_wallet(
      p_user_id      => NEW.customer_id,
      p_amount       => v_cash_part,
      p_source       => 'refund',
      p_reference_id => NEW.id,
      p_metadata     => jsonb_build_object(
                          'booking_id',       NEW.id,
                          'order_id',         v_order_id,
                          'kind',             'booking_refund',
                          'cancellation_fee', COALESCE(NEW.cancellation_fee, 0),
                          'balance',          'cash'
                        ),
      p_description  => 'Refund for cancelled booking #' || SUBSTRING(NEW.id::text, 1, 8) || v_desc_suffix,
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
                          'booking_id',       NEW.id,
                          'order_id',         v_order_id,
                          'kind',             'booking_refund',
                          'cancellation_fee', COALESCE(NEW.cancellation_fee, 0),
                          'balance',          'bonus'
                        ),
      p_description  => 'Bonus refund for cancelled booking #' || SUBSTRING(NEW.id::text, 1, 8) || v_desc_suffix,
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
    NEW.refund_amount  := v_refund_amount;
  END IF;

  RETURN NEW;
END;
$$;
