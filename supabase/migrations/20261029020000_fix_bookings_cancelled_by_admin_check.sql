-- ════════════════════════════════════════════════════════════════════════════
-- Migration: Add 'ADMIN' to bookings_cancelled_by_check Constraint
-- File: 20261029020000_fix_bookings_cancelled_by_admin_check.sql
--
-- Defect:
--   When an Admin force-cancels a booking via the Admin Portal,
--   public.admin_cancel_booking() updates cancelled_by = 'ADMIN'.
--   However, bookings_cancelled_by_check previously only permitted
--   ('USER', 'PARTNER', 'SYSTEM'), resulting in:
--   ERROR 23514: new row for relation "bookings" violates check constraint "bookings_cancelled_by_check"
--
-- Fix:
--   Drop and re-add bookings_cancelled_by_check to permit 'ADMIN' alongside
--   'USER', 'PARTNER', and 'SYSTEM' (and NULL for active/non-cancelled bookings).
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.bookings
  DROP CONSTRAINT IF EXISTS bookings_cancelled_by_check;

ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_cancelled_by_check
  CHECK (cancelled_by IS NULL OR cancelled_by IN ('USER', 'PARTNER', 'SYSTEM', 'ADMIN'));
