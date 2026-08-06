-- ═══════════════════════════════════════════════════════════════
-- Real-Time Search Analytics Migration
-- Created: 2026-08-06
-- ═══════════════════════════════════════════════════════════════

-- ─── 1. CREATE search_queries table ─────────────────────────────
-- Tracks every real search performed on the platform so the customer
-- search page can surface genuinely popular queries.

CREATE TABLE IF NOT EXISTS public.search_queries (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  normalized       TEXT NOT NULL UNIQUE,
  query            TEXT NOT NULL,
  search_count     BIGINT NOT NULL DEFAULT 1,
  last_searched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── 2. RLS ─────────────────────────────────────────────────────
-- The search page is public, so reads are open. All writes flow
-- through the security-definer record_search() RPC below.

ALTER TABLE public.search_queries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "search_queries_read_public" ON public.search_queries;
CREATE POLICY "search_queries_read_public"
  ON public.search_queries
  FOR SELECT
  USING (true);

-- ─── 3. record_search RPC ───────────────────────────────────────
-- Upserts a search term and increments its counter.

CREATE OR REPLACE FUNCTION public.record_search(p_term TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_norm TEXT;
  v_query TEXT;
BEGIN
  v_query := left(btrim(p_term), 100);
  v_norm := lower(v_query);

  IF v_norm = '' THEN
    RETURN;
  END IF;

  INSERT INTO public.search_queries (normalized, query, search_count)
  VALUES (v_norm, v_query, 1)
  ON CONFLICT (normalized)
  DO UPDATE SET
    query = EXCLUDED.query,
    search_count = public.search_queries.search_count + 1,
    last_searched_at = now();
END;
$$;

-- ─── 4. get_popular_search_terms RPC ────────────────────────────
-- Returns real search terms ranked by volume. Falls back to the most
-- booked published services so the section is never empty on a cold
-- start before any searches have been recorded.

CREATE OR REPLACE FUNCTION public.get_popular_search_terms(p_limit INT DEFAULT 8)
RETURNS TABLE (term TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_limit INT := GREATEST(1, LEAST(20, COALESCE(p_limit, 8)));
BEGIN
  IF EXISTS (SELECT 1 FROM public.search_queries) THEN
    RETURN QUERY
      SELECT q.query::TEXT
      FROM public.search_queries q
      ORDER BY q.search_count DESC, q.last_searched_at DESC
      LIMIT v_limit;
  ELSE
    RETURN QUERY
      SELECT s.title::TEXT
      FROM public.services s
      WHERE s.is_active = TRUE AND s.status = 'published'
      ORDER BY
        (SELECT COUNT(*) FROM public.bookings b WHERE b.service_id = s.id) DESC,
        s.created_at DESC
      LIMIT v_limit;
  END IF;
END;
$$;

-- ─── 5. Grants ──────────────────────────────────────────────────

GRANT EXECUTE ON FUNCTION public.record_search(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_popular_search_terms(INT) TO anon, authenticated;
GRANT SELECT ON public.search_queries TO anon, authenticated;
