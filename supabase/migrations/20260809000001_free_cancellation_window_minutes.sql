-- ═══════════════════════════════════════════════════════════════
-- Free Cancellation Window — Numeric Minutes Setting
-- Created: 2026-08-09
-- Purpose: Replace free-text `free_cancellation_window` string with a
--          reliable numeric `free_cancellation_window_minutes` key.
--          The server (SECURITY DEFINER RPC) uses this WITHOUT client input.
--          The legacy free-text key is preserved for migration/display only.
-- ═══════════════════════════════════════════════════════════════

-- 1. Parser for legacy free-text values (e.g. "15 Minutes", "2 Hours", "1 Day").
--    Numeric-only values are treated as minutes. Returns NULL on unparseable input.
CREATE OR REPLACE FUNCTION public.parse_free_cancellation_minutes(p_value TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_num       NUMERIC;
  v_matches   TEXT[];
  v_unit      TEXT;
  v_minutes   NUMERIC;
BEGIN
  IF p_value IS NULL OR BTRIM(p_value) = '' THEN
    RETURN NULL;
  END IF;

  -- Try a pure integer first (interpreted as minutes).
  BEGIN
    v_num := BTRIM(p_value)::NUMERIC;
    IF v_num > 0 THEN
      RETURN GREATEST(1, FLOOR(v_num)::INTEGER);
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL; -- fall through to unit parsing
  END;

  -- Example matches: "15 Minutes", "15 min", "2 Hours", "1 Hour", "1 Day", "0.5 day"
  v_matches := regexp_match(LOWER(BTRIM(p_value)), '(\d+(?:\.\d+)?)\s*(minutes?|mins?|hrs?|hours?|days?|h|m)');
  IF v_matches IS NULL THEN
    RETURN NULL;
  END IF;

  v_num := v_matches[1]::NUMERIC;
  v_unit := v_matches[2];

  IF v_unit IN ('m', 'min', 'mins', 'minute', 'minutes') THEN
    v_minutes := v_num;
  ELSIF v_unit IN ('h', 'hr', 'hrs', 'hour', 'hours') THEN
    v_minutes := v_num * 60;
  ELSIF v_unit IN ('day', 'days') THEN
    v_minutes := v_num * 24 * 60;
  ELSE
    RETURN NULL;
  END IF;

  IF v_minutes <= 0 THEN
    RETURN NULL;
  END IF;

  RETURN GREATEST(1, CEIL(v_minutes)::INTEGER);
END;
$$;

-- 2. Force the numeric key to the default (15 minutes) everywhere.
--    Product decision: the free-cancellation window is 15 minutes for all
--    installs. The RPC reads this via get_free_cancellation_window_minutes().
INSERT INTO public.platform_settings (key, value, updated_at)
VALUES ('free_cancellation_window_minutes', '15'::jsonb, now())
ON CONFLICT (key) DO UPDATE
  SET value      = EXCLUDED.value,
      updated_at = now();

-- 3. Sync the legacy display key so admin UI / platform settings display match
--    the enforced behavior. It is display-only now (RPCs use the numeric key).
INSERT INTO public.platform_settings (key, value, updated_at)
VALUES ('free_cancellation_window', '"15 Minutes"'::jsonb, now())
ON CONFLICT (key) DO UPDATE
  SET value      = '"15 Minutes"'::jsonb,
      updated_at = now();

-- 4. Helper: authoritative window lookup used by cancellation RPCs.
CREATE OR REPLACE FUNCTION public.get_free_cancellation_window_minutes()
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT (value #>> '{}')::INTEGER
       FROM public.platform_settings
      WHERE key = 'free_cancellation_window_minutes' AND (value #>> '{}') ~ '^\d+$'),
    15
  );
$$;