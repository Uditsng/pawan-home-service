-- ═══════════════════════════════════════════════════════════════
-- Supabase-Backed Rate Limiting
-- Created: 2026-06-04
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.rate_limits (
  key TEXT PRIMARY KEY,
  count INTEGER DEFAULT 1,
  reset_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Enable RLS on rate_limits
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Allow full access to admins/service role
DROP POLICY IF EXISTS "Admins have full access to rate_limits" ON public.rate_limits;
CREATE POLICY "Admins have full access to rate_limits" ON public.rate_limits
  FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

-- Security definer to safely handle rate limiting transactions
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_key text,
  p_max_requests integer,
  p_window_seconds integer
)
RETURNS TABLE (
  is_allowed boolean,
  retry_after_seconds integer
) SECURITY DEFINER AS $$
DECLARE
  v_now timestamp with time zone;
  v_entry RECORD;
  v_retry_after integer;
BEGIN
  v_now := now();
  v_retry_after := 0;

  -- Select and lock the rate limit entry to prevent race conditions
  SELECT * INTO v_entry FROM public.rate_limits WHERE key = p_key FOR UPDATE;

  IF NOT FOUND THEN
    -- If no entry, insert a new one and allow
    INSERT INTO public.rate_limits (key, count, reset_at)
    VALUES (p_key, 1, v_now + (p_window_seconds || ' seconds')::interval);
    
    RETURN QUERY SELECT true, 0;
    RETURN;
  ELSIF v_now > v_entry.reset_at THEN
    -- If entry expired, reset it and allow
    UPDATE public.rate_limits
    SET count = 1, reset_at = v_now + (p_window_seconds || ' seconds')::interval
    WHERE key = p_key;
    
    RETURN QUERY SELECT true, 0;
    RETURN;
  ELSIF v_entry.count >= p_max_requests THEN
    -- If max requests reached, deny and calculate retry_after
    v_retry_after := CEIL(EXTRACT(EPOCH FROM (v_entry.reset_at - v_now)))::integer;
    IF v_retry_after < 0 THEN
      v_retry_after := 0;
    END IF;
    
    RETURN QUERY SELECT false, v_retry_after;
    RETURN;
  ELSE
    -- If within limit, increment count and allow
    UPDATE public.rate_limits
    SET count = v_entry.count + 1
    WHERE key = p_key;
    
    RETURN QUERY SELECT true, 0;
    RETURN;
  END IF;
END;
$$ LANGUAGE plpgsql;
