-- ════════════════════════════════════════════════════════════════════════════
-- Dynamic Booking Time Slots — Zero-Deployment Schedule Config
-- File: 20260930000000_dynamic_booking_time_slots.sql
-- Purpose:
--   * Booking operating hours + slot intervals become fully config-driven via
--     a single row in public.platform_settings (key = 'booking_schedule_config').
--     Editing that row in the Supabase Dashboard instantly changes the schedule
--     everywhere — no code change or redeploy required.
--   * Rewrites parse_slot_timestamp to validate against that config instead of
--     the hardcoded "7:00 AM - 9:00 PM / 30-minute" bounds.
-- ════════════════════════════════════════════════════════════════════════════

-- 1. Seed the schedule configuration with legacy-parity defaults so slots
--    stay identical until an operator edits the row. NEVER overwrite an
--    existing value (an admin may already have customised it in the Dashboard).
--
--    Schema (all values are JSON numbers):
--      startHour           -> first bookable hour (0-23)
--      endHour             -> last bookable hour, INCLUSIVE (0-23)
--      intervalMinutes     -> slot cadence (e.g. 30, 45, 60)
--      afternoonStartHour  -> UI grouping: slots at/after this hour show as
--                             "Afternoon" (display only, never validated)
INSERT INTO public.platform_settings (key, value, updated_at)
VALUES (
  'booking_schedule_config',
  '{"startHour": 7, "endHour": 21, "intervalMinutes": 30, "afternoonStartHour": 12}'::jsonb,
  now()
)
ON CONFLICT (key) DO NOTHING;

-- 2. Config-driven slot parser → timestamptz (Asia/Kolkata). NULL when invalid.
--    INTENTIONAL volatility change: IMMUTABLE -> STABLE because the function now
--    reads platform_settings. It has no index/generated-column/GRANT dependents,
--    so this is safe. Any malformed or out-of-range config falls back to the
--    legacy defaults below (7 AM - 9 PM inclusive, 30-minute intervals).
CREATE OR REPLACE FUNCTION public.parse_slot_timestamp(p_date DATE, p_time TEXT)
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_tok     TEXT[];
  v_hour    INTEGER;
  v_min     INTEGER;
  v_cfg     JSONB;
  v_start   INTEGER := 7;   -- first bookable hour
  v_end     INTEGER := 21;  -- last bookable hour (inclusive)
  v_step    INTEGER := 30;  -- slot interval in minutes
  v_slot    INTEGER;
BEGIN
  IF p_date IS NULL OR p_time IS NULL THEN
    RETURN NULL;
  END IF;

  v_cfg := COALESCE(
    (SELECT value FROM public.platform_settings WHERE key = 'booking_schedule_config' LIMIT 1),
    '{}'::jsonb
  );

  -- Regex-guarded casts so a non-numeric config value degrades to defaults
  -- instead of raising an exception inside the RPC.
  IF (v_cfg->>'startHour') ~ '^-?\d+$' THEN
    v_start := (v_cfg->>'startHour')::INTEGER;
  END IF;
  IF (v_cfg->>'endHour') ~ '^-?\d+$' THEN
    v_end := (v_cfg->>'endHour')::INTEGER;
  END IF;
  IF (v_cfg->>'intervalMinutes') ~ '^-?\d+$' THEN
    v_step := (v_cfg->>'intervalMinutes')::INTEGER;
  END IF;

  -- Sanitise: out-of-range hours or a degenerate (inverted/empty) window fall
  -- back to the legacy defaults.
  IF v_start < 0 OR v_start > 23 OR v_end < 0 OR v_end > 23 OR v_start >= v_end THEN
    v_start := 7;
    v_end   := 21;
  END IF;
  IF v_step <= 0 OR v_step > 240 THEN
    v_step := 30;
  END IF;

  v_tok := regexp_match(UPPER(BTRIM(p_time)), '^(\d{1,2}):(\d{2})\s*(AM|PM)$');
  IF v_tok IS NULL THEN
    RETURN NULL;
  END IF;

  v_hour := v_tok[1]::INTEGER;
  v_min  := v_tok[2]::INTEGER;

  -- Reject nonsensical clock values before the AM/PM conversion.
  IF v_hour > 23 OR v_min > 59 THEN
    RETURN NULL;
  END IF;

  IF v_tok[3] = 'PM' AND v_hour <> 12 THEN
    v_hour := v_hour + 12;
  ELSIF v_tok[3] = 'AM' AND v_hour = 12 THEN
    v_hour := 0;
  END IF;

  v_slot := v_hour * 60 + v_min;

  -- Slot must fall inside the inclusive [startHour, endHour] window AND align
  -- with the configured interval (mirrors the client generator exactly).
  IF v_slot < v_start * 60 OR v_slot > v_end * 60 THEN
    RETURN NULL;
  END IF;
  IF (v_slot - v_start * 60) % v_step <> 0 THEN
    RETURN NULL;
  END IF;

  RETURN (p_date::TIMESTAMP + make_interval(hours => v_hour, mins => v_min)) AT TIME ZONE 'Asia/Kolkata';
END;
$$;