-- Migration: 20261028000000_fix_payout_summary_created_at.sql
-- Fix: include created_at in the public.payouts subquery inside get_partner_payout_summary
-- Prevents "ERROR: 42703: column created_at does not exist" during JSON aggregation

CREATE OR REPLACE FUNCTION public.get_partner_payout_summary(p_partner_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id      UUID;
  v_total_earned  NUMERIC(10, 2) := 0;
  v_paid          NUMERIC(10, 2) := 0;
  v_paid_bank     NUMERIC(10, 2) := 0;
  v_paid_cash     NUMERIC(10, 2) := 0;
  v_processing    NUMERIC(10, 2) := 0;
  v_eligible      NUMERIC(10, 2) := 0;
  v_clawback_due  NUMERIC(10, 2) := 0;
  v_restitution   NUMERIC(10, 2) := 0;
  v_net_clawback  NUMERIC(10, 2) := 0;
  v_available     NUMERIC(10, 2) := 0;
  v_min           NUMERIC(10, 2);
  v_enabled       BOOLEAN;
  v_current       JSONB;
  v_earnings      JSONB;
  v_payouts       JSONB;
BEGIN
  BEGIN
    v_actor_id := auth.uid();
  EXCEPTION WHEN OTHERS THEN
    v_actor_id := NULL;
  END;

  IF v_actor_id IS NOT NULL
     AND v_actor_id IS DISTINCT FROM p_partner_id
     AND NOT public.is_admin(v_actor_id) THEN
    RAISE EXCEPTION 'Unauthorized: cannot view another professional''s payout summary.';
  END IF;

  SELECT pc.min_amount, pc.enabled
    INTO v_min, v_enabled
    FROM public.get_payout_config() AS pc;

  -- 1. Total Earned (excludes reversed snapshots; includes both bookings and referral rewards)
  SELECT COALESCE(SUM(partner_earning_amount), 0) INTO v_total_earned
    FROM public.partner_earnings
   WHERE partner_id = p_partner_id AND status <> 'reversed';

  -- 2. Paid: bank payouts disbursed via allocations + cash earnings received directly
  SELECT COALESCE(SUM(amount), 0) INTO v_paid_bank
    FROM public.payout_allocations
   WHERE partner_id = p_partner_id AND status = 'paid';

  SELECT COALESCE(SUM(partner_earning_amount), 0) INTO v_paid_cash
    FROM public.partner_earnings
   WHERE partner_id = p_partner_id AND is_cash = TRUE AND status = 'paid';

  v_paid := v_paid_bank + v_paid_cash;

  -- 3. Processing (live allocations on requested/approved/processing payouts)
  SELECT COALESCE(SUM(pa.amount), 0) INTO v_processing
    FROM public.payout_allocations pa
    JOIN public.payouts po ON po.id = pa.payout_id
   WHERE pa.partner_id = p_partner_id
     AND pa.status = 'allocated'
     AND po.status IN ('requested', 'approved', 'processing');

  -- 4. Eligible (unreserved earnings ready for withdrawal)
  SELECT COALESCE(SUM(partner_earning_amount), 0) INTO v_eligible
    FROM public.partner_earnings
   WHERE partner_id = p_partner_id AND status = 'eligible';

  -- 5. Clawback Due (unsettled deductions minus pending restitutions)
  SELECT COALESCE(SUM(ABS(amount)), 0) INTO v_clawback_due
    FROM public.payout_adjustments
   WHERE partner_id = p_partner_id
     AND amount < 0
     AND (status = 'pending' OR (status IS NULL AND settled_at IS NULL));

  SELECT COALESCE(SUM(amount), 0) INTO v_restitution
    FROM public.payout_adjustments
   WHERE partner_id = p_partner_id
     AND amount > 0
     AND (status = 'pending' OR (status IS NULL AND settled_at IS NULL));

  v_net_clawback := GREATEST(0, v_clawback_due - v_restitution);

  -- 6. Available = eligible - net_clawback, clamped at 0
  v_available := GREATEST(0, v_eligible - v_net_clawback);

  -- Current pending payout, if any
  SELECT jsonb_build_object(
    'id', po.id,
    'payout_number', po.payout_number,
    'status', po.status,
    'requested_amount', po.requested_amount,
    'gross_amount', po.gross_amount,
    'deductions_amount', po.deductions_amount,
    'requested_at', po.requested_at,
    'payment_method', po.payment_method,
    'rejection_reason', po.rejection_reason
  ) INTO v_current
    FROM public.payouts po
   WHERE po.partner_id = p_partner_id
     AND po.status IN ('requested', 'approved', 'processing')
   ORDER BY po.created_at DESC
   LIMIT 1;

  -- Recent earnings (last 20, includes bookings and referrals)
  SELECT COALESCE(jsonb_agg(row_to_jsonb ORDER BY completed_at DESC), '[]'::jsonb) INTO v_earnings
    FROM (
      SELECT id, booking_id, referral_id, earning_type, description, total_amount, gst_amount, service_revenue,
             commission_percent, platform_commission_amount,
             partner_earning_amount, status, completed_at, payment_method, is_cash
        FROM public.partner_earnings
       WHERE partner_id = p_partner_id
       ORDER BY completed_at DESC
       LIMIT 20
    ) row_to_jsonb;

  -- Recent payouts (last 20)
  SELECT COALESCE(jsonb_agg(row_to_jsonb ORDER BY created_at DESC), '[]'::jsonb) INTO v_payouts
    FROM (
      SELECT id, payout_number, requested_amount, gross_amount, deductions_amount,
             status, payment_method, payment_reference, requested_at, approved_at,
             processed_at, paid_at, rejected_at, cancelled_at, rejection_reason,
             cancellation_reason, admin_note, created_at
        FROM public.payouts
       WHERE partner_id = p_partner_id
       ORDER BY created_at DESC
       LIMIT 20
    ) row_to_jsonb;

  RETURN jsonb_build_object(
    'partner_id',     p_partner_id,
    'payouts_enabled',v_enabled,
    'min_payout',     v_min,
    'total_earned',   v_total_earned,
    'paid',           v_paid,
    'paid_bank',      v_paid_bank,
    'paid_cash',      v_paid_cash,
    'processing',     v_processing,
    'eligible',       v_eligible,
    'clawback_due',   v_net_clawback,
    'available',      v_available,
    'current_payout', v_current,
    'earnings',       v_earnings,
    'payouts',        v_payouts
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_partner_payout_summary(UUID) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.get_partner_payout_summary(UUID) TO authenticated;
GRANT  EXECUTE ON FUNCTION public.get_partner_payout_summary(UUID) TO service_role;
