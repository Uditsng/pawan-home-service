-- ═══════════════════════════════════════════════════════════════
-- Performance Indexes Migration
-- Created: 2026-06-03
-- Purpose: Add critical indexes to eliminate full table scans
--          on bookings, services, profiles, and partner tables.
-- ═══════════════════════════════════════════════════════════════

-- ─── BOOKINGS TABLE ───────────────────────────────────────────
-- Most queried table: dashboards, listings, filters, analytics

CREATE INDEX IF NOT EXISTS idx_bookings_status
  ON bookings (status);

CREATE INDEX IF NOT EXISTS idx_bookings_customer_id
  ON bookings (customer_id);

CREATE INDEX IF NOT EXISTS idx_bookings_partner_id
  ON bookings (partner_id);

CREATE INDEX IF NOT EXISTS idx_bookings_service_id
  ON bookings (service_id);

CREATE INDEX IF NOT EXISTS idx_bookings_created_at
  ON bookings (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_bookings_scheduled_date
  ON bookings (scheduled_date);

CREATE INDEX IF NOT EXISTS idx_bookings_completed_at
  ON bookings (completed_at);

CREATE INDEX IF NOT EXISTS idx_bookings_city
  ON bookings (city);

CREATE INDEX IF NOT EXISTS idx_bookings_pincode
  ON bookings (pincode);

-- Composite: partner dashboard (partner + status)
CREATE INDEX IF NOT EXISTS idx_bookings_partner_status
  ON bookings (partner_id, status);

-- Composite: admin analytics (date range + status)
CREATE INDEX IF NOT EXISTS idx_bookings_created_status
  ON bookings (created_at, status);

-- ─── SERVICES TABLE ───────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_services_is_active
  ON services (is_active);

CREATE INDEX IF NOT EXISTS idx_services_subcategory_id
  ON services (subcategory_id);

-- ─── PROFILES TABLE ──────────────────────────────────────────
-- (phone and email indexes already exist from prior migration)

CREATE INDEX IF NOT EXISTS idx_profiles_role
  ON profiles (role);

CREATE INDEX IF NOT EXISTS idx_profiles_role_status
  ON profiles (role, status);

-- ─── PARTNER SERVICES (junction table) ───────────────────────

CREATE INDEX IF NOT EXISTS idx_partner_services_partner_id
  ON partner_services (partner_id);

CREATE INDEX IF NOT EXISTS idx_partner_services_service_id
  ON partner_services (service_id);

-- ─── PARTNER SERVICE AREAS ───────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_partner_service_areas_partner_id
  ON partner_service_areas (partner_id);

CREATE INDEX IF NOT EXISTS idx_partner_service_areas_pincode
  ON partner_service_areas (pincode);

-- ─── USER ADDRESSES ──────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_user_addresses_user_id
  ON user_addresses (user_id);

CREATE INDEX IF NOT EXISTS idx_user_addresses_default
  ON user_addresses (user_id, is_default);

-- ─── BOOKING EVENTS ──────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_booking_events_booking_id
  ON booking_events (booking_id);

-- ─── BOOKING REJECTIONS ──────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_booking_rejections_booking_id
  ON booking_rejections (booking_id);

CREATE INDEX IF NOT EXISTS idx_booking_rejections_partner_id
  ON booking_rejections (partner_id);

-- ─── SUBCATEGORIES ───────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_subcategories_category_id
  ON subcategories (category_id);
