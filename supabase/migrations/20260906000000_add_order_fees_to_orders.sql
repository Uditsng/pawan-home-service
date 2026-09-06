-- ═══════════════════════════════════════════════════════════════
-- Order Fees Snapshot Migration
-- Created: 2026-09-06
-- Purpose: Add order_fees JSONB snapshot column to public.orders table
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS order_fees JSONB NOT NULL DEFAULT '[]'::jsonb;
