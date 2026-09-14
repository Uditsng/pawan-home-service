-- ═══════════════════════════════════════════════════════════════
-- Offer Cards — Admin-Controlled Promotional Offers
-- Created: 2026-09-21
--
-- Business model:
--   * Admin creates an OFFER (fixed discount / percentage discount /
--     service credit) that must target ≥ 1 eligible service.
--   * Customers PURCHASE the offer (Razorpay full / wallet full / free claim)
--     → they receive an OFFER ENTITLEMENT (owned benefit with remaining value
--     or remaining uses + expiry).
--   * At booking checkout the customer applies the entitlement. A reservation
--     ledger (`offer_applications`) holds the benefit server-side from order
--     creation until redemption, preventing double-application and the
--     "offer expired mid-checkout" race.
--   * Redemption is atomic via `apply_offer_redemption` and audited in
--     `offer_redemptions`.
--
-- Security invariants:
--   * Only `active` + currently-valid offers are purchasable/redeemable
--     (expiry enforced by timestamp at runtime, never by status alone).
--   * Entitlements/redemptions/applications are written ONLY via the
--     SECURITY DEFINER RPCs below (RLS has no INSERT/UPDATE paths).
--   * `complete_offer_purchase` is service_role-only, idempotent
--     (purchase is never credited twice — unique partial index on
--     razorpay_payment_id + FOR UPDATE row lock).
--   * Wallet-funded purchases debit BONUS-first (mirrors use_wallet_balance).
--   * Free claims are idempotent via unique(offer_id, customer_id) where
--     purchase_id IS NULL.
--   * Offer purchases are non-refundable once activated (admin exception via
--     existing admin_wallet_adjustment + entitlement void action).
-- ═══════════════════════════════════════════════════════════════

-- ─── 1. OFFERS — the catalog entry ────────────────────────────
CREATE TABLE IF NOT EXISTS public.offers (
  id                       UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code                     TEXT NOT NULL UNIQUE,
  name                     TEXT NOT NULL,
  title                    TEXT NOT NULL,
  description              TEXT,
  display_text             TEXT,
  artwork_url              TEXT,
  offer_type               TEXT NOT NULL
                             CHECK (offer_type IN ('FIXED_DISCOUNT', 'PERCENTAGE_DISCOUNT', 'SERVICE_CREDIT')),
  purchase_price           NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (purchase_price >= 0),
  benefit_value            NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (benefit_value >= 0),
  max_discount             NUMERIC(10,2) CHECK (max_discount IS NULL OR max_discount >= 0),
  min_booking_amount       NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (min_booking_amount >= 0),
  validity_model           TEXT NOT NULL DEFAULT 'fixed_dates'
                             CHECK (validity_model IN ('fixed_dates', 'relative_days')),
  valid_from               TIMESTAMPTZ,
  valid_until              TIMESTAMPTZ,
  valid_days               INTEGER CHECK (valid_days IS NULL OR valid_days > 0),
  status                   TEXT NOT NULL DEFAULT 'draft'
                             CHECK (status IN ('draft', 'active', 'paused', 'expired', 'archived')),
  usage_limit_type         TEXT NOT NULL DEFAULT 'one_time'
                             CHECK (usage_limit_type IN ('one_time', 'multiple')),
  max_redemptions_per_customer INTEGER
                             CHECK (max_redemptions_per_customer IS NULL OR max_redemptions_per_customer > 0),
  eligibility              TEXT NOT NULL DEFAULT 'all'
                             CHECK (eligibility IN ('all', 'new', 'existing')),
  created_by               UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Validity model coherence:
  CONSTRAINT ck_offers_validity_model CHECK (
    (validity_model = 'fixed_dates'   AND valid_from IS NOT NULL AND valid_until IS NOT NULL) OR
    (validity_model = 'relative_days' AND valid_days IS NOT NULL)
  ),
  -- Usage-rule coherence: multiple must specify how many times a customer may redeem.
  CONSTRAINT ck_offers_usage_rule CHECK (
    (usage_limit_type = 'one_time') OR
    (usage_limit_type = 'multiple' AND max_redemptions_per_customer IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_offers_status   ON public.offers (status);
CREATE INDEX IF NOT EXISTS idx_offers_validity ON public.offers (valid_until);
CREATE INDEX IF NOT EXISTS idx_offers_created  ON public.offers (created_at DESC);

-- ─── 2. OFFER_ELIGIBLE_SERVICES — service targeting ──────────
-- REQUIRED: an offer must have at least one eligible service (business rule:
-- admins must explicitly pick services; there is no implicit "all services").
CREATE TABLE IF NOT EXISTS public.offer_eligible_services (
  offer_id   UUID NOT NULL REFERENCES public.offers(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  PRIMARY KEY (offer_id, service_id)
);

CREATE INDEX IF NOT EXISTS idx_offer_eligible_service_id ON public.offer_eligible_services (service_id);

-- ─── 3. OFFER_PURCHASES — payment ledger (mirrors wallet_recharges) ──
CREATE TABLE IF NOT EXISTS public.offer_purchases (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  offer_id            UUID NOT NULL REFERENCES public.offers(id) ON DELETE RESTRICT,
  customer_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount              NUMERIC(10,2) NOT NULL CHECK (amount >= 0),
  status              TEXT NOT NULL DEFAULT 'created'
                        CHECK (status IN ('created', 'pending', 'success', 'failed', 'cancelled', 'refunded')),
  payment_method      TEXT,
  razorpay_order_id   TEXT,
  razorpay_payment_id TEXT,
  razorpay_signature  TEXT,
  metadata            JSONB,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_offer_purchases_customer ON public.offer_purchases (customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_offer_purchases_offer    ON public.offer_purchases (offer_id);
CREATE INDEX IF NOT EXISTS idx_offer_purchases_order    ON public.offer_purchases (razorpay_order_id);
-- DB-level idempotency: one Razorpay payment can complete one offer purchase only.
CREATE UNIQUE INDEX IF NOT EXISTS uq_offer_purchases_payment
  ON public.offer_purchases (razorpay_payment_id)
  WHERE razorpay_payment_id IS NOT NULL;

-- ─── 4. OFFER_ENTITLEMENTS — the customer's owned benefit ────
CREATE TABLE IF NOT EXISTS public.offer_entitlements (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  offer_id       UUID NOT NULL REFERENCES public.offers(id) ON DELETE RESTRICT,
  customer_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  purchase_id    UUID UNIQUE REFERENCES public.offer_purchases(id) ON DELETE SET NULL,
  offer_type     TEXT NOT NULL
                   CHECK (offer_type IN ('FIXED_DISCOUNT', 'PERCENTAGE_DISCOUNT', 'SERVICE_CREDIT')),
  original_value NUMERIC(10,2) NOT NULL DEFAULT 0,
  remaining_value NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_uses     INTEGER NOT NULL DEFAULT 0,
  remaining_uses INTEGER NOT NULL DEFAULT 0,
  purchased_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  status         TEXT NOT NULL DEFAULT 'active'
                   CHECK (status IN ('active', 'expired', 'consumed', 'cancelled', 'reversed')),
  activated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at     TIMESTAMPTZ,
  metadata       JSONB,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_offer_entitlements_customer ON public.offer_entitlements (customer_id);
CREATE INDEX IF NOT EXISTS idx_offer_entitlements_offer    ON public.offer_entitlements (offer_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_offer_entitlements_status   ON public.offer_entitlements (status, expires_at);
-- One entitlement per paid purchase.
CREATE UNIQUE INDEX IF NOT EXISTS uq_offer_entitlement_purchase
  ON public.offer_entitlements (purchase_id)
  WHERE purchase_id IS NOT NULL;
-- One free claim per customer per offer.
CREATE UNIQUE INDEX IF NOT EXISTS uq_offer_entitlement_free
  ON public.offer_entitlements (offer_id, customer_id)
  WHERE purchase_id IS NULL;

-- ─── 5. OFFER_REDEMPTIONS — audit ledger ──────────────────────
CREATE TABLE IF NOT EXISTS public.offer_redemptions (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  entitlement_id  UUID NOT NULL REFERENCES public.offer_entitlements(id) ON DELETE RESTRICT,
  offer_id        UUID NOT NULL REFERENCES public.offers(id) ON DELETE RESTRICT,
  customer_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  booking_id      UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  order_id        UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  amount_applied  NUMERIC(10,2) NOT NULL,
  redeemed_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata        JSONB
);

CREATE INDEX IF NOT EXISTS idx_offer_redemptions_customer     ON public.offer_redemptions (customer_id);
CREATE INDEX IF NOT EXISTS idx_offer_redemptions_offer        ON public.offer_redemptions (offer_id);
CREATE INDEX IF NOT EXISTS idx_offer_redemptions_entitlement  ON public.offer_redemptions (entitlement_id);
-- Idempotency: one redemption per entitlement per order.
CREATE UNIQUE INDEX IF NOT EXISTS uq_offer_redemptions_order
  ON public.offer_redemptions (entitlement_id, order_id)
  WHERE order_id IS NOT NULL;

-- ─── 6. OFFER_APPLICATIONS — reservation ledger ──────────────
-- A reservation HOLDS the benefit from order creation until redemption or
-- release (abandoned basket). Availability is computed from live
-- `reserved` applications, so releasing never corrupts counters.
CREATE TABLE IF NOT EXISTS public.offer_applications (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  entitlement_id UUID NOT NULL REFERENCES public.offer_entitlements(id) ON DELETE CASCADE,
  order_id       UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  booking_id     UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  amount         NUMERIC(10,2) NOT NULL DEFAULT 0,
  status         TEXT NOT NULL DEFAULT 'reserved'
                   CHECK (status IN ('reserved', 'consumed', 'released')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  consumed_at    TIMESTAMPTZ,
  released_at    TIMESTAMPTZ,
  UNIQUE (entitlement_id, order_id)
);

CREATE INDEX IF NOT EXISTS idx_offer_applications_status ON public.offer_applications (status, created_at);
CREATE INDEX IF NOT EXISTS idx_offer_applications_order   ON public.offer_applications (order_id);

-- ─── RLS ─────────────────────────────────────────────────────

ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offer_eligible_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offer_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offer_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offer_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offer_applications ENABLE ROW LEVEL SECURITY;

-- offers: customers see active ones; owners of an entitlement see their offer
-- even if it has since been paused/archived (so "My Offers" stays readable).
DROP POLICY IF EXISTS "Offers active are viewable by everyone" ON public.offers;
CREATE POLICY "Offers active are viewable by everyone" ON public.offers
  FOR SELECT TO public
  USING (status = 'active');

DROP POLICY IF EXISTS "Entitled customers can view their offer" ON public.offers;
CREATE POLICY "Entitled customers can view their offer" ON public.offers
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.offer_entitlements e
     WHERE e.offer_id = offers.id AND e.customer_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Admins have full access on offers" ON public.offers;
CREATE POLICY "Admins have full access on offers" ON public.offers
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- eligible services: transparent membership (used for eligibility checks).
DROP POLICY IF EXISTS "Offer services are viewable by everyone" ON public.offer_eligible_services;
CREATE POLICY "Offer services are viewable by everyone" ON public.offer_eligible_services
  FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Admins have full access on offer services" ON public.offer_eligible_services;
CREATE POLICY "Admins have full access on offer services" ON public.offer_eligible_services
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- purchases: customers see/insert their own pending rows, admins all.
DROP POLICY IF EXISTS "Users can view own offer purchases" ON public.offer_purchases;
CREATE POLICY "Users can view own offer purchases" ON public.offer_purchases
  FOR SELECT TO authenticated USING (customer_id = auth.uid());

DROP POLICY IF EXISTS "Users can create own offer purchases" ON public.offer_purchases;
CREATE POLICY "Users can create own offer purchases" ON public.offer_purchases
  FOR INSERT TO authenticated
  WITH CHECK (customer_id = auth.uid() AND status = 'created' AND amount >= 0);

DROP POLICY IF EXISTS "Admins can manage offer purchases" ON public.offer_purchases;
CREATE POLICY "Admins can manage offer purchases" ON public.offer_purchases
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- entitlements / redemptions / applications: read-own, admin-all, RPC writes only.
DROP POLICY IF EXISTS "Users can view own entitlements" ON public.offer_entitlements;
CREATE POLICY "Users can view own entitlements" ON public.offer_entitlements
  FOR SELECT TO authenticated USING (customer_id = auth.uid());

DROP POLICY IF EXISTS "Admins can manage entitlements" ON public.offer_entitlements;
CREATE POLICY "Admins can manage entitlements" ON public.offer_entitlements
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users can view own redemptions" ON public.offer_redemptions;
CREATE POLICY "Users can view own redemptions" ON public.offer_redemptions
  FOR SELECT TO authenticated USING (customer_id = auth.uid());

DROP POLICY IF EXISTS "Admins can manage redemptions" ON public.offer_redemptions;
CREATE POLICY "Admins can manage redemptions" ON public.offer_redemptions
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users can view own applications" ON public.offer_applications;
CREATE POLICY "Users can view own applications" ON public.offer_applications
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.offer_entitlements e
     WHERE e.id = offer_applications.entitlement_id AND e.customer_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Admins can manage applications" ON public.offer_applications;
CREATE POLICY "Admins can manage applications" ON public.offer_applications
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- ─── 7. SNAPSHOT COLUMNS on orders + booking_pricing ─────────
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS offer_entitlement_id UUID REFERENCES public.offer_entitlements(id) ON DELETE SET NULL;
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS offer_discount NUMERIC(10,2) NOT NULL DEFAULT 0;

ALTER TABLE public.booking_pricing
  ADD COLUMN IF NOT EXISTS offer_id UUID REFERENCES public.offers(id) ON DELETE SET NULL;
ALTER TABLE public.booking_pricing
  ADD COLUMN IF NOT EXISTS offer_entitlement_id UUID REFERENCES public.offer_entitlements(id) ON DELETE SET NULL;
ALTER TABLE public.booking_pricing
  ADD COLUMN IF NOT EXISTS offer_discount NUMERIC(10,2) NOT NULL DEFAULT 0;

-- ─── 8. WALLET LEDGER — allow offer purchases ────────────────
ALTER TABLE public.wallet_transactions
  DROP CONSTRAINT IF EXISTS wallet_transactions_source_check;
ALTER TABLE public.wallet_transactions
  ADD CONSTRAINT wallet_transactions_source_check
    CHECK (source IN (
      'referral_reward', 'referral_bonus', 'booking_discount',
      'admin_adjustment', 'refund', 'recharge', 'promo_credit', 'reversal',
      'offer_purchase'
    ));

-- ─── 9. ELIGIBILITY HELPER ────────────────────────────────────
-- Bucket rules: 'all' anyone, 'new' customers with no completed booking,
-- 'existing' customers with at least one completed booking.
CREATE OR REPLACE FUNCTION public.is_customer_offer_eligible(
  p_offer_id    UUID,
  p_customer_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_elig        TEXT;
  v_has_completed BOOLEAN;
BEGIN
  SELECT eligibility INTO v_elig FROM public.offers WHERE id = p_offer_id;
  IF v_elig IS NULL THEN
    RETURN FALSE;
  END IF;
  IF v_elig = 'all' THEN
    RETURN TRUE;
  END IF;
  SELECT EXISTS (
    SELECT 1 FROM public.bookings b
     WHERE b.customer_id = p_customer_id AND b.status = 'completed'
  ) INTO v_has_completed;
  IF v_elig = 'new' THEN
    RETURN NOT COALESCE(v_has_completed, FALSE);
  END IF;
  RETURN COALESCE(v_has_completed, FALSE);
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_customer_offer_eligible(UUID, UUID) TO authenticated, service_role;

-- ─── 10. RESERVE OFFER BENEFIT (order creation) ──────────────
-- Validates ownership, active status, runtime expiry, service eligibility
-- (all cart services must be targetable), eligibility bucket, minimum amount,
-- and availability (value pool for SERVICE_CREDIT, use-remaining for the
-- discount types). Idempotent per (entitlement, order): re-calling for the
-- same order returns the same hold. Stale reservations (> 24h) self-release.
CREATE OR REPLACE FUNCTION public.reserve_offer_benefit(
  p_entitlement_id UUID,
  p_customer_id   UUID,
  p_order_id      UUID,
  p_service_ids   UUID[],
  p_cart_total    NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor              UUID := auth.uid();
  v_e                  public.offer_entitlements%ROWTYPE;
  v_o                  public.offers%ROWTYPE;
  v_offer_svc_count    INTEGER;
  v_applied            NUMERIC(10,2);
  v_committed          NUMERIC(10,2);
  v_reserved_uses      INTEGER;
  v_app_id             UUID;
  v_cart_total         NUMERIC(10,2) := LEAST(COALESCE(p_cart_total, 0), 99999999);
BEGIN
  -- Authorization: the owner, an admin, or a server-side caller.
  IF v_actor IS NOT NULL
     AND NOT public.is_admin(v_actor)
     AND v_actor <> p_customer_id THEN
    RAISE EXCEPTION 'Unauthorized: this offer does not belong to you.';
  END IF;

  IF v_cart_total <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cart total is required to apply an offer.');
  END IF;

  -- Self-heal stale reservations (> 24h) from abandoned checkouts.
  UPDATE public.offer_applications a
     SET status = 'released', released_at = COALESCE(a.released_at, now())
   FROM public.offer_entitlements e
  WHERE a.entitlement_id = e.id
    AND a.status = 'reserved'
    AND a.created_at < now() - interval '24 hours';

  SELECT * INTO v_e FROM public.offer_entitlements WHERE id = p_entitlement_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Offer entitlement not found.');
  END IF;

  IF v_e.customer_id <> p_customer_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'This offer does not belong to you.');
  END IF;

  IF v_e.status <> 'active' THEN
    RETURN jsonb_build_object('success', false, 'error', 'This offer is no longer active.');
  END IF;

  -- Expiry is enforced by timestamp, never by status alone.
  IF v_e.expires_at IS NOT NULL AND v_e.expires_at <= now() THEN
    RETURN jsonb_build_object('success', false, 'error', 'This offer has expired.', 'offer_expired', true);
  END IF;

  SELECT * INTO v_o FROM public.offers WHERE id = v_e.offer_id;
  IF NOT FOUND OR v_o.status <> 'active' THEN
    RETURN jsonb_build_object('success', false, 'error', 'This offer is not available right now.');
  END IF;

  IF v_o.valid_from IS NOT NULL AND now() < v_o.valid_from THEN
    RETURN jsonb_build_object('success', false, 'error', 'This offer has not started yet.');
  END IF;
  IF v_o.valid_until IS NOT NULL AND now() > v_o.valid_until THEN
    RETURN jsonb_build_object('success', false, 'error', 'This offer has ended.');
  END IF;

  IF NOT public.is_customer_offer_eligible(v_o.id, p_customer_id) THEN
    RETURN jsonb_build_object('success', false, 'error',
      CASE WHEN v_o.eligibility = 'new' THEN 'This offer is for new customers only.'
           ELSE 'This offer is for existing customers only.' END);
  END IF;

  -- Service eligibility: an offer must target ≥ 1 service and EVERY cart
  -- service must be targetable (explicit business rule).
  IF p_service_ids IS NULL OR array_length(p_service_ids, 1) IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No services were selected for this booking.');
  END IF;

  SELECT COUNT(*) INTO v_offer_svc_count FROM public.offer_eligible_services WHERE offer_id = v_o.id;
  IF v_offer_svc_count = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'This offer has no eligible services.');
  END IF;

  IF EXISTS (
    SELECT 1 FROM unnest(p_service_ids) s(service_id)
     WHERE NOT EXISTS (
       SELECT 1 FROM public.offer_eligible_services es
        WHERE es.offer_id = v_o.id AND es.service_id = s.service_id
     )
  ) THEN
    RETURN jsonb_build_object('success', false, 'error',
      'This offer does not apply to all the services in your cart.');
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.offer_applications
     WHERE entitlement_id = v_e.id AND order_id = p_order_id AND status = 'consumed'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'This offer was already redeemed for this order.');
  END IF;

  -- Compute the benefit for THIS cart.
  IF v_cart_total < COALESCE(v_o.min_booking_amount, 0) THEN
    RETURN jsonb_build_object('success', false, 'error',
      'This offer needs a minimum order value of ₹' || ROUND(v_o.min_booking_amount, 0) || '.');
  END IF;

  IF v_e.offer_type = 'SERVICE_CREDIT' THEN
    v_applied := LEAST(COALESCE(v_e.remaining_value, 0), v_cart_total);
  ELSIF v_e.offer_type = 'FIXED_DISCOUNT' THEN
    v_applied := LEAST(COALESCE(v_o.benefit_value, 0), v_cart_total);
  ELSIF v_e.offer_type = 'PERCENTAGE_DISCOUNT' THEN
    v_applied := LEAST(ROUND(v_cart_total * COALESCE(v_o.benefit_value, 0) / 100), v_cart_total);
    IF v_o.max_discount IS NOT NULL AND v_applied > v_o.max_discount THEN
      v_applied := LEAST(v_o.max_discount, v_cart_total);
    END IF;
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Unknown offer type.');
  END IF;

  IF v_applied <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'This offer provides no benefit for this order.');
  END IF;

  -- Availability: remaining minus live reservations.
  IF v_e.offer_type = 'SERVICE_CREDIT' THEN
    SELECT COALESCE(SUM(a.amount), 0) INTO v_committed
      FROM public.offer_applications a
     WHERE a.entitlement_id = v_e.id AND a.status = 'reserved';
    IF v_applied > COALESCE(v_e.remaining_value, 0) - v_committed THEN
      RETURN jsonb_build_object('success', false, 'error', 'This offer is already committed to another booking.');
    END IF;
  ELSE
    SELECT COUNT(*) INTO v_reserved_uses
      FROM public.offer_applications a
     WHERE a.entitlement_id = v_e.id AND a.status = 'reserved';
    IF COALESCE(v_e.remaining_uses, 0) - v_reserved_uses < 1 THEN
      RETURN jsonb_build_object('success', false, 'error', 'This offer has already been fully used.');
    END IF;
  END IF;

  INSERT INTO public.offer_applications (entitlement_id, order_id, amount, status)
  VALUES (v_e.id, p_order_id, v_applied, 'reserved')
  ON CONFLICT (entitlement_id, order_id)
  DO UPDATE SET amount = EXCLUDED.amount, status = 'reserved',
                released_at = NULL, consumed_at = NULL
  RETURNING id INTO v_app_id;

  RETURN jsonb_build_object(
    'success', true,
    'application_id', v_app_id,
    'entitlement_id', v_e.id,
    'applied_amount', v_applied,
    'offer_type', v_e.offer_type
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.reserve_offer_benefit(UUID, UUID, UUID, UUID[], NUMERIC) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.reserve_offer_benefit(UUID, UUID, UUID, UUID[], NUMERIC) TO authenticated, service_role;

-- ─── 11. APPLY OFFER REDEMPTION (booking finalization) ───────
-- Atomically converts the reservation into a redemption: decrements the
-- entitlement's value/uses, inserts the audit row, marks the application
-- consumed. Re-validates active status + runtime expiry at redemption time.
CREATE OR REPLACE FUNCTION public.apply_offer_redemption(
  p_application_id UUID,
  p_customer_id   UUID,
  p_booking_id    UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor     UUID := auth.uid();
  v_app       public.offer_applications%ROWTYPE;
  v_e         public.offer_entitlements%ROWTYPE;
  v_o         public.offers%ROWTYPE;
  v_redemption_id UUID;
BEGIN
  IF v_actor IS NOT NULL
     AND NOT public.is_admin(v_actor)
     AND v_actor <> p_customer_id THEN
    RAISE EXCEPTION 'Unauthorized: this offer does not belong to you.';
  END IF;

  SELECT * INTO v_app FROM public.offer_applications WHERE id = p_application_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Offer reservation not found.');
  END IF;

  IF v_app.status <> 'reserved' THEN
    RETURN jsonb_build_object('success', false, 'error', 'This offer reservation is no longer active.');
  END IF;

  SELECT * INTO v_e FROM public.offer_entitlements WHERE id = v_app.entitlement_id FOR UPDATE;
  IF NOT FOUND OR v_e.customer_id <> p_customer_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'This offer does not belong to you.');
  END IF;

  IF v_e.status <> 'active' THEN
    RETURN jsonb_build_object('success', false, 'error', 'This offer is no longer active.');
  END IF;
  IF v_e.expires_at IS NOT NULL AND v_e.expires_at <= now() THEN
    RETURN jsonb_build_object('success', false, 'error', 'This offer has expired.', 'offer_expired', true);
  END IF;

  SELECT * INTO v_o FROM public.offers WHERE id = v_e.offer_id;
  IF NOT FOUND OR v_o.status <> 'active' THEN
    RETURN jsonb_build_object('success', false, 'error', 'This offer is not active.');
  END IF;

  IF v_e.offer_type = 'SERVICE_CREDIT' THEN
    IF COALESCE(v_e.remaining_value, 0) < v_app.amount THEN
      RETURN jsonb_build_object('success', false, 'error', 'Insufficient offer value remaining.');
    END IF;
    UPDATE public.offer_entitlements
       SET remaining_value = remaining_value - v_app.amount,
           updated_at = now()
     WHERE id = v_e.id;
    IF COALESCE(v_e.remaining_value, 0) - v_app.amount <= 0 THEN
      UPDATE public.offer_entitlements
         SET status = 'consumed', updated_at = now()
       WHERE id = v_e.id;
    END IF;
  ELSE
    IF COALESCE(v_e.remaining_uses, 0) < 1 THEN
      RETURN jsonb_build_object('success', false, 'error', 'This offer has no uses left.');
    END IF;
    UPDATE public.offer_entitlements
       SET remaining_uses = remaining_uses - 1,
           updated_at = now()
     WHERE id = v_e.id;
    IF COALESCE(v_e.remaining_uses, 0) - 1 <= 0 THEN
      UPDATE public.offer_entitlements
         SET status = 'consumed', updated_at = now()
       WHERE id = v_e.id;
    END IF;
  END IF;

  INSERT INTO public.offer_redemptions (
    entitlement_id, offer_id, customer_id, booking_id, order_id, amount_applied, metadata
  ) VALUES (
    v_e.id, v_e.offer_id, v_e.customer_id, p_booking_id, v_app.order_id, v_app.amount,
    jsonb_build_object(
      'offer_code', v_o.code,
      'offer_title', v_o.title,
      'offer_type', v_e.offer_type,
      'benefit_value', v_o.benefit_value
    )
  )
  RETURNING id INTO v_redemption_id;

  UPDATE public.offer_applications
     SET status = 'consumed', consumed_at = now(),
         booking_id = COALESCE(p_booking_id, booking_id)
   WHERE id = v_app.id;

  RETURN jsonb_build_object(
    'success', true,
    'redemption_id', v_redemption_id,
    'applied_amount', v_app.amount
  );
EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('success', false, 'error', 'Offer already redeemed for this order.');
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.apply_offer_redemption(UUID, UUID, UUID) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.apply_offer_redemption(UUID, UUID, UUID) TO authenticated, service_role;

-- ─── 12. RELEASE OFFER RESERVATION (abandoned basket) ────────
CREATE OR REPLACE FUNCTION public.release_offer_reservation(
  p_order_id    UUID,
  p_customer_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor UUID := auth.uid();
BEGIN
  IF v_actor IS NOT NULL
     AND NOT public.is_admin(v_actor)
     AND v_actor <> p_customer_id THEN
    RAISE EXCEPTION 'Unauthorized: you cannot release this reservation.';
  END IF;

  UPDATE public.offer_applications a
     SET status = 'released', released_at = COALESCE(a.released_at, now())
    FROM public.offer_entitlements e
   WHERE a.entitlement_id = e.id
     AND a.order_id = p_order_id
     AND e.customer_id = p_customer_id
     AND a.status = 'reserved';

  RETURN jsonb_build_object('success', true);
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.release_offer_reservation(UUID, UUID) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.release_offer_reservation(UUID, UUID) TO authenticated, service_role;

-- ─── 13. OFFER PURCHASE STATUS (user-initiated failed/cancelled) ──
CREATE OR REPLACE FUNCTION public.update_offer_purchase_status(
  p_purchase_id UUID,
  p_status      TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor UUID := auth.uid();
  v_p     public.offer_purchases%ROWTYPE;
BEGIN
  IF p_status NOT IN ('failed', 'cancelled') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only failed/cancelled transitions are allowed.');
  END IF;

  SELECT * INTO v_p FROM public.offer_purchases WHERE id = p_purchase_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Purchase not found.');
  END IF;

  IF v_actor IS NOT NULL
     AND NOT public.is_admin(v_actor)
     AND v_p.customer_id <> v_actor THEN
    RAISE EXCEPTION 'Unauthorized: you cannot update this purchase.';
  END IF;

  IF v_p.status IN ('success', 'refunded') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Settled purchases cannot be changed.');
  END IF;

  IF v_p.status NOT IN ('created', 'pending') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Purchase is already terminal: ' || v_p.status);
  END IF;

  UPDATE public.offer_purchases SET status = p_status, updated_at = now() WHERE id = p_purchase_id;

  RETURN jsonb_build_object('success', true, 'status', p_status);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.update_offer_purchase_status(UUID, TEXT) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.update_offer_purchase_status(UUID, TEXT) TO authenticated, service_role;

-- ─── 14. COMPLETE OFFER PURCHASE (Razorpay finalization) ─────
-- THE ONLY writer that turns a Razorpay offer purchase into an entitlement.
-- service_role-only, idempotent (unique payment index + FOR UPDATE + guard).
CREATE OR REPLACE FUNCTION public.complete_offer_purchase(
  p_purchase_id            UUID,
  p_razorpay_order_id      TEXT,
  p_payment_id             TEXT,
  p_signature              TEXT,
  p_gateway_verified_amount NUMERIC,
  p_method                 TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_p          public.offer_purchases%ROWTYPE;
  v_o          public.offers%ROWTYPE;
  v_expires_at TIMESTAMPTZ;
  v_entitlement_id UUID;
  v_update_snippet TEXT := '';
BEGIN
  IF p_payment_id IS NULL OR btrim(p_payment_id) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Missing payment id.');
  END IF;

  SELECT * INTO v_p FROM public.offer_purchases WHERE id = p_purchase_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Purchase not found.');
  END IF;

  IF v_p.razorpay_order_id IS DISTINCT FROM p_razorpay_order_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Gateway order mismatch.');
  END IF;

  IF v_p.status = 'success' THEN
    RETURN jsonb_build_object('success', true, 'already_completed', true);
  END IF;

  IF v_p.status NOT IN ('created', 'pending') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Purchase can no longer be completed.');
  END IF;

  IF v_p.amount IS DISTINCT FROM p_gateway_verified_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Amount mismatch with gateway.');
  END IF;

  -- Offer must still be purchasable at completion time.
  SELECT * INTO v_o FROM public.offers WHERE id = v_p.offer_id;
  IF NOT FOUND OR v_o.status <> 'active' THEN
    RETURN jsonb_build_object('success', false, 'error', 'This offer is no longer available.');
  END IF;
  IF v_o.valid_until IS NOT NULL AND now() > v_o.valid_until THEN
    RETURN jsonb_build_object('success', false, 'error', 'This offer has ended.');
  END IF;

  IF v_o.validity_model = 'relative_days' THEN
    v_expires_at := now() + (v_o.valid_days * interval '1 day');
  ELSE
    v_expires_at := v_o.valid_until;
  END IF;

  -- Activate the entitlement (expiry set per validity model at activation).
  INSERT INTO public.offer_entitlements (
    offer_id, customer_id, purchase_id, offer_type,
    original_value, remaining_value, total_uses, remaining_uses,
    purchased_price, status, activated_at, expires_at, metadata
  ) VALUES (
    v_o.id, v_p.customer_id, v_p.id, v_o.offer_type,
    CASE WHEN v_o.offer_type = 'SERVICE_CREDIT' THEN v_o.benefit_value ELSE 0 END,
    CASE WHEN v_o.offer_type = 'SERVICE_CREDIT' THEN v_o.benefit_value ELSE 0 END,
    CASE WHEN v_o.offer_type = 'SERVICE_CREDIT' THEN 1
         WHEN v_o.usage_limit_type = 'one_time' THEN 1
         ELSE v_o.max_redemptions_per_customer END,
    CASE WHEN v_o.offer_type = 'SERVICE_CREDIT' THEN 1
         WHEN v_o.usage_limit_type = 'one_time' THEN 1
         ELSE v_o.max_redemptions_per_customer END,
    v_p.amount,
    'active', now(), v_expires_at,
    jsonb_build_object(
      'offer_code', v_o.code, 'offer_title', v_o.title, 'offer_type', v_o.offer_type,
      'benefit_value', v_o.benefit_value, 'max_discount', v_o.max_discount,
      'min_booking_amount', v_o.min_booking_amount, 'validity_model', v_o.validity_model,
      'usage_limit_type', v_o.usage_limit_type,
      'max_redemptions_per_customer', v_o.max_redemptions_per_customer,
      'eligibility', v_o.eligibility
    )
  )
  RETURNING id INTO v_entitlement_id;

  UPDATE public.offer_purchases
     SET status = 'success',
         razorpay_payment_id = p_payment_id,
         razorpay_signature  = p_signature,
         payment_method      = p_method,
         updated_at          = now()
   WHERE id = v_p.id;

  RETURN jsonb_build_object(
    'success', true,
    'entitlement_id', v_entitlement_id,
    'paid', v_p.amount,
    'expires_at', v_expires_at
  );
EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('success', false, 'error', 'Payment already completed.');
END;
$$;

REVOKE EXECUTE ON FUNCTION public.complete_offer_purchase(UUID, TEXT, TEXT, TEXT, NUMERIC, TEXT) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.complete_offer_purchase(UUID, TEXT, TEXT, TEXT, NUMERIC, TEXT) TO service_role;

-- ─── 15. PURCHASE OFFER WITH WALLET (full wallet payment) ────
-- Bonus-first debit (mirrors use_wallet_balance), then activates the
-- entitlement in the SAME transaction — a partial payout is impossible.
CREATE OR REPLACE FUNCTION public.purchase_offer_with_wallet(
  p_offer_id    UUID,
  p_customer_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor    UUID := auth.uid();
  v_o        public.offers%ROWTYPE;
  v_total    NUMERIC(10,2);
  v_cash     NUMERIC(10,2);
  v_bonus    NUMERIC(10,2);
  v_spend_bonus NUMERIC(10,2);
  v_spend_cash  NUMERIC(10,2);
  v_new_total   NUMERIC(10,2);
  v_new_cash    NUMERIC(10,2);
  v_new_bonus   NUMERIC(10,2);
  v_purchase_id UUID;
  v_entitlement_id UUID;
  v_expires_at TIMESTAMPTZ;
BEGIN
  IF v_actor IS NOT NULL
     AND NOT public.is_admin(v_actor)
     AND v_actor <> p_customer_id THEN
    RAISE EXCEPTION 'Unauthorized: you can only purchase offers for yourself.';
  END IF;

  SELECT * INTO v_o FROM public.offers WHERE id = p_offer_id FOR UPDATE;
  IF NOT FOUND OR v_o.status <> 'active' THEN
    RETURN jsonb_build_object('success', false, 'error', 'This offer is not available.');
  END IF;
  IF v_o.valid_from IS NOT NULL AND now() < v_o.valid_from THEN
    RETURN jsonb_build_object('success', false, 'error', 'This offer has not started yet.');
  END IF;
  IF v_o.valid_until IS NOT NULL AND now() > v_o.valid_until THEN
    RETURN jsonb_build_object('success', false, 'error', 'This offer has ended.');
  END IF;
  IF COALESCE(v_o.purchase_price, 0) <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'This offer is free — claim it instead of paying.');
  END IF;
  IF NOT public.is_customer_offer_eligible(v_o.id, p_customer_id) THEN
    RETURN jsonb_build_object('success', false, 'error',
      CASE WHEN v_o.eligibility = 'new' THEN 'This offer is for new customers only.'
           ELSE 'This offer is for existing customers only.' END);
  END IF;

  BEGIN
    -- Bonus-first wallet debit (protects the user's real money).
    SELECT wallet_balance, wallet_cash_balance, wallet_bonus_balance
      INTO v_total, v_cash, v_bonus
      FROM public.profiles
     WHERE id = p_customer_id FOR UPDATE;

    IF COALESCE(v_total, 0) < v_o.purchase_price THEN
      RETURN jsonb_build_object('success', false, 'error', 'Insufficient wallet balance.');
    END IF;

    v_spend_bonus := LEAST(COALESCE(v_bonus, 0), v_o.purchase_price);
    v_spend_cash  := v_o.purchase_price - v_spend_bonus;
    v_new_bonus   := COALESCE(v_bonus, 0) - v_spend_bonus;
    v_new_cash    := COALESCE(v_cash, 0) - v_spend_cash;
    v_new_total   := v_new_cash + v_new_bonus;

    UPDATE public.profiles
       SET wallet_balance = v_new_total,
           wallet_cash_balance  = v_new_cash,
           wallet_bonus_balance = v_new_bonus
     WHERE id = p_customer_id;

    INSERT INTO public.offer_purchases (offer_id, customer_id, amount, status, payment_method, metadata)
    VALUES (v_o.id, p_customer_id, v_o.purchase_price, 'success', 'wallet',
            jsonb_build_object('cash_used', v_spend_cash, 'bonus_used', v_spend_bonus))
    RETURNING id INTO v_purchase_id;

    INSERT INTO public.wallet_transactions (
      user_id, type, source, amount, balance_after, description, reference_id, metadata, balance_type
    ) VALUES (
      p_customer_id, 'debit', 'offer_purchase', v_o.purchase_price, v_new_total,
      'Purchased offer: ' || v_o.title, v_purchase_id,
      jsonb_build_object('offer_id', v_o.id, 'offer_code', v_o.code,
                         'cash_used', v_spend_cash, 'bonus_used', v_spend_bonus),
      'cash'
    );

    IF v_o.validity_model = 'relative_days' THEN
      v_expires_at := now() + (v_o.valid_days * interval '1 day');
    ELSE
      v_expires_at := v_o.valid_until;
    END IF;

    INSERT INTO public.offer_entitlements (
      offer_id, customer_id, purchase_id, offer_type,
      original_value, remaining_value, total_uses, remaining_uses,
      purchased_price, status, activated_at, expires_at, metadata
    ) VALUES (
      v_o.id, p_customer_id, v_purchase_id, v_o.offer_type,
      CASE WHEN v_o.offer_type = 'SERVICE_CREDIT' THEN v_o.benefit_value ELSE 0 END,
      CASE WHEN v_o.offer_type = 'SERVICE_CREDIT' THEN v_o.benefit_value ELSE 0 END,
      CASE WHEN v_o.offer_type = 'SERVICE_CREDIT' THEN 1
           WHEN v_o.usage_limit_type = 'one_time' THEN 1
           ELSE v_o.max_redemptions_per_customer END,
      CASE WHEN v_o.offer_type = 'SERVICE_CREDIT' THEN 1
           WHEN v_o.usage_limit_type = 'one_time' THEN 1
           ELSE v_o.max_redemptions_per_customer END,
      v_o.purchase_price,
      'active', now(), v_expires_at,
      jsonb_build_object(
        'offer_code', v_o.code, 'offer_title', v_o.title, 'offer_type', v_o.offer_type,
        'benefit_value', v_o.benefit_value, 'max_discount', v_o.max_discount,
        'min_booking_amount', v_o.min_booking_amount, 'validity_model', v_o.validity_model,
        'usage_limit_type', v_o.usage_limit_type,
        'max_redemptions_per_customer', v_o.max_redemptions_per_customer,
        'eligibility', v_o.eligibility
      )
    )
    RETURNING id INTO v_entitlement_id;

    RETURN jsonb_build_object(
      'success', true,
      'entitlement_id', v_entitlement_id,
      'new_balance', v_new_total,
      'new_cash', v_new_cash,
      'new_bonus', v_new_bonus
    );
  EXCEPTION
    WHEN OTHERS THEN
      RETURN jsonb_build_object('success', false, 'error', SQLERRM);
  END;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.purchase_offer_with_wallet(UUID, UUID) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.purchase_offer_with_wallet(UUID, UUID) TO authenticated, service_role;

-- ─── 16. CLAIM FREE OFFER (purchase_price = 0) ───────────────
CREATE OR REPLACE FUNCTION public.claim_free_offer(
  p_offer_id    UUID,
  p_customer_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor       UUID := auth.uid();
  v_o           public.offers%ROWTYPE;
  v_entitlement_id UUID;
  v_expires_at  TIMESTAMPTZ;
BEGIN
  IF v_actor IS NOT NULL
     AND NOT public.is_admin(v_actor)
     AND v_actor <> p_customer_id THEN
    RAISE EXCEPTION 'Unauthorized: you can only claim offers for yourself.';
  END IF;

  SELECT * INTO v_o FROM public.offers WHERE id = p_offer_id FOR UPDATE;
  IF NOT FOUND OR v_o.status <> 'active' THEN
    RETURN jsonb_build_object('success', false, 'error', 'This offer is not available.');
  END IF;
  IF v_o.valid_from IS NOT NULL AND now() < v_o.valid_from THEN
    RETURN jsonb_build_object('success', false, 'error', 'This offer has not started yet.');
  END IF;
  IF v_o.valid_until IS NOT NULL AND now() > v_o.valid_until THEN
    RETURN jsonb_build_object('success', false, 'error', 'This offer has ended.');
  END IF;
  IF COALESCE(v_o.purchase_price, 0) > 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'This offer costs money — purchase it instead.');
  END IF;
  IF NOT public.is_customer_offer_eligible(v_o.id, p_customer_id) THEN
    RETURN jsonb_build_object('success', false, 'error',
      CASE WHEN v_o.eligibility = 'new' THEN 'This offer is for new customers only.'
           ELSE 'This offer is for existing customers only.' END);
  END IF;

  IF v_o.validity_model = 'relative_days' THEN
    v_expires_at := now() + (v_o.valid_days * interval '1 day');
  ELSE
    v_expires_at := v_o.valid_until;
  END IF;

  BEGIN
    INSERT INTO public.offer_entitlements (
      offer_id, customer_id, purchase_id, offer_type,
      original_value, remaining_value, total_uses, remaining_uses,
      purchased_price, status, activated_at, expires_at, metadata
    ) VALUES (
      v_o.id, p_customer_id, NULL, v_o.offer_type,
      CASE WHEN v_o.offer_type = 'SERVICE_CREDIT' THEN v_o.benefit_value ELSE 0 END,
      CASE WHEN v_o.offer_type = 'SERVICE_CREDIT' THEN v_o.benefit_value ELSE 0 END,
      CASE WHEN v_o.offer_type = 'SERVICE_CREDIT' THEN 1
           WHEN v_o.usage_limit_type = 'one_time' THEN 1
           ELSE v_o.max_redemptions_per_customer END,
      CASE WHEN v_o.offer_type = 'SERVICE_CREDIT' THEN 1
           WHEN v_o.usage_limit_type = 'one_time' THEN 1
           ELSE v_o.max_redemptions_per_customer END,
      0,
      'active', now(), v_expires_at,
      jsonb_build_object('source', 'free_claim')
    )
    RETURNING id INTO v_entitlement_id;

    INSERT INTO public.offer_purchases (offer_id, customer_id, amount, status, payment_method, metadata)
    VALUES (v_o.id, p_customer_id, 0, 'success', 'free', jsonb_build_object('entitlement_id', v_entitlement_id));

    RETURN jsonb_build_object('success', true, 'entitlement_id', v_entitlement_id);
  EXCEPTION
    WHEN unique_violation THEN
      RETURN jsonb_build_object('success', false, 'error', 'You have already claimed this offer.');
    WHEN OTHERS THEN
      RETURN jsonb_build_object('success', false, 'error', SQLERRM);
  END;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.claim_free_offer(UUID, UUID) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.claim_free_offer(UUID, UUID) TO authenticated, service_role;