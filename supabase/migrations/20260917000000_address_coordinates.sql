-- ═══════════════════════════════════════════════════════════════
-- Exact Location Coordinates Migration
-- Created: 2026-09-17
-- Purpose: Enable "Pick Exact Location" for addresses.
--   1. user_addresses already carries latitude/longitude in the schema;
--      backfill legacy "0,0" placeholders to NULL (never store 0).
--   2. Add nullable latitude/longitude to orders and bookings so the
--      coordinates snapshot at checkout time and the Pro can navigate.
-- ═══════════════════════════════════════════════════════════════

-- ─── 1. user_addresses: ensure columns exist ──────────────────
ALTER TABLE public.user_addresses
  ADD COLUMN IF NOT EXISTS latitude  NUMERIC(10, 7),
  ADD COLUMN IF NOT EXISTS longitude NUMERIC(10, 7);

-- Pre-existing columns were created NOT NULL — coordinates are now optional.
ALTER TABLE public.user_addresses
  ALTER COLUMN latitude  DROP NOT NULL,
  ALTER COLUMN longitude DROP NOT NULL;

-- Drop any legacy DEFAULT 0 so no insert path can write placeholder zeros.
ALTER TABLE public.user_addresses
  ALTER COLUMN latitude  DROP DEFAULT,
  ALTER COLUMN longitude DROP DEFAULT;

-- Backfill legacy hardcoded 0,0 → NULL
UPDATE public.user_addresses
SET latitude = NULL, longitude = NULL
WHERE latitude = 0 AND longitude = 0;

-- Range safety (idempotent replace)
ALTER TABLE public.user_addresses
  DROP CONSTRAINT IF EXISTS user_addresses_latitude_range_check;
ALTER TABLE public.user_addresses
  ADD CONSTRAINT user_addresses_latitude_range_check
  CHECK (latitude IS NULL OR (latitude >= -90 AND latitude <= 90));

ALTER TABLE public.user_addresses
  DROP CONSTRAINT IF EXISTS user_addresses_longitude_range_check;
ALTER TABLE public.user_addresses
  ADD CONSTRAINT user_addresses_longitude_range_check
  CHECK (longitude IS NULL OR (longitude >= -180 AND longitude <= 180));

-- ─── 2. bookings: snapshot coordinates at booking time ────────
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS latitude  NUMERIC(10, 7),
  ADD COLUMN IF NOT EXISTS longitude NUMERIC(10, 7);

ALTER TABLE public.bookings
  ALTER COLUMN latitude  DROP NOT NULL,
  ALTER COLUMN longitude DROP NOT NULL;

ALTER TABLE public.bookings
  DROP CONSTRAINT IF EXISTS bookings_latitude_range_check;
ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_latitude_range_check
  CHECK (latitude IS NULL OR (latitude >= -90 AND latitude <= 90));

ALTER TABLE public.bookings
  DROP CONSTRAINT IF EXISTS bookings_longitude_range_check;
ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_longitude_range_check
  CHECK (longitude IS NULL OR (longitude >= -180 AND longitude <= 180));

-- ─── 3. orders: snapshot coordinates at order creation ────────
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS latitude  NUMERIC(10, 7),
  ADD COLUMN IF NOT EXISTS longitude NUMERIC(10, 7);

ALTER TABLE public.orders
  ALTER COLUMN latitude  DROP NOT NULL,
  ALTER COLUMN longitude DROP NOT NULL;

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_latitude_range_check;
ALTER TABLE public.orders
  ADD CONSTRAINT orders_latitude_range_check
  CHECK (latitude IS NULL OR (latitude >= -90 AND latitude <= 90));

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_longitude_range_check;
ALTER TABLE public.orders
  ADD CONSTRAINT orders_longitude_range_check
  CHECK (longitude IS NULL OR (longitude >= -180 AND longitude <= 180));

-- Indexes for partner-side lookups on a single pincode/area
CREATE INDEX IF NOT EXISTS idx_bookings_latitude_longitude
  ON public.bookings (latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_orders_latitude_longitude
  ON public.orders (latitude, longitude);