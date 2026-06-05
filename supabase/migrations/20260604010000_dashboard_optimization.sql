-- ═══════════════════════════════════════════════════════════════
-- Admin Dashboard Metrics Aggregation RPC
-- Created: 2026-06-04
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_admin_dashboard_metrics()
RETURNS json SECURITY DEFINER AS $$
DECLARE
  v_now timestamp with time zone;
  v_today_start timestamp with time zone;
  v_week_start timestamp with time zone;
  v_month_start timestamp with time zone;
  v_prev_month_start timestamp with time zone;
  
  v_monthly_bookings_count int;
  v_daily_bookings_count int;
  v_weekly_bookings_count int;
  
  v_monthly_gmv numeric;
  v_daily_gmv numeric;
  v_weekly_gmv numeric;
  v_prev_month_gmv numeric;
  v_mom_growth numeric;
  
  v_pending_count int;
  v_confirmed_count int;
  v_in_progress_count int;
  v_accepted_count int;
  v_completed_count int;
  v_cancelled_count int;
  v_active_bookings int;
  v_success_rate numeric;
  
  v_total_partners int;
  v_active_partner_count int;
  v_offline_partner_count int;
  v_busy_partner_count int;
  v_suspended_partner_count int;
  v_fleet_utilization int;
  v_customer_count int;
  
  v_top_services jsonb;
  v_zone_data jsonb;
  v_recent_payouts jsonb;
  v_recent_bookings jsonb;
  
  v_result json;
BEGIN
  -- Compute time intervals relative to current time
  v_now := now();
  v_today_start := date_trunc('day', v_now);
  -- Truncate to Monday in Postgres
  v_week_start := date_trunc('week', v_now);
  v_month_start := date_trunc('month', v_now);
  v_prev_month_start := date_trunc('month', v_now - interval '1 month');

  -- Count customers
  SELECT COALESCE(count(*), 0) INTO v_customer_count FROM public.profiles WHERE role = 'customer';
  
  -- Count partners by status
  SELECT COALESCE(count(*), 0) INTO v_total_partners FROM public.profiles WHERE role = 'partner';
  SELECT COALESCE(count(*), 0) INTO v_active_partner_count FROM public.profiles WHERE role = 'partner' AND status = 'active';
  SELECT COALESCE(count(*), 0) INTO v_offline_partner_count FROM public.profiles WHERE role = 'partner' AND status = 'offline';
  SELECT COALESCE(count(*), 0) INTO v_busy_partner_count FROM public.profiles WHERE role = 'partner' AND status = 'busy';
  SELECT COALESCE(count(*), 0) INTO v_suspended_partner_count FROM public.profiles WHERE role = 'partner' AND (status = 'suspended' OR status = 'blocked');
  
  v_fleet_utilization := CASE WHEN v_total_partners > 0 THEN round((v_active_partner_count::numeric / v_total_partners::numeric) * 100) ELSE 0 END;

  -- Compute GMVs and status counts
  SELECT 
    COALESCE(count(*), 0),
    COALESCE(sum(CASE WHEN created_at >= v_today_start THEN total_amount ELSE 0 END), 0),
    COALESCE(sum(CASE WHEN created_at >= v_week_start THEN total_amount ELSE 0 END), 0),
    COALESCE(sum(total_amount), 0),
    COALESCE(sum(CASE WHEN status = 'pending' THEN 1 ELSE 0 END), 0),
    COALESCE(sum(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END), 0),
    COALESCE(sum(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END), 0),
    COALESCE(sum(CASE WHEN status = 'accepted' THEN 1 ELSE 0 END), 0),
    COALESCE(sum(CASE WHEN status = 'completed' THEN 1 ELSE 0 END), 0),
    COALESCE(sum(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END), 0)
  INTO
    v_monthly_bookings_count,
    v_daily_gmv,
    v_weekly_gmv,
    v_monthly_gmv,
    v_pending_count,
    v_confirmed_count,
    v_in_progress_count,
    v_accepted_count,
    v_completed_count,
    v_cancelled_count
  FROM public.bookings
  WHERE created_at >= v_month_start;

  -- Previous month GMV
  SELECT COALESCE(sum(total_amount), 0) INTO v_prev_month_gmv 
  FROM public.bookings 
  WHERE created_at >= v_prev_month_start AND created_at < v_month_start;

  -- Growth and success rate calculations
  v_mom_growth := CASE WHEN v_prev_month_gmv > 0 THEN ((v_monthly_gmv - v_prev_month_gmv) / v_prev_month_gmv) * 100 ELSE 0 END;
  
  v_active_bookings := v_confirmed_count + v_in_progress_count + v_accepted_count;
  
  DECLARE
    v_non_pending int;
  BEGIN
    v_non_pending := v_monthly_bookings_count - v_pending_count;
    v_success_rate := CASE WHEN v_non_pending > 0 THEN (v_completed_count::numeric / v_non_pending::numeric) * 100 ELSE 100 END;
  END;

  -- Service performance data (top 6 services by volume)
  SELECT COALESCE(jsonb_agg(t), '[]'::jsonb) INTO v_top_services
  FROM (
    SELECT 
      s.title,
      s.category,
      count(*)::int AS count,
      sum(b.total_amount)::numeric AS revenue
    FROM public.bookings b
    JOIN public.services s ON b.service_id = s.id
    WHERE b.created_at >= v_month_start
    GROUP BY s.title, s.category
    ORDER BY count DESC
    LIMIT 6
  ) t;

  -- Geographic zone analytics
  -- Sum up bookings per city, count unique partners covering that city
  SELECT COALESCE(jsonb_agg(z), '[]'::jsonb) INTO v_zone_data
  FROM (
    WITH city_bookings_summary AS (
      SELECT 
        COALESCE(city, 'Unknown') as city,
        count(*)::int AS bookings_count,
        sum(total_amount)::numeric AS revenue_sum
      FROM public.bookings
      WHERE created_at >= v_month_start
      GROUP BY city
    ),
    city_partners_summary AS (
      SELECT 
        COALESCE(city, 'Unknown') as city,
        count(distinct partner_id)::int AS partners_count
      FROM public.partner_service_areas
      GROUP BY city
    )
    SELECT 
      cb.city,
      cb.bookings_count AS bookings,
      COALESCE(cp.partners_count, 0) AS partners,
      CASE WHEN cb.bookings_count > 0 THEN round(cb.revenue_sum / cb.bookings_count) ELSE 0 END AS aov
    FROM city_bookings_summary cb
    LEFT JOIN city_partners_summary cp ON cb.city = cp.city
    WHERE cb.city <> 'Unknown'
    ORDER BY bookings DESC
    LIMIT 6
  ) z;

  -- Recent payouts (completed bookings of this month, sorted by created_at desc)
  SELECT COALESCE(jsonb_agg(rp), '[]'::jsonb) INTO v_recent_payouts
  FROM (
    SELECT 
      b.id,
      b.created_at,
      b.total_amount,
      json_build_object('full_name', p.full_name) AS partner
    FROM public.bookings b
    LEFT JOIN public.profiles p ON b.partner_id = p.id
    WHERE b.status = 'completed' AND b.created_at >= v_month_start
    ORDER BY b.created_at DESC
    LIMIT 3
  ) rp;

  -- Recent bookings of this month
  SELECT COALESCE(jsonb_agg(rb), '[]'::jsonb) INTO v_recent_bookings
  FROM (
    SELECT 
      b.id,
      b.status,
      b.total_amount,
      b.created_at,
      b.city,
      json_build_object('title', s.title) AS services,
      json_build_object('full_name', c.full_name) AS customer
    FROM public.bookings b
    LEFT JOIN public.services s ON b.service_id = s.id
    LEFT JOIN public.profiles c ON b.customer_id = c.id
    WHERE b.created_at >= v_month_start
    ORDER BY b.created_at DESC
    LIMIT 8
  ) rb;

  -- Build final output json
  v_result := json_build_object(
    'monthly_gmv', v_monthly_gmv,
    'daily_gmv', v_daily_gmv,
    'weekly_gmv', v_weekly_gmv,
    'prev_month_gmv', v_prev_month_gmv,
    'mom_growth', v_mom_growth,
    'pending_count', v_pending_count,
    'confirmed_count', v_confirmed_count,
    'in_progress_count', v_in_progress_count,
    'accepted_count', v_accepted_count,
    'completed_count', v_completed_count,
    'cancelled_count', v_cancelled_count,
    'active_bookings', v_active_bookings,
    'success_rate', v_success_rate,
    'total_partners', v_total_partners,
    'active_partner_count', v_active_partner_count,
    'offline_partner_count', v_offline_partner_count,
    'busy_partner_count', v_busy_partner_count,
    'suspended_partner_count', v_suspended_partner_count,
    'fleet_utilization', v_fleet_utilization,
    'customer_count', v_customer_count,
    'top_services', v_top_services,
    'zone_data', v_zone_data,
    'recent_payouts', v_recent_payouts,
    'recent_bookings', v_recent_bookings
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;
