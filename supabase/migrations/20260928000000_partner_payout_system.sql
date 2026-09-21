-- ════════════════════════════════════════════════════════════════════════════
-- Migration: Partner Payout System
-- File: 20260928000000_partner_payout_system.sql
--
-- Purpose:
--   Introduce a configurable, auditable Partner Payout (earnings withdrawal)
--   system layered on top of the existing booking-lifecycle earnings model:
--
--   1. partner_earnings        — one immutable earnings snapshot per completed
--                                booking (amounts, GST, commission ALL frozen at
--                                completion time via DB trigger). Backfilled for
--                                all historical completed bookings.
--   2. payouts                 — a partner's withdrawal request. Lifecycle:
--                                requested → approved → processing → paid
--                                (or rejected / cancelled). Single active payout
--                                per partner at a time.
--   3. payout_allocations      — FIFO reservation ledger linking preserved
--                                earnings to a payout. Unique partial index on
--                                earning_id (status IN allocated/paid) is the
--                                double-pay guard.
--   4. payout_events           — append-only lifecycle audit per payout.
--   5. payout_adjustments      — clawbacks / restitutions (signed amount).
--   6. partner_payment_details  — partner-owned receiving methods (BANK / UPI /
--                                QR / OTHER), primary per partner, shown to
--                                admins at approval time alongside KYC bank info.
--
--   Balance is NEVER stored — always derived:
--     Total Earned = Σ partner_earnings.amount (status ≠ reversed)
--     Paid         = Σ allocations.status = 'paid'
--     Processing   = Σ allocations on payouts in (requested, approved, processing)
--     Available    = MAX(0, Σ eligible − clawback_due)
--
--   Configuration (platform_settings):
--     partner_payout_min     default 500  (minimum withdrawal, ₹)
--     partner_payouts_enabled default true (feature switch)
--
-- Architecture invariants:
--   * Both completion paths (partner verifyCompletionOtp + admin
--     updateBookingStatusAction) are plain status UPDATEs on bookings, so a
--     single AFTER UPDATE OF status trigger is the one and only earnings writer.
--   * Booking reversed after completion (completed → cancelled/refunded):
--       - earning eligible  → reversed in place
--       - earning reserved  → payout cancelled, unaffected allocations released,
--                             the refunded earning reversed
--       - earning already paid → payout left intact, a CLAWBACK adjustment is
--                             created to reduce future availability
--   * All state transitions go through SECURITY DEFINER RPCs; RLS grants
--     partners read/write only their own rows and admins full visibility.
-- ════════════════════════════════════════════════════════════════════════════

-- ─── 1. SEQUENCE ───────────────────────────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS public.payout_number_seq;

-- ─── 2. CONFIG HELPERS ────────────────────────────────────────────────────
-- Reads payout + commission config from platform_settings with defensive
-- parsing (the platform stores settings as JSONB, strings or numbers).
CREATE OR REPLACE FUNCTION public.get_payout_config()
RETURNS TABLE (
  min_amount        NUMERIC,
  enabled           BOOLEAN,
  commission_percent NUMERIC
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    COALESCE(NULLIF(regexp_replace(
      COALESCE((SELECT value #>> '{}' FROM public.platform_settings WHERE key = 'partner_payout_min'), ''),
      '[^0-9.]', '', 'g'), '')::NUMERIC, 500::NUMERIC),
    COALESCE((SELECT value #>> '{}' FROM public.platform_settings WHERE key = 'partner_payouts_enabled') = 'true', TRUE),
    COALESCE(NULLIF(regexp_replace(
      COALESCE((SELECT value #>> '{}' FROM public.platform_settings WHERE key = 'platform_commission'), ''),
      '[^0-9.]', '', 'g'), '')::NUMERIC, 20::NUMERIC);
$$;

-- ─── 3. TABLES ────────────────────────────────────────────────────────────
-- 3.1 Partner earnings snapshot (one row per completed booking)
CREATE TABLE IF NOT EXISTS public.partner_earnings (
  id                          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id                  UUID NOT NULL UNIQUE REFERENCES public.bookings(id) ON DELETE CASCADE,
  partner_id                  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  total_amount                NUMERIC(10, 2) NOT NULL DEFAULT 0,
  gst_amount                  NUMERIC(10, 2) NOT NULL DEFAULT 0,
  service_revenue             NUMERIC(10, 2) NOT NULL DEFAULT 0,
  commission_percent          NUMERIC(5, 2)   NOT NULL DEFAULT 20,
  platform_commission_amount  NUMERIC(10, 2) NOT NULL DEFAULT 0,
  partner_earning_amount      NUMERIC(10, 2) NOT NULL DEFAULT 0,
  status                      VARCHAR(20) NOT NULL DEFAULT 'eligible'
                              CHECK (status IN ('eligible', 'reserved', 'paid', 'reversed')),
  completed_at                TIMESTAMP WITH TIME ZONE,
  reversal_reason             TEXT,
  reversed_at                 TIMESTAMP WITH TIME ZONE,
  created_at                  TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_partner_earnings_partner_status
  ON public.partner_earnings (partner_id, status);
CREATE INDEX IF NOT EXISTS idx_partner_earnings_partner_completed
  ON public.partner_earnings (partner_id, completed_at);

-- 3.2 Payouts (withdrawal requests)
CREATE TABLE IF NOT EXISTS public.payouts (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  payout_number     TEXT NOT NULL UNIQUE,
  partner_id        UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  requested_amount  NUMERIC(10, 2) NOT NULL,
  status            VARCHAR(20) NOT NULL DEFAULT 'requested'
                    CHECK (status IN ('requested', 'approved', 'processing', 'paid', 'rejected', 'cancelled')),
  payment_method    VARCHAR(30),
  payment_reference TEXT,
  admin_note        TEXT,
  rejection_reason  TEXT,
  cancellation_reason TEXT,
  requested_at      TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  approved_at       TIMESTAMP WITH TIME ZONE,
  approved_by       UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  processed_at      TIMESTAMP WITH TIME ZONE,
  processed_by      UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  paid_at           TIMESTAMP WITH TIME ZONE,
  paid_by           UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  rejected_at       TIMESTAMP WITH TIME ZONE,
  rejected_by       UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  cancelled_at      TIMESTAMP WITH TIME ZONE,
  cancelled_by      UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at        TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at        TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT payouts_status_method_check CHECK (
    payment_method IS NULL OR payment_method IN ('BANK_TRANSFER', 'UPI', 'CASH', 'OTHER')
  )
);

CREATE INDEX IF NOT EXISTS idx_payouts_partner_status
  ON public.payouts (partner_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payouts_status
  ON public.payouts (status, created_at DESC);

-- 3.3 Payout allocations (earnings reserved into a payout)
CREATE TABLE IF NOT EXISTS public.payout_allocations (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  payout_id   UUID NOT NULL REFERENCES public.payouts(id) ON DELETE CASCADE,
  earning_id  UUID NOT NULL REFERENCES public.partner_earnings(id) ON DELETE CASCADE,
  partner_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount      NUMERIC(10, 2) NOT NULL,
  status      VARCHAR(20) NOT NULL DEFAULT 'allocated'
              CHECK (status IN ('allocated', 'paid', 'released', 'reversed')),
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at  TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Double-pay guard: an earning can be allocated/paid into at most one payout.
CREATE UNIQUE INDEX IF NOT EXISTS uq_payout_allocations_earning_active
  ON public.payout_allocations (earning_id) WHERE status IN ('allocated', 'paid');
CREATE INDEX IF NOT EXISTS idx_payout_allocations_payout
  ON public.payout_allocations (payout_id);
CREATE INDEX IF NOT EXISTS idx_payout_allocations_partner
  ON public.payout_allocations (partner_id, status);

-- 3.4 Payout lifecycle events (append-only audit)
CREATE TABLE IF NOT EXISTS public.payout_events (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  payout_id   UUID NOT NULL REFERENCES public.payouts(id) ON DELETE CASCADE,
  event_type  VARCHAR(20) NOT NULL
              CHECK (event_type IN ('requested', 'approved', 'processing', 'paid', 'rejected', 'cancelled', 'clawback', 'released')),
  actor_id    UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  actor_role  VARCHAR(20) NOT NULL DEFAULT 'partner'
              CHECK (actor_role IN ('partner', 'admin', 'system')),
  metadata    JSONB DEFAULT '{}'::jsonb,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_payout_events_payout
  ON public.payout_events (payout_id, created_at DESC);

-- 3.5 Payout adjustments (clawbacks / restitutions / admin corrections)
-- Signed amount: negative value = clawback (reduces future availability).
CREATE TABLE IF NOT EXISTS public.payout_adjustments (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  payout_id   UUID REFERENCES public.payouts(id) ON DELETE CASCADE,
  partner_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  kind        VARCHAR(20) NOT NULL CHECK (kind IN ('clawback', 'restitution', 'admin')),
  amount      NUMERIC(10, 2) NOT NULL,
  reason      TEXT NOT NULL,
  actor_id    UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_payout_adjustments_partner
  ON public.payout_adjustments (partner_id, created_at DESC);

-- 3.6 Partner payment details (receiving methods; shown to admins on approval)
CREATE TABLE IF NOT EXISTS public.partner_payment_details (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  partner_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  method      VARCHAR(10) NOT NULL CHECK (method IN ('BANK', 'UPI', 'QR', 'OTHER')),
  label       TEXT NOT NULL,
  value       TEXT NOT NULL,
  is_primary  BOOLEAN NOT NULL DEFAULT FALSE,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at  TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_partner_payment_details_partner
  ON public.partner_payment_details (partner_id);
-- At most one primary receiving method per partner.
CREATE UNIQUE INDEX IF NOT EXISTS uq_partner_payment_details_primary
  ON public.partner_payment_details (partner_id) WHERE is_primary;

-- ─── 3.7 SCHEMA RECONCILIATION (heal pre-existing tables) ─────────────────
-- Earlier iterations of this migration may have created the payout tables
-- without created_at/updated_at. CREATE TABLE IF NOT EXISTS cannot add them,
-- so reconcile explicitly. Safe to run repeatedly.
ALTER TABLE public.payouts
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL;

ALTER TABLE public.payout_allocations
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL;

ALTER TABLE public.partner_payment_details
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL;

-- ─── 4. TOUCH TRIGGER (updated_at) ────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_payouts_updated_at ON public.payouts;
CREATE TRIGGER tr_payouts_updated_at
  BEFORE UPDATE ON public.payouts
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS tr_payout_allocations_updated_at ON public.payout_allocations;
CREATE TRIGGER tr_payout_allocations_updated_at
  BEFORE UPDATE ON public.payout_allocations
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS tr_partner_payment_details_updated_at ON public.partner_payment_details;
CREATE TRIGGER tr_partner_payment_details_updated_at
  BEFORE UPDATE ON public.partner_payment_details
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ─── 5. EARNINGS WRITE TRIGGER (single choke point) ───────────────────────
-- Any booking transition into 'completed' with a partner assigned freezes an
-- earnings snapshot using the SAME formula as calculatePartnerEarningsBreakdown
-- in src/lib/engines/commissionEngine.ts:
--   serviceRevenue = total − gst
--   platformCommission = round(serviceRevenue × commission%)       [platform cut]
--   partnerEarning     = round(serviceRevenue × (100 − commission)%) [pro share]
CREATE OR REPLACE FUNCTION public.handle_partner_earning_on_complete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_amount   NUMERIC(10, 2);
  v_gst_amount     NUMERIC(10, 2);
  v_service_revenue NUMERIC(10, 2);
  v_commission     NUMERIC(5, 2);
  v_cfg            RECORD;
  v_completed_at   TIMESTAMP WITH TIME ZONE;
BEGIN
  IF NEW.partner_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT *
    INTO v_cfg
    FROM public.get_payout_config();

  v_commission := COALESCE(v_cfg.commission_percent, 20);

  SELECT COALESCE(bp.total_price, NEW.total_amount, 0),
         COALESCE(bp.gst_amount, 0)
    INTO v_total_amount, v_gst_amount
    FROM public.booking_pricing bp
   WHERE bp.booking_id = NEW.id;

  IF v_total_amount IS NULL THEN
    v_total_amount := COALESCE(NEW.total_amount, 0);
    v_gst_amount   := 0;
  END IF;

  v_service_revenue := GREATEST(0, v_total_amount - COALESCE(v_gst_amount, 0));

  v_completed_at := COALESCE(NEW.completed_at, NEW.service_completed_at, NEW.created_at, now());

  INSERT INTO public.partner_earnings (
    booking_id, partner_id, total_amount, gst_amount, service_revenue,
    commission_percent, platform_commission_amount, partner_earning_amount,
    status, completed_at
  ) VALUES (
    NEW.id, NEW.partner_id, v_total_amount, COALESCE(v_gst_amount, 0), v_service_revenue,
    v_commission,
    ROUND(v_service_revenue * (v_commission / 100), 2),
    ROUND(v_service_revenue * ((100 - v_commission) / 100), 2),
    'eligible', v_completed_at
  )
  ON CONFLICT (booking_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_partner_earning_on_complete ON public.bookings;
CREATE TRIGGER tr_partner_earning_on_complete
  AFTER UPDATE OF status ON public.bookings
  FOR EACH ROW
  WHEN (NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed' AND NEW.partner_id IS NOT NULL)
  EXECUTE FUNCTION public.handle_partner_earning_on_complete();

-- ─── 6. EARNINGS REVERSE TRIGGER (completed → cancelled/refunded) ─────────
CREATE OR REPLACE FUNCTION public.handle_partner_earning_reverse()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_earning_id     UUID;
  v_earning_status VARCHAR(20);
  v_earning_amount NUMERIC(10, 2);
  v_alloc          RECORD;
  v_payout_status  VARCHAR(20);
  v_released_count INT := 0;
BEGIN
  SELECT id, status, partner_earning_amount
    INTO v_earning_id, v_earning_status, v_earning_amount
    FROM public.partner_earnings
   WHERE booking_id = NEW.id;

  IF v_earning_id IS NULL THEN
    RETURN NEW; -- no snapshot (legacy / unassigned booking)
  END IF;

  IF v_earning_status = 'reversed' THEN
    RETURN NEW;
  END IF;

  -- Case A: earning still available → reverse in place.
  IF v_earning_status = 'eligible' THEN
    UPDATE public.partner_earnings
       SET status = 'reversed',
           reversal_reason = 'Booking ' || NEW.status || ' after completion',
           reversed_at = now()
     WHERE id = v_earning_id;
    RETURN NEW;
  END IF;

  -- Case B: earning reserved or already paid inside a payout.
  SELECT pa.id, pa.payout_id, pa.status, po.status
    INTO v_alloc.id, v_alloc.payout_id, v_alloc.status, v_payout_status
    FROM public.payout_allocations pa
    JOIN public.payouts po ON po.id = pa.payout_id
   WHERE pa.earning_id = v_earning_id
     AND pa.status IN ('allocated', 'paid')
   ORDER BY pa.created_at DESC
   LIMIT 1;

  IF NOT FOUND THEN
    -- reserved without allocation is impossible by design; reverse defensively.
    UPDATE public.partner_earnings
       SET status = 'reversed',
           reversal_reason = 'Booking ' || NEW.status || ' after completion (reserved)',
           reversed_at = now()
     WHERE id = v_earning_id;
    RETURN NEW;
  END IF;

  -- The refunded booking's own earning is always reversed + allocation retired.
  UPDATE public.partner_earnings
     SET status = 'reversed',
         reversal_reason = 'Booking ' || NEW.status || ' after completion',
         reversed_at = now()
   WHERE id = v_earning_id;

  UPDATE public.payout_allocations
     SET status = 'reversed',
         updated_at = now()
   WHERE id = v_alloc.id;

  IF v_alloc.status = 'allocated' AND v_payout_status = 'paid' THEN
    -- Payout already disbursed: leave the payout intact, raise a clawback so
    -- future availability shrinks. An admin settlement is a manual event.
    INSERT INTO public.payout_adjustments (
      payout_id, partner_id, kind, amount, reason, actor_id
    ) VALUES (
      v_alloc.payout_id, NEW.partner_id, 'clawback', -v_earning_amount,
      'Clawback — booking ' || SUBSTRING(NEW.id::text, 1, 8) || ' reversed (' || NEW.status || ') after payout was paid',
      NULL
    );

    INSERT INTO public.payout_events (payout_id, event_type, actor_id, actor_role, metadata)
    VALUES (v_alloc.payout_id, 'clawback', NULL, 'system',
            jsonb_build_object('earning_id', v_earning_id, 'amount', v_earning_amount,
                               'reason', 'Booking reversed after paid payout'));

    RETURN NEW;
  END IF;

  IF v_payout_status IN ('requested', 'approved', 'processing') THEN
    -- Cancel the payout and release every unaffected reserved earning.
    UPDATE public.payouts
       SET status = 'cancelled',
           cancellation_reason = 'Booking reversed after payout request',
           cancelled_by = NULL,
           cancelled_at = now(),
           updated_at = now()
     WHERE id = v_alloc.payout_id
       AND status IN ('requested', 'approved', 'processing');

    INSERT INTO public.payout_events (payout_id, event_type, actor_id, actor_role, metadata)
    VALUES (v_alloc.payout_id, 'cancelled', NULL, 'system',
            jsonb_build_object('earning_id', v_earning_id,
                               'reason', 'Booking ' || NEW.status || ' after completion'));

    SELECT COUNT(*) INTO v_released_count
      FROM public.payout_allocations nick
      JOIN public.partner_earnings pe_nick ON pe_nick.id = nick.earning_id
     WHERE nick.payout_id = v_alloc.payout_id
       AND nick.earning_id <> v_earning_id
       AND nick.status = 'allocated'
       AND pe_nick.status = 'reserved';

    UPDATE public.payout_allocations nick
       SET status = 'released',
           updated_at = now()
      FROM public.partner_earnings pe_nick
     WHERE nick.payout_id = v_alloc.payout_id
       AND nick.earning_id = pe_nick.id
       AND nick.earning_id <> v_earning_id
       AND nick.status = 'allocated'
       AND pe_nick.status = 'reserved';

    -- release earnings back to eligible
    UPDATE public.partner_earnings pe
       SET status = 'eligible'
      FROM public.payout_allocations pa
     WHERE pa.payout_id = v_alloc.payout_id
       AND pa.earning_id = pe.id
       AND pa.earning_id <> v_earning_id
       AND pa.status = 'released'
       AND pe.status = 'reserved';

    IF v_released_count > 0 THEN
      INSERT INTO public.payout_events (payout_id, event_type, actor_id, actor_role, metadata)
      VALUES (v_alloc.payout_id, 'released', NULL, 'system',
              jsonb_build_object('released_allocations', v_released_count));
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_partner_earning_reverse ON public.bookings;
CREATE TRIGGER tr_partner_earning_reverse
  AFTER UPDATE OF status ON public.bookings
  FOR EACH ROW
  WHEN (OLD.status = 'completed' AND NEW.status IN ('cancelled', 'refunded'))
  EXECUTE FUNCTION public.handle_partner_earning_reverse();

-- ─── 7. BACKFILL (historical completed bookings) ─────────────────────────
DO $$
DECLARE
  rec               RECORD;
  v_commission      NUMERIC(5, 2);
  v_service_revenue NUMERIC(10, 2);
BEGIN
  SELECT cfg.commission_percent INTO v_commission FROM public.get_payout_config() AS cfg;
  v_commission := COALESCE(v_commission, 20);

  FOR rec IN
    SELECT bk.id AS booking_id,
           bk.partner_id,
           COALESCE(bp.total_price, bk.total_amount, 0) AS total_amount,
           COALESCE(bp.gst_amount, 0) AS gst_amount,
           COALESCE(bk.completed_at, bk.service_completed_at, bk.created_at, now()) AS completed_at
      FROM public.bookings bk
      LEFT JOIN public.booking_pricing bp ON bp.booking_id = bk.id
     WHERE bk.status = 'completed'
       AND bk.partner_id IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM public.partner_earnings pe WHERE pe.booking_id = bk.id)
  LOOP
    v_service_revenue := GREATEST(0, rec.total_amount - rec.gst_amount);

    INSERT INTO public.partner_earnings (
      booking_id, partner_id, total_amount, gst_amount, service_revenue,
      commission_percent, platform_commission_amount, partner_earning_amount,
      status, completed_at
    ) VALUES (
      rec.booking_id, rec.partner_id, rec.total_amount, rec.gst_amount, v_service_revenue,
      v_commission,
      ROUND(v_service_revenue * (v_commission / 100), 2),
      ROUND(v_service_revenue * ((100 - v_commission) / 100), 2),
      'eligible', rec.completed_at
    );
  END LOOP;
END;
$$;

-- ─── 8. RLS ──────────────────────────────────────────────────────────────
ALTER TABLE public.partner_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payout_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payout_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payout_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_payment_details ENABLE ROW LEVEL SECURITY;

-- partner_earnings: partner reads own; admin reads all. No user writes.
DROP POLICY IF EXISTS partner_earnings_select_own ON public.partner_earnings;
CREATE POLICY partner_earnings_select_own
  ON public.partner_earnings FOR SELECT
  USING (partner_id = auth.uid() OR public.is_admin(auth.uid()));

-- payouts: partner reads/listens on own; admin all. Insert via RPC only,
-- partner updates (cancel) via RPC only.
DROP POLICY IF EXISTS payouts_select_own ON public.payouts;
CREATE POLICY payouts_select_own
  ON public.payouts FOR SELECT
  USING (partner_id = auth.uid() OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS payouts_insert_own ON public.payouts;
CREATE POLICY payouts_insert_own
  ON public.payouts FOR INSERT
  WITH CHECK (partner_id = auth.uid() AND status = 'requested');

-- payout_allocations: partner reads own; admin all.
DROP POLICY IF EXISTS payout_allocations_select_own ON public.payout_allocations;
CREATE POLICY payout_allocations_select_own
  ON public.payout_allocations FOR SELECT
  USING (partner_id = auth.uid() OR public.is_admin(auth.uid()));

-- payout_events: partner reads own (via joined payout); admin all.
DROP POLICY IF EXISTS payout_events_select_own ON public.payout_events;
CREATE POLICY payout_events_select_own
  ON public.payout_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.payouts p
       WHERE p.id = payout_events.payout_id
         AND (p.partner_id = auth.uid() OR public.is_admin(auth.uid()))
    )
  );

-- payout_adjustments: partner reads own; admin all.
DROP POLICY IF EXISTS payout_adjustments_select_own ON public.payout_adjustments;
CREATE POLICY payout_adjustments_select_own
  ON public.payout_adjustments FOR SELECT
  USING (partner_id = auth.uid() OR public.is_admin(auth.uid()));

-- partner_payment_details: full CRUD on own rows; admins read-only view of all.
DROP POLICY IF EXISTS partner_payment_details_select ON public.partner_payment_details;
CREATE POLICY partner_payment_details_select
  ON public.partner_payment_details FOR SELECT
  USING (partner_id = auth.uid() OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS partner_payment_details_insert_own ON public.partner_payment_details;
CREATE POLICY partner_payment_details_insert_own
  ON public.partner_payment_details FOR INSERT
  WITH CHECK (partner_id = auth.uid());

DROP POLICY IF EXISTS partner_payment_details_update_own ON public.partner_payment_details;
CREATE POLICY partner_payment_details_update_own
  ON public.partner_payment_details FOR UPDATE
  USING (partner_id = auth.uid());

DROP POLICY IF EXISTS partner_payment_details_delete_own ON public.partner_payment_details;
CREATE POLICY partner_payment_details_delete_own
  ON public.partner_payment_details FOR DELETE
  USING (partner_id = auth.uid());

-- ─── 9. SINGLE-PRIMARY PAYMENT DETAILS TRIGGER ───────────────────────────
CREATE OR REPLACE FUNCTION public.ensure_single_primary_payment_detail()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.is_primary THEN
    UPDATE public.partner_payment_details
       SET is_primary = FALSE,
           updated_at = now()
     WHERE partner_id = NEW.partner_id
       AND id <> NEW.id
       AND is_primary;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_partner_payment_details_single_primary ON public.partner_payment_details;
CREATE TRIGGER tr_partner_payment_details_single_primary
  BEFORE INSERT OR UPDATE ON public.partner_payment_details
  FOR EACH ROW
  WHEN (NEW.is_primary)
  EXECUTE FUNCTION public.ensure_single_primary_payment_detail();

-- ─── 10. RPCs ────────────────────────────────────────────────────────────
-- 10.1 Partner payout summary + history (partner self or admin).
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
  v_processing    NUMERIC(10, 2) := 0;
  v_eligible      NUMERIC(10, 2) := 0;
  v_clawback_due  NUMERIC(10, 2) := 0;
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

  -- Earned (excludes reversed snapshots).
  SELECT COALESCE(SUM(partner_earning_amount), 0) INTO v_total_earned
    FROM public.partner_earnings
   WHERE partner_id = p_partner_id AND status <> 'reversed';

  -- Paid & Processing from live allocations.
  SELECT COALESCE(SUM(amount), 0) INTO v_paid
    FROM public.payout_allocations
   WHERE partner_id = p_partner_id AND status = 'paid';

  SELECT COALESCE(SUM(pa.amount), 0) INTO v_processing
    FROM public.payout_allocations pa
    JOIN public.payouts po ON po.id = pa.payout_id
   WHERE pa.partner_id = p_partner_id
     AND pa.status = 'allocated'
     AND po.status IN ('requested', 'approved', 'processing');

  -- Available = eligible − clawback_due, clamped at 0.
  SELECT COALESCE(SUM(partner_earning_amount), 0) INTO v_eligible
    FROM public.partner_earnings
   WHERE partner_id = p_partner_id AND status = 'eligible';

  SELECT COALESCE(SUM(ABS(amount)), 0) INTO v_clawback_due
    FROM public.payout_adjustments
   WHERE partner_id = p_partner_id AND amount < 0;

  v_available := GREATEST(0, v_eligible - v_clawback_due);

  -- Current (single) pending payout, if any.
  SELECT jsonb_build_object(
    'id', po.id,
    'payout_number', po.payout_number,
    'status', po.status,
    'requested_amount', po.requested_amount,
    'requested_at', po.requested_at,
    'payment_method', po.payment_method,
    'rejection_reason', po.rejection_reason
  ) INTO v_current
    FROM public.payouts po
   WHERE po.partner_id = p_partner_id
     AND po.status IN ('requested', 'approved', 'processing')
   ORDER BY po.created_at DESC
   LIMIT 1;

  -- Recent earnings (last 20).
  SELECT COALESCE(jsonb_agg(row_to_jsonb ORDER BY completed_at DESC), '[]'::jsonb) INTO v_earnings
    FROM (
      SELECT id, booking_id, total_amount, gst_amount, service_revenue,
             commission_percent, platform_commission_amount,
             partner_earning_amount, status, completed_at
        FROM public.partner_earnings
       WHERE partner_id = p_partner_id
       ORDER BY completed_at DESC
       LIMIT 20
    ) row_to_jsonb;

  -- Recent payouts (last 20).
  SELECT COALESCE(jsonb_agg(row_to_jsonb ORDER BY created_at DESC), '[]'::jsonb) INTO v_payouts
    FROM (
      SELECT id, payout_number, requested_amount, status, payment_method,
             payment_reference, requested_at, approved_at, processed_at,
             paid_at, rejected_at, cancelled_at, rejection_reason, cancellation_reason, admin_note
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
    'processing',     v_processing,
    'eligible',       v_eligible,
    'clawback_due',   v_clawback_due,
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

-- 10.2 Partner payout request (FIFO allocation of the entire available balance).
CREATE OR REPLACE FUNCTION public.request_partner_payout(p_partner_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id       UUID;
  v_enabled        BOOLEAN;
  v_min            NUMERIC(10, 2);
  v_eligible       NUMERIC(10, 2) := 0;
  v_clawback_due   NUMERIC(10, 2) := 0;
  v_available      NUMERIC(10, 2) := 0;
  v_payout_id      UUID;
  v_payout_number  TEXT;
  v_allocated      NUMERIC(10, 2) := 0;
  v_earning        RECORD;
BEGIN
  BEGIN
    v_actor_id := auth.uid();
  EXCEPTION WHEN OTHERS THEN
    v_actor_id := NULL;
  END;

  IF v_actor_id IS NOT NULL AND v_actor_id IS DISTINCT FROM p_partner_id THEN
    RAISE EXCEPTION 'Unauthorized: cannot request a payout for another professional.';
  END IF;

  SELECT pc.enabled, pc.min_amount INTO v_enabled, v_min
    FROM public.get_payout_config() AS pc;

  IF NOT COALESCE(v_enabled, TRUE) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Payouts are currently disabled. Please try later.');
  END IF;

  -- Single active payout per partner.
  IF EXISTS (
    SELECT 1 FROM public.payouts
     WHERE partner_id = p_partner_id AND status IN ('requested', 'approved', 'processing')
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'You already have a payout in progress.');
  END IF;

  -- Serialize concurrent requests for the same partner.
  PERFORM 1 FROM public.profiles WHERE id = p_partner_id FOR UPDATE;

  -- Lock the eligible earning rows (FOR UPDATE is not allowed on aggregates),
  -- then compute against the locked snapshot.
  PERFORM 1 FROM public.partner_earnings
    WHERE partner_id = p_partner_id AND status = 'eligible'
    FOR UPDATE;

  SELECT COALESCE(SUM(partner_earning_amount), 0) INTO v_eligible
    FROM public.partner_earnings
   WHERE partner_id = p_partner_id AND status = 'eligible';

  SELECT COALESCE(SUM(ABS(amount)), 0) INTO v_clawback_due
    FROM public.payout_adjustments
   WHERE partner_id = p_partner_id AND amount < 0;

  v_available := GREATEST(0, v_eligible - v_clawback_due);

  IF v_available <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'No available earnings to withdraw.');
  END IF;

  IF v_available < v_min THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Minimum payout is ₹' || TRIM(TO_CHAR(v_min, 'FM999G999G999G999')) ||
               '. You have ₹' || TRIM(TO_CHAR(v_available, 'FM999G999G999G999')) || ' available.'
    );
  END IF;

  v_payout_number := 'PAY-' || LPAD(nextval('public.payout_number_seq')::TEXT, 6, '0');

  INSERT INTO public.payouts (payout_number, partner_id, requested_amount, status)
  VALUES (v_payout_number, p_partner_id, v_available, 'requested')
  RETURNING id INTO v_payout_id;

  -- FIFO: oldest completed first, stable tie-break by id. Whole earnings only;
  -- an earning that would exceed the (clawback-adjusted) available amount is
  -- left eligible for the next payout rather than over-paying the partner.
  FOR v_earning IN
    SELECT id, partner_earning_amount
      FROM public.partner_earnings
     WHERE partner_id = p_partner_id AND status = 'eligible'
     ORDER BY completed_at ASC NULLS LAST, id ASC
  LOOP
    IF v_allocated + v_earning.partner_earning_amount > v_available THEN
      CONTINUE;
    END IF;

    INSERT INTO public.payout_allocations (payout_id, earning_id, partner_id, amount, status)
    VALUES (v_payout_id, v_earning.id, p_partner_id, v_earning.partner_earning_amount, 'allocated');

    UPDATE public.partner_earnings
       SET status = 'reserved'
     WHERE id = v_earning.id;

    v_allocated := v_allocated + v_earning.partner_earning_amount;
  END LOOP;

  -- Nothing withdrew at the whole-earning level: clean up and return a friendly
  -- error (rolls back the provisional payout + allocations via cascade).
  IF v_allocated < v_min THEN
    DELETE FROM public.payouts WHERE id = v_payout_id;
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Unable to withdraw: available balance is below the minimum payout of ₹' ||
               TRIM(TO_CHAR(v_min, 'FM999G999G999G999')) || '.'
    );
  END IF;

  UPDATE public.payouts
     SET requested_amount = v_allocated
   WHERE id = v_payout_id;

  INSERT INTO public.payout_events (payout_id, event_type, actor_id, actor_role, metadata)
  VALUES (v_payout_id, 'requested', p_partner_id, 'partner',
          jsonb_build_object('requested_amount', v_allocated, 'allocated', v_allocated));

  RETURN jsonb_build_object(
    'success', true,
    'payout_id', v_payout_id,
    'payout_number', v_payout_number,
    'amount', v_allocated
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.request_partner_payout(UUID) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.request_partner_payout(UUID) TO authenticated;
GRANT  EXECUTE ON FUNCTION public.request_partner_payout(UUID) TO service_role;

-- 10.3 Approve (admin)
CREATE OR REPLACE FUNCTION public.approve_partner_payout(p_payout_id UUID, p_admin_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor  UUID := COALESCE(p_admin_id, auth.uid());
BEGIN
  IF v_actor IS NULL OR NOT public.is_admin(v_actor) THEN
    RAISE EXCEPTION 'Administrative access required.';
  END IF;

  PERFORM 1 FROM public.payouts WHERE id = p_payout_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Payout not found.');
  END IF;

  UPDATE public.payouts
     SET status = 'approved',
         approved_by = v_actor,
         approved_at = now(),
         updated_at = now()
   WHERE id = p_payout_id AND status = 'requested';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Payout can only be approved while requested.');
  END IF;

  INSERT INTO public.payout_events (payout_id, event_type, actor_id, actor_role, metadata)
  VALUES (p_payout_id, 'approved', v_actor, 'admin', '{}'::jsonb);

  RETURN jsonb_build_object('success', true, 'payout_id', p_payout_id, 'status', 'approved');
END;
$$;

REVOKE EXECUTE ON FUNCTION public.approve_partner_payout(UUID, UUID) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.approve_partner_payout(UUID, UUID) TO authenticated;
GRANT  EXECUTE ON FUNCTION public.approve_partner_payout(UUID, UUID) TO service_role;

-- 10.4 Reject (admin) — releases allocations.
CREATE OR REPLACE FUNCTION public.reject_partner_payout(p_payout_id UUID, p_admin_id UUID, p_reason TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor UUID := COALESCE(p_admin_id, auth.uid());
BEGIN
  IF v_actor IS NULL OR NOT public.is_admin(v_actor) THEN
    RAISE EXCEPTION 'Administrative access required.';
  END IF;

  PERFORM 1 FROM public.payouts WHERE id = p_payout_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Payout not found.');
  END IF;

  UPDATE public.payouts
     SET status = 'rejected',
         rejection_reason = COALESCE(p_reason, 'Rejected by administrator'),
         rejected_by = v_actor,
         rejected_at = now(),
         updated_at = now()
   WHERE id = p_payout_id AND status IN ('requested', 'approved');

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Payout can only be rejected while requested or approved.');
  END IF;

  -- Release every allocated earning back to eligible.
  UPDATE public.payout_allocations
     SET status = 'released',
         updated_at = now()
   WHERE payout_id = p_payout_id AND status = 'allocated';

  UPDATE public.partner_earnings pe
     SET status = 'eligible'
    FROM public.payout_allocations pa
   WHERE pa.payout_id = p_payout_id
     AND pa.earning_id = pe.id
     AND pa.status = 'released'
     AND pe.status = 'reserved';

  INSERT INTO public.payout_events (payout_id, event_type, actor_id, actor_role, metadata)
  VALUES (p_payout_id, 'rejected', v_actor, 'admin',
          jsonb_build_object('reason', COALESCE(p_reason, '')));

  INSERT INTO public.payout_events (payout_id, event_type, actor_id, actor_role, metadata)
  VALUES (p_payout_id, 'released', v_actor, 'admin',
          jsonb_build_object('reason', 'Rejected payout released allocations'));

  RETURN jsonb_build_object('success', true, 'payout_id', p_payout_id, 'status', 'rejected');
END;
$$;

REVOKE EXECUTE ON FUNCTION public.reject_partner_payout(UUID, UUID, TEXT) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.reject_partner_payout(UUID, UUID, TEXT) TO authenticated;
GRANT  EXECUTE ON FUNCTION public.reject_partner_payout(UUID, UUID, TEXT) TO service_role;

-- 10.5 Process (admin marks as being disbursed).
CREATE OR REPLACE FUNCTION public.process_partner_payout(p_payout_id UUID, p_admin_id UUID, p_method TEXT, p_reference TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor UUID := COALESCE(p_admin_id, auth.uid());
BEGIN
  IF v_actor IS NULL OR NOT public.is_admin(v_actor) THEN
    RAISE EXCEPTION 'Administrative access required.';
  END IF;

  IF p_method IS NOT NULL AND p_method NOT IN ('BANK_TRANSFER', 'UPI', 'CASH', 'OTHER') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid payment method.');
  END IF;

  PERFORM 1 FROM public.payouts WHERE id = p_payout_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Payout not found.');
  END IF;

  UPDATE public.payouts
     SET status = 'processing',
         payment_method = COALESCE(p_method, payment_method),
         payment_reference = COALESCE(p_reference, payment_reference),
         processed_by = v_actor,
         processed_at = now(),
         updated_at = now()
   WHERE id = p_payout_id AND status = 'approved';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Payout can only be processed while approved.');
  END IF;

  INSERT INTO public.payout_events (payout_id, event_type, actor_id, actor_role, metadata)
  VALUES (p_payout_id, 'processing', v_actor, 'admin',
          jsonb_build_object('method', COALESCE(p_method, ''), 'reference', COALESCE(p_reference, '')));

  RETURN jsonb_build_object('success', true, 'payout_id', p_payout_id, 'status', 'processing');
END;
$$;

REVOKE EXECUTE ON FUNCTION public.process_partner_payout(UUID, UUID, TEXT, TEXT) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.process_partner_payout(UUID, UUID, TEXT, TEXT) TO authenticated;
GRANT  EXECUTE ON FUNCTION public.process_partner_payout(UUID, UUID, TEXT, TEXT) TO service_role;

-- 10.6 Mark paid (admin) — finalizes earning/allocations.
CREATE OR REPLACE FUNCTION public.mark_partner_payout_paid(p_payout_id UUID, p_admin_id UUID, p_method TEXT, p_reference TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor UUID := COALESCE(p_admin_id, auth.uid());
BEGIN
  IF v_actor IS NULL OR NOT public.is_admin(v_actor) THEN
    RAISE EXCEPTION 'Administrative access required.';
  END IF;

  IF p_method IS NOT NULL AND p_method NOT IN ('BANK_TRANSFER', 'UPI', 'CASH', 'OTHER') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid payment method.');
  END IF;

  PERFORM 1 FROM public.payouts WHERE id = p_payout_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Payout not found.');
  END IF;

  UPDATE public.payouts
     SET status = 'paid',
         payment_method = COALESCE(p_method, payment_method),
         payment_reference = COALESCE(p_reference, payment_reference),
         paid_by = v_actor,
         paid_at = now(),
         updated_at = now()
   WHERE id = p_payout_id AND status IN ('approved', 'processing');

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Payout can only be marked paid while approved or processing.');
  END IF;

  UPDATE public.payout_allocations
     SET status = 'paid',
         updated_at = now()
   WHERE payout_id = p_payout_id AND status = 'allocated';

  UPDATE public.partner_earnings pe
     SET status = 'paid'
    FROM public.payout_allocations pa
   WHERE pa.payout_id = p_payout_id
     AND pa.earning_id = pe.id
     AND pa.status = 'paid'
     AND pe.status = 'reserved';

  INSERT INTO public.payout_events (payout_id, event_type, actor_id, actor_role, metadata)
  VALUES (p_payout_id, 'paid', v_actor, 'admin',
          jsonb_build_object('method', COALESCE(p_method, ''), 'reference', COALESCE(p_reference, '')));

  RETURN jsonb_build_object('success', true, 'payout_id', p_payout_id, 'status', 'paid');
END;
$$;

REVOKE EXECUTE ON FUNCTION public.mark_partner_payout_paid(UUID, UUID, TEXT, TEXT) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.mark_partner_payout_paid(UUID, UUID, TEXT, TEXT) TO authenticated;
GRANT  EXECUTE ON FUNCTION public.mark_partner_payout_paid(UUID, UUID, TEXT, TEXT) TO service_role;

-- 10.7 Partner cancels their own requested/approved payout (releases earnings).
CREATE OR REPLACE FUNCTION public.cancel_partner_payout_request(p_payout_id UUID, p_partner_id UUID, p_reason TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor UUID := COALESCE(p_partner_id, auth.uid());
BEGIN
  -- Partner owns it, or an admin does it on their behalf.
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Unauthorized.';
  END IF;

  PERFORM 1 FROM public.payouts WHERE id = p_payout_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Payout not found.');
  END IF;

  IF NOT public.is_admin(v_actor)
     AND NOT EXISTS (
       SELECT 1 FROM public.payouts
        WHERE id = p_payout_id AND partner_id = v_actor
     ) THEN
    RAISE EXCEPTION 'Unauthorized: cannot cancel another professional''s payout.';
  END IF;

  UPDATE public.payouts
     SET status = 'cancelled',
         cancellation_reason = COALESCE(p_reason, 'Cancelled by requester'),
         cancelled_by = v_actor,
         cancelled_at = now(),
         updated_at = now()
   WHERE id = p_payout_id AND status IN ('requested', 'approved');

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only requested or approved payouts can be cancelled.');
  END IF;

  UPDATE public.payout_allocations
     SET status = 'released',
         updated_at = now()
   WHERE payout_id = p_payout_id AND status = 'allocated';

  UPDATE public.partner_earnings pe
     SET status = 'eligible'
    FROM public.payout_allocations pa
   WHERE pa.payout_id = p_payout_id
     AND pa.earning_id = pe.id
     AND pa.status = 'released'
     AND pe.status = 'reserved';

  INSERT INTO public.payout_events (payout_id, event_type, actor_id, actor_role, metadata)
  VALUES (p_payout_id, 'cancelled', v_actor,
          CASE WHEN public.is_admin(v_actor) THEN 'admin' ELSE 'partner' END,
          jsonb_build_object('reason', COALESCE(p_reason, '')));

  INSERT INTO public.payout_events (payout_id, event_type, actor_id, actor_role, metadata)
  VALUES (p_payout_id, 'released', v_actor, 'system',
          jsonb_build_object('reason', 'Cancelled payout released allocations'));

  RETURN jsonb_build_object('success', true, 'payout_id', p_payout_id, 'status', 'cancelled');
END;
$$;

REVOKE EXECUTE ON FUNCTION public.cancel_partner_payout_request(UUID, UUID, TEXT) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.cancel_partner_payout_request(UUID, UUID, TEXT) TO authenticated;
GRANT  EXECUTE ON FUNCTION public.cancel_partner_payout_request(UUID, UUID, TEXT) TO service_role;

-- 10.8 Add payout adjustment (admin; clawback/restitution/correction).
CREATE OR REPLACE FUNCTION public.add_partner_payout_adjustment(
  p_partner_id UUID,
  p_payout_id  UUID,
  p_kind       TEXT,
  p_amount     NUMERIC,
  p_reason     TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor  UUID := auth.uid();
  v_amount NUMERIC(10, 2);
  v_adj_id UUID;
BEGIN
  IF v_actor IS NOT NULL AND NOT public.is_admin(v_actor) THEN
    RAISE EXCEPTION 'Administrative access required.';
  END IF;

  IF p_kind NOT IN ('clawback', 'restitution', 'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid adjustment kind.');
  END IF;

  IF p_amount IS NULL OR p_amount = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Amount must be non-zero.');
  END IF;

  IF p_reason IS NULL OR TRIM(p_reason) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'A reason is required.');
  END IF;

  -- Normalize: clawbacks are always stored negative; live/restitution positive.
  IF p_kind = 'clawback' THEN
    v_amount := -ABS(p_amount);
  ELSE
    v_amount := ABS(p_amount);
  END IF;

  INSERT INTO public.payout_adjustments (payout_id, partner_id, kind, amount, reason, actor_id)
  VALUES (p_payout_id, p_partner_id, p_kind, v_amount, TRIM(p_reason), v_actor)
  RETURNING id INTO v_adj_id;

  IF p_payout_id IS NOT NULL THEN
    INSERT INTO public.payout_events (payout_id, event_type, actor_id, actor_role, metadata)
    VALUES (p_payout_id, 'clawback', v_actor, 'admin',
            jsonb_build_object('kind', p_kind, 'amount', v_amount, 'reason', TRIM(p_reason)));
  END IF;

  RETURN jsonb_build_object('success', true, 'adjustment_id', v_adj_id, 'amount', v_amount);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.add_partner_payout_adjustment(UUID, UUID, TEXT, NUMERIC, TEXT) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.add_partner_payout_adjustment(UUID, UUID, TEXT, NUMERIC, TEXT) TO authenticated;
GRANT  EXECUTE ON FUNCTION public.add_partner_payout_adjustment(UUID, UUID, TEXT, NUMERIC, TEXT) TO service_role;

-- 10.9 Admin reconciliation listing (payouts + partner profile/kYC/payment details).
CREATE OR REPLACE FUNCTION public.get_payout_reconciliation()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor UUID := auth.uid();
  v_rows  JSONB;
BEGIN
  IF v_actor IS NOT NULL AND NOT public.is_admin(v_actor) THEN
    RAISE EXCEPTION 'Administrative access required.';
  END IF;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'payout', row_to_jsonb(po),
      'partner', jsonb_build_object(
        'id', pr.id,
        'full_name', pr.full_name,
        'phone', pr.phone,
        'email', pr.email,
        'kyc_status', pr.kyc_status,
        'kyc_documents', pr.kyc_documents
      ),
      'payment_details', COALESCE((
        SELECT jsonb_agg(row_to_jsonb(det))
          FROM public.partner_payment_details det
         WHERE det.partner_id = po.partner_id AND det.is_active
      ), '[]'::jsonb),
      'allocations_count', (
        SELECT COUNT(*) FROM public.payout_allocations a WHERE a.payout_id = po.id
      ),
      'event_count', (
        SELECT COUNT(*) FROM public.payout_events e WHERE e.payout_id = po.id
      )
    ) ORDER BY po.created_at DESC), '[]'::jsonb)
    INTO v_rows
    FROM public.payouts po
    JOIN public.profiles pr ON pr.id = po.partner_id;

  RETURN jsonb_build_object('rows', v_rows);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_payout_reconciliation() FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.get_payout_reconciliation() TO authenticated;
GRANT  EXECUTE ON FUNCTION public.get_payout_reconciliation() TO service_role;

-- ─── 11. SETTINGS SEEDS ──────────────────────────────────────────────────
INSERT INTO public.platform_settings (key, value, updated_at) VALUES
  ('partner_payout_min', '500', now()),
  ('partner_payouts_enabled', 'true', now())
ON CONFLICT (key) DO NOTHING;