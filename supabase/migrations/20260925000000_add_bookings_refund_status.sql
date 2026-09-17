-- ════════════════════════════════════════════════════════════════════════════
-- Migration: Add missing bookings refund/cancellation columns
-- File: 20260925000000_add_bookings_refund_status.sql
--
-- Root cause of "Could not cancel the booking. Please try again.":
--   customer_cancel_booking() writes these columns in its UPDATE:
--       cancelled_at, cancellation_reason, refund_status
--   but NO migration (and not the base bookings table) ever created them.
--   The RPC therefore throws at runtime:
--       ERROR: 42703: column "refund_status" of relation "bookings" does not exist
--   which the server action cannot map -> the generic user-facing message.
--
--   `refund_status` is referenced only by
--     20260823000005_fix_redispatch_state_transitions.sql and
--     20260924000000_fix_customer_cancel_booking_rpc.sql.
--
-- Fix: create the columns idempotently. All are nullable so existing rows and
-- every other booking path are unaffected.
--
-- Documented refund_status domain:
--   'non_refundable'  -> cancelled outside the free window
--   'pending'         -> refund owed (booking was paid)  [set by cancel RPC]
--   'not_applicable'  -> unpaid booking, nothing to refund
--   'refunded'        -> auto-credited to wallet [set by
--                        20260926000000_proportional_cancellation_refund.sql]
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS refund_status       TEXT,
  ADD COLUMN IF NOT EXISTS cancelled_at        TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
  ADD COLUMN IF NOT EXISTS cancelled_by        TEXT;

-- The partner-score RPCs filter on cancelled_by = 'PARTNER' / 'USER'; an index
-- keeps that scan cheap on large booking tables.
CREATE INDEX IF NOT EXISTS idx_bookings_cancelled_by
  ON public.bookings (cancelled_by)
  WHERE cancelled_by IS NOT NULL;
