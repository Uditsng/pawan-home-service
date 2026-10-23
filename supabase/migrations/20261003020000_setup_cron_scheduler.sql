-- ════════════════════════════════════════════════════════════════════════════
-- Migration: Setup Cron Scheduler & In-Database Dispatch Escalator (BUG-14)
-- File: 20261003020000_setup_cron_scheduler.sql
--
-- Problem:
--   1. Dispatch escalation (/api/dispatch/cron) requires execution every 45-60s
--      to escalate unaccepted broadcast job offers to the next tier of partners.
--   2. Vercel Cron on hobby plans only executes once daily, and without vercel.json
--      zero automated schedules were registered.
--   3. External HTTP-only cron dependencies can fail due to timeouts, network
--      glitches, or edge function cold starts.
--
-- Fix:
--   1. Create `public.escalate_dispatch_cycle` RPC:
--      - High-performance, concurrency-safe in-database dispatch escalator.
--      - Uses `FOR UPDATE OF b SKIP LOCKED` to prevent duplicate processing.
--      - Claims next tier, fetches top-ranked unoffered partners via `get_dispatch_batch`,
--        creates `booking_job_offers`, inserts in-app partner notifications, and confirms
--        broadcasting tier or marks dispatch exhausted (alerting admins).
--   2. Enable `pg_cron` and `pg_net` extensions safely (if supported by environment).
--   3. Provide `public.schedule_dispatch_cron` helper to register pg_cron jobs
--      directly inside PostgreSQL for native, zero-network-overhead scheduling.
-- ════════════════════════════════════════════════════════════════════════════

-- ─── 1. IN-DATABASE DISPATCH ESCALATION ENGINE ──────────────────────────────

CREATE OR REPLACE FUNCTION public.escalate_dispatch_cycle(
  p_response_window_sec INTEGER DEFAULT 45,
  p_max_tiers           INTEGER DEFAULT 10
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking           RECORD;
  v_next_tier         INTEGER;
  v_claim_res         JSONB;
  v_partner           RECORD;
  v_partner_count     INTEGER;
  v_dispatched_total  INTEGER := 0;
  v_processed_count   INTEGER := 0;
  v_exhausted_count   INTEGER := 0;
  v_results           JSONB[] := '{}';
BEGIN
  -- Scan pending bookings due for tier escalation (both online paid & cash on completion)
  FOR v_booking IN
    SELECT b.id, b.broadcast_tier, b.dispatch_status, b.pincode,
           COALESCE(s.title, 'Service') AS service_title
      FROM public.bookings b
      LEFT JOIN public.services s ON s.id = b.service_id
     WHERE b.status = 'pending'
       AND b.partner_id IS NULL
       AND b.dispatch_status IN ('broadcasting', 'failed')
       AND (b.payment_status = 'paid' OR LOWER(COALESCE(b.payment_method, '')) = 'cash')
       AND (b.last_broadcast_at IS NULL OR b.last_broadcast_at <= (NOW() - (p_response_window_sec || ' seconds')::INTERVAL))
       AND COALESCE(b.broadcast_tier, 0) < p_max_tiers
     ORDER BY b.last_broadcast_at ASC NULLS FIRST
     FOR UPDATE OF b SKIP LOCKED
  LOOP
    v_next_tier := COALESCE(v_booking.broadcast_tier, 0) + 1;
    v_processed_count := v_processed_count + 1;

    -- Phase 1: Atomically claim tier
    v_claim_res := public.claim_dispatch_tier(
      v_booking.id,
      v_next_tier,
      p_response_window_sec,
      60
    );

    IF (v_claim_res->>'claimed')::BOOLEAN IS NOT TRUE THEN
      CONTINUE;
    END IF;

    -- Phase 2: Find eligible unoffered partners & generate job offers
    v_partner_count := 0;

    FOR v_partner IN
      SELECT partner_id FROM public.get_dispatch_batch(v_booking.id, 10)
    LOOP
      INSERT INTO public.booking_job_offers (booking_id, partner_id, tier, status)
      VALUES (v_booking.id, v_partner.partner_id, v_next_tier, 'offered')
      ON CONFLICT (booking_id, partner_id) DO NOTHING;

      -- Send in-app notification to the offered partner
      INSERT INTO public.notifications (user_id, title, message, type, metadata)
      VALUES (
        v_partner.partner_id,
        'New Job Opportunity Available',
        'A new ' || v_booking.service_title || ' job is available in pincode ' || COALESCE(v_booking.pincode, 'your area') || '. Tap to review and accept.',
        'job_offer',
        jsonb_build_object('booking_id', v_booking.id, 'tier', v_next_tier)
      );

      v_partner_count := v_partner_count + 1;
    END LOOP;

    -- Phase 3: Confirm tier broadcast or mark exhausted
    IF v_partner_count > 0 THEN
      PERFORM public.confirm_dispatch_batch(v_booking.id, v_next_tier, v_partner_count);
      v_dispatched_total := v_dispatched_total + v_partner_count;

      INSERT INTO public.booking_events (booking_id, event_type, actor, metadata)
      VALUES (
        v_booking.id,
        'DISPATCH_BROADCAST',
        'SYSTEM',
        jsonb_build_object('tier', v_next_tier, 'partner_count', v_partner_count)
      );
    ELSE
      -- Zero remaining partners: mark exhausted & alert admins
      PERFORM public.confirm_dispatch_batch(v_booking.id, v_next_tier, 0);
      v_exhausted_count := v_exhausted_count + 1;

      INSERT INTO public.booking_events (booking_id, event_type, actor, metadata)
      VALUES (
        v_booking.id,
        'DISPATCH_EXHAUSTED',
        'SYSTEM',
        jsonb_build_object('attempted_tier', v_next_tier, 'partner_count', 0, 'reason', 'no_further_eligible_partners')
      );

      PERFORM public.notify_admins(
        'Dispatch Exhausted · Action Required',
        'Booking #' || SUBSTRING(v_booking.id::TEXT, 1, 8) || ' (' || v_booking.service_title || ' in ' || COALESCE(v_booking.pincode, 'area') || ') has exhausted all eligible professionals. Manual assignment required.',
        'partner_reassigned',
        jsonb_build_object('booking_id', v_booking.id)
      );
    END IF;

    v_results := array_append(v_results, jsonb_build_object(
      'booking_id', v_booking.id,
      'tier', v_next_tier,
      'partners_offered', v_partner_count
    ));
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'processed_bookings', v_processed_count,
    'dispatched_partners', v_dispatched_total,
    'exhausted_bookings', v_exhausted_count,
    'details', to_jsonb(v_results)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.escalate_dispatch_cycle(INTEGER, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.escalate_dispatch_cycle(INTEGER, INTEGER) TO authenticated, service_role;


-- ─── 2. OPTIONAL PG_CRON SCHEDULING HELPER ───────────────────────────────────

DO $$
BEGIN
  -- Attempt to enable pg_cron if available on the PostgreSQL host
  BEGIN
    CREATE EXTENSION IF NOT EXISTS pg_cron;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'pg_cron extension not available in this environment. Vercel cron or external scheduler will be used.';
  END;
END;
$$;

CREATE OR REPLACE FUNCTION public.schedule_dispatch_cron(
  p_cron_schedule TEXT DEFAULT '* * * * *'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job_id BIGINT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'pg_cron extension is not installed. Use Vercel cron (/api/dispatch/cron) instead.'
    );
  END IF;

  -- Schedule the job
  EXECUTE 'SELECT cron.schedule($1, $2)'
     INTO v_job_id
    USING 'phs_dispatch_escalation', p_cron_schedule, 'SELECT public.escalate_dispatch_cycle();';

  RETURN jsonb_build_object(
    'success', true,
    'job_name', 'phs_dispatch_escalation',
    'schedule', p_cron_schedule,
    'job_id', v_job_id
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

REVOKE ALL ON FUNCTION public.schedule_dispatch_cron(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.schedule_dispatch_cron(TEXT) TO authenticated, service_role;
