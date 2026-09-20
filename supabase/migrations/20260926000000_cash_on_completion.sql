-- ═══════════════════════════════════════════════════════════════
-- Cash on Completion ("Pay with Cash")
-- Created: 2026-09-26
-- Purpose: Support cash-after-service bookings. At checkout the customer
--          may choose "Pay Cash to Professional"; the booking is created
--          with payment_status 'pending' + payment_method 'Cash' and flips
--          to 'paid' only when the partner confirms cash was received
--          (or an admin marks it received).
--
-- bookings.payment_status ALREADY allows 'pending' (20260614000000).
-- bookings.payment_method  ALREADY exists   (20260621000000, DEFAULT 'Cash').
-- Only the confirmation timestamp below is new.
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS cash_received_at TIMESTAMPTZ;