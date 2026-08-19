-- ═══════════════════════════════════════════════════════════════
-- Add 'upcoming' value to service_status enum
-- Created: 2026-08-19
-- Purpose:
--   * Add a third service_status value 'upcoming' for "Coming Soon"
--     teaser services.
-- IMPORTANT: This MUST be its own migration. PostgreSQL does not allow
--   a newly-added enum value to be used (policies, defaults, inserts)
--   within the same transaction that added it (error 55P04). By
--   committing this file first, the follow-up migration
--   (20260819000000_upcoming_services_and_waitlist.sql) can safely
--   reference 'upcoming'.
-- ═══════════════════════════════════════════════════════════════

ALTER TYPE public.service_status ADD VALUE IF NOT EXISTS 'upcoming';
