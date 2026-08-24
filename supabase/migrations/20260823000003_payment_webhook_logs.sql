-- ════════════════════════════════════════════════════════════════════════════
-- Migration: Payment Webhook Events & Atomic Claim Recovery
-- File: 20260823000003_payment_webhook_logs.sql
-- Purpose:
--   1. Create payment_webhook_events table for strict idempotency and audit logs.
--   2. Atomic claim routine with automatic recovery for crashed processors.
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.payment_webhook_events (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id            TEXT NOT NULL UNIQUE,
  event_type          TEXT NOT NULL,
  razorpay_order_id   TEXT,
  razorpay_payment_id TEXT,
  status              TEXT NOT NULL DEFAULT 'processing'
    CHECK (status IN ('processing', 'processed', 'failed', 'unmatched_order')),
  payload             JSONB NOT NULL,
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now(),
  processed_at        TIMESTAMPTZ
);

-- Index on order ID for fast reconciliation lookup
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_order_id
  ON public.payment_webhook_events (razorpay_order_id);

-- Atomic Claim Function for Webhook Delivery
-- Returns { claimed: true, event_record_id: UUID } if this request claims ownership.
-- Recovers stale 'processing' events after p_stale_timeout_sec (default 5 min).
CREATE OR REPLACE FUNCTION public.claim_payment_webhook_event(
  p_event_id            TEXT,
  p_event_type          TEXT,
  p_razorpay_order_id   TEXT,
  p_razorpay_payment_id TEXT,
  p_payload             JSONB,
  p_stale_timeout_sec   INTEGER DEFAULT 300
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rec_id UUID;
BEGIN
  -- Attempt initial insert
  INSERT INTO public.payment_webhook_events (
    event_id, event_type, razorpay_order_id, razorpay_payment_id, status, payload, updated_at
  )
  VALUES (
    p_event_id, p_event_type, p_razorpay_order_id, p_razorpay_payment_id, 'processing', p_payload, NOW()
  )
  ON CONFLICT (event_id) DO UPDATE
    SET status     = 'processing',
        updated_at = NOW()
    WHERE public.payment_webhook_events.status IN ('processing', 'failed')
      AND public.payment_webhook_events.updated_at <= (NOW() - (p_stale_timeout_sec || ' seconds')::INTERVAL)
  RETURNING id INTO v_rec_id;

  IF v_rec_id IS NOT NULL THEN
    RETURN jsonb_build_object('claimed', true, 'event_record_id', v_rec_id);
  ELSE
    RETURN jsonb_build_object('claimed', false, 'reason', 'already_processed_or_actively_processing');
  END IF;
END;
$$;
