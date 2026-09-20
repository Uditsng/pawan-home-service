-- 20260923000000_wallet_booking_discount_idempotency.sql
-- Free (wallet-only) checkout short-circuits the Razorpay gateway, so the
-- previous duplicate-verify guard (a payments row per razorpay_order_id) does
-- not apply. Repeated/racing verify calls on the same order could otherwise
-- debit the wallet twice for one booking.
--
-- use_wallet_balance writes a wallet_transactions row with
--   source = 'booking_discount'
--   reference_id = p_booking_id (= orders.id)
-- This partial unique index makes that debit exactly-once per (user, order):
-- a second attempt for the same order raises a unique_violation inside the
-- RPC, which the payment action treats as a wallet failure and rolls back —
-- the server never double-charges a wallet-only booking.

CREATE UNIQUE INDEX IF NOT EXISTS uq_wallet_tx_booking_discount
  ON public.wallet_transactions (user_id, reference_id)
  WHERE source = 'booking_discount' AND reference_id IS NOT NULL;