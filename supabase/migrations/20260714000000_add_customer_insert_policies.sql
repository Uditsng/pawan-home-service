-- ═══════════════════════════════════════════════════════════════
-- Add missing customer INSERT policies for payments and booking_events
-- Created: 2026-07-14
-- Purpose: Allow authenticated customers to insert their own payment
--          and booking_event records during checkout verification.
-- ═══════════════════════════════════════════════════════════════

-- 1. Allow customers to insert their own payment records
DROP POLICY IF EXISTS "Customers insert own payments" ON public.payments;
CREATE POLICY "Customers insert own payments" ON public.payments
  FOR INSERT TO authenticated
  WITH CHECK (customer_id = auth.uid());

-- 2. Allow customers to insert booking events for their own bookings
DROP POLICY IF EXISTS "Customers insert own booking_events" ON public.booking_events;
CREATE POLICY "Customers insert own booking_events" ON public.booking_events
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.bookings
      WHERE id = booking_id AND customer_id = auth.uid()
    )
  );
