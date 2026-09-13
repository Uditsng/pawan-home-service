-- ═══════════════════════════════════════════════════════════════
-- Real-Money Wallet Recharge — Razorpay Payment Ledger
-- Created: 2026-09-20
--
-- Adds the wallet_recharges table, the atomic credit RPC, user-initiated
-- status transitions (failed/cancelled), and admin wallet adjustments.
--
-- Security invariants (strictly enforced):
--   * complete_wallet_recharge is the ONLY writer that credits a recharge.
--     service_role-only, idempotent, amount-locked.
--   * Failed / cancelled / pending recharges NEVER credit anything.
--   * admin_wallet_adjustment requires is_admin(auth.uid()).
-- ═══════════════════════════════════════════════════════════════

-- ─── 1. WALLET_RECHARGES — pending payment ledger ─────────────
CREATE TABLE IF NOT EXISTS public.wallet_recharges (
  id                 UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id            UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount             NUMERIC(10,2) NOT NULL CHECK (amount >= 1),
  status             TEXT NOT NULL DEFAULT 'created'
                       CHECK (status IN ('created', 'pending', 'success', 'failed', 'cancelled', 'refunded')),
  razorpay_order_id  TEXT,
  razorpay_payment_id TEXT,
  razorpay_signature TEXT,
  payment_method     TEXT,
  failure_reason     TEXT,
  metadata           JSONB,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wallet_recharges_user
  ON public.wallet_recharges (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_recharges_order
  ON public.wallet_recharges (razorpay_order_id);
-- DB-level idempotency: one Razorpay payment can credit wallet only once.
CREATE UNIQUE INDEX IF NOT EXISTS uq_wallet_recharges_payment
  ON public.wallet_recharges (razorpay_payment_id)
  WHERE razorpay_payment_id IS NOT NULL;

ALTER TABLE public.wallet_recharges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own wallet recharges" ON public.wallet_recharges;
CREATE POLICY "Users can view own wallet recharges" ON public.wallet_recharges
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Users can insert their own pending recharges (status = 'created', sane amount).
DROP POLICY IF EXISTS "Users can create own wallet recharges" ON public.wallet_recharges;
CREATE POLICY "Users can create own wallet recharges" ON public.wallet_recharges
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND status = 'created' AND amount >= 1 AND amount <= 200000);

DROP POLICY IF EXISTS "Admins can manage wallet recharges" ON public.wallet_recharges;
CREATE POLICY "Admins can manage wallet recharges" ON public.wallet_recharges
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- ─── 2. ATOMIC RECHARGE CREDIT RPC ────────────────────────────
-- THE ONLY writer that credits a recharge.  service_role-only.  Idempotent:
--   * status guard ('success' → already credited),
--   * unique partial index on razorpay_payment_id (single credit per payment),
--   * locks the recharge row FOR UPDATE (serializes concurrent callers),
--   * asserts recharge.amount == gateway_verified_amount.
CREATE OR REPLACE FUNCTION public.complete_wallet_recharge(
  p_recharge_id            UUID,
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
  v_r         public.wallet_recharges%ROWTYPE;
  v_new_total NUMERIC(10,2);
  v_new_cash  NUMERIC(10,2);
  v_tx_id     UUID;
BEGIN
  IF p_payment_id IS NULL OR btrim(p_payment_id) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Missing payment id.');
  END IF;

  SELECT * INTO v_r
    FROM public.wallet_recharges
   WHERE id = p_recharge_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Recharge not found.');
  END IF;

  IF v_r.razorpay_order_id IS DISTINCT FROM p_razorpay_order_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Gateway order mismatch.');
  END IF;

  IF v_r.status = 'success' THEN
    RETURN jsonb_build_object('success', true, 'already_credited', true);
  END IF;

  IF v_r.status NOT IN ('created', 'pending') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Recharge can no longer be credited.');
  END IF;

  IF v_r.amount IS DISTINCT FROM p_gateway_verified_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Amount mismatch with gateway.');
  END IF;

  -- Credit CASH only.
  UPDATE public.profiles
     SET wallet_balance       = wallet_balance + v_r.amount,
         wallet_cash_balance  = wallet_cash_balance + v_r.amount
   WHERE id = v_r.user_id
   RETURNING wallet_balance, wallet_cash_balance INTO v_new_total, v_new_cash;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found.');
  END IF;

  INSERT INTO public.wallet_transactions (
    user_id, type, source, amount, balance_after, description, reference_id, metadata, balance_type
  ) VALUES (
    v_r.user_id, 'credit', 'recharge', v_r.amount, v_new_total,
    'Wallet recharge of ₹' || ROUND(v_r.amount, 0)::TEXT, v_r.id,
    jsonb_build_object(
      'razorpay_order_id', p_razorpay_order_id,
      'razorpay_payment_id', p_payment_id,
      'razorpay_signature', p_signature,
      'method', p_method
    ),
    'cash'
  )
  RETURNING id INTO v_tx_id;

  UPDATE public.wallet_recharges
     SET status             = 'success',
         razorpay_payment_id = p_payment_id,
         razorpay_signature  = p_signature,
         payment_method      = p_method,
         updated_at          = now()
   WHERE id = v_r.id;

  RETURN jsonb_build_object(
    'success', true,
    'credited', v_r.amount,
    'new_balance', v_new_total,
    'new_cash', v_new_cash,
    'transaction_id', v_tx_id
  );
EXCEPTION
  WHEN unique_violation THEN
    -- Unique partial index on razorpay_payment_id caught a concurrent double-call.
    RETURN jsonb_build_object('success', false, 'error', 'Payment already credited.');
END;
$$;

REVOKE EXECUTE ON FUNCTION public.complete_wallet_recharge(UUID, TEXT, TEXT, TEXT, NUMERIC, TEXT) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.complete_wallet_recharge(UUID, TEXT, TEXT, TEXT, NUMERIC, TEXT) TO service_role;

-- ─── 3. USER-INITIATED STATUS TRANSITIONS ─────────────────────
-- Customers may mark their own recharges as failed or cancelled (e.g. when
-- the Razorpay modal is dismissed).  Only transitions FROM created/pending
-- are allowed; success/refunded can never be undone.
CREATE OR REPLACE FUNCTION public.update_wallet_recharge_status(
  p_recharge_id UUID,
  p_status      TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_r     public.wallet_recharges%ROWTYPE;
  v_actor UUID := auth.uid();
BEGIN
  IF p_status NOT IN ('failed', 'cancelled') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only failed/cancelled transitions are allowed.');
  END IF;

  SELECT * INTO v_r
    FROM public.wallet_recharges
   WHERE id = p_recharge_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Recharge not found.');
  END IF;

  -- Authorization: the owner, an admin, or a server-side caller (v_actor NULL = service-role).
  IF v_actor IS NOT NULL
     AND NOT public.is_admin(v_actor)
     AND v_r.user_id <> v_actor THEN
    RAISE EXCEPTION 'Unauthorized: you cannot update this recharge.';
  END IF;

  IF v_r.status IN ('success', 'refunded') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Settled recharges cannot be changed.');
  END IF;

  IF v_r.status NOT IN ('created', 'pending') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Recharge is already terminal: ' || v_r.status);
  END IF;

  UPDATE public.wallet_recharges
     SET status    = p_status,
         updated_at = now()
   WHERE id = p_recharge_id;

  RETURN jsonb_build_object('success', true, 'status', p_status);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.update_wallet_recharge_status(UUID, TEXT) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.update_wallet_recharge_status(UUID, TEXT) TO authenticated, service_role;

-- ─── 4. ADMIN WALLET ADJUSTMENT ───────────────────────────────
-- Admins may credit or debit any customer's wallet.  The debit is clamped
-- so that the sub-balance never goes negative.  Every adjustment is written
-- to wallet_transactions as an auditable ledger entry with before/after
-- balances in the metadata JSON.
CREATE OR REPLACE FUNCTION public.admin_wallet_adjustment(
  p_user_id      UUID,
  p_amount       NUMERIC,
  p_balance_type TEXT DEFAULT 'cash',
  p_reason       TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor        UUID := auth.uid();
  v_before_total NUMERIC(10,2);
  v_cash         NUMERIC(10,2);
  v_bonus        NUMERIC(10,2);
  v_new_total    NUMERIC(10,2);
  v_new_cash     NUMERIC(10,2);
  v_new_bonus    NUMERIC(10,2);
  v_tx_type      TEXT;
  v_tx_id        UUID;
BEGIN
  -- Authorization: admins only (service_role bypasses auth.uid() IS NULL).
  IF v_actor IS NOT NULL AND NOT public.is_admin(v_actor) THEN
    RAISE EXCEPTION 'Administrative access required.';
  END IF;

  IF p_amount IS NULL OR p_amount = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Amount must be non-zero.');
  END IF;

  IF p_balance_type NOT IN ('cash', 'bonus') THEN
    p_balance_type := 'cash';
  END IF;

  SELECT wallet_balance, wallet_cash_balance, wallet_bonus_balance
    INTO v_before_total, v_cash, v_bonus
    FROM public.profiles
   WHERE id = p_user_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found.');
  END IF;

  v_cash  := COALESCE(v_cash, 0);
  v_bonus := COALESCE(v_bonus, 0);

  IF p_balance_type = 'cash' THEN
    v_new_cash  := v_cash + p_amount;
    v_new_bonus := v_bonus;
  ELSE
    v_new_cash  := v_cash;
    v_new_bonus := v_bonus + p_amount;
  END IF;

  IF v_new_cash < 0 OR v_new_bonus < 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient ' || p_balance_type || ' balance for debit.');
  END IF;

  v_new_total := v_new_cash + v_new_bonus;

  UPDATE public.profiles
     SET wallet_balance       = v_new_total,
         wallet_cash_balance  = v_new_cash,
         wallet_bonus_balance = v_new_bonus
   WHERE id = p_user_id;

  v_tx_type := CASE WHEN p_amount > 0 THEN 'credit' ELSE 'debit' END;

  INSERT INTO public.wallet_transactions (
    user_id, type, source, amount, balance_after, description, reference_id, metadata, balance_type
  ) VALUES (
    p_user_id,
    v_tx_type,
    'admin_adjustment',
    ABS(p_amount),
    v_new_total,
    COALESCE(p_reason, 'Admin wallet adjustment'),
    NULL,
    jsonb_build_object(
      'admin_id',      v_actor,
      'reason',        p_reason,
      'balance_type',  p_balance_type,
      'before_total',  v_before_total,
      'before_cash',   v_cash,
      'before_bonus',  v_bonus,
      'after_total',   v_new_total,
      'after_cash',    v_new_cash,
      'after_bonus',   v_new_bonus
    ),
    p_balance_type
  )
  RETURNING id INTO v_tx_id;

  RETURN jsonb_build_object(
    'success',       true,
    'transaction_id', v_tx_id,
    'new_balance',    v_new_total,
    'new_cash',       v_new_cash,
    'new_bonus',      v_new_bonus
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_wallet_adjustment(UUID, NUMERIC, TEXT, TEXT) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.admin_wallet_adjustment(UUID, NUMERIC, TEXT, TEXT) TO authenticated, service_role;