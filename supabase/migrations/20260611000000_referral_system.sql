-- ═══════════════════════════════════════════════════════════════
-- Referral System & Wallet Migration
-- Created: 2026-06-11
-- ═══════════════════════════════════════════════════════════════

-- ─── 1. ALTER profiles — add wallet & referral columns ────────

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS wallet_balance NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS referral_code_used TEXT,
  ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- ─── 2. ALTER bookings — add discount column ──────────────────

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS wallet_discount_applied NUMERIC(10,2) NOT NULL DEFAULT 0;

-- ─── 3. ALTER platform_settings — seed referral reward amounts ─
-- (table already exists from prior migrations)

INSERT INTO public.platform_settings (key, value)
VALUES
  ('referral_reward_referrer', '"100"'::jsonb),
  ('referral_reward_referred',  '"50"'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- ─── 4. CREATE referral_codes table ──────────────────────────

CREATE TABLE IF NOT EXISTS public.referral_codes (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  code       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id),
  UNIQUE (code)
);

-- ─── 5. CREATE referrals table ───────────────────────────────

CREATE TABLE IF NOT EXISTS public.referrals (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referred_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  booking_id        UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  status            TEXT NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending', 'completed', 'cancelled')),
  referrer_reward   NUMERIC(10,2) NOT NULL DEFAULT 100,
  referred_discount NUMERIC(10,2) NOT NULL DEFAULT 50,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at      TIMESTAMPTZ,
  UNIQUE (referred_id)   -- each user can only be referred once
);

-- ─── 6. CREATE wallet_transactions table ─────────────────────

CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type          TEXT NOT NULL CHECK (type IN ('credit', 'debit')),
  source        TEXT NOT NULL CHECK (source IN ('referral_reward', 'booking_discount', 'admin_adjustment', 'refund')),
  amount        NUMERIC(10,2) NOT NULL,
  balance_after NUMERIC(10,2) NOT NULL,
  description   TEXT,
  reference_id  UUID,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── 7. INDEXES ───────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_referral_codes_code ON public.referral_codes(code);
CREATE INDEX IF NOT EXISTS idx_referral_codes_user ON public.referral_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON public.referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred ON public.referrals(referred_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user ON public.wallet_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_created ON public.wallet_transactions(created_at DESC);

-- ─── 8. RLS ───────────────────────────────────────────────────

ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

-- referral_codes
DROP POLICY IF EXISTS "Users can view own referral code" ON public.referral_codes;
CREATE POLICY "Users can view own referral code" ON public.referral_codes
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can view all referral codes" ON public.referral_codes;
CREATE POLICY "Admins can view all referral codes" ON public.referral_codes
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- referrals
DROP POLICY IF EXISTS "Referrer can view their outbound referrals" ON public.referrals;
CREATE POLICY "Referrer can view their outbound referrals" ON public.referrals
  FOR SELECT TO authenticated USING (referrer_id = auth.uid());

DROP POLICY IF EXISTS "Referred user can view their own referral" ON public.referrals;
CREATE POLICY "Referred user can view their own referral" ON public.referrals
  FOR SELECT TO authenticated USING (referred_id = auth.uid());

DROP POLICY IF EXISTS "Admins can manage all referrals" ON public.referrals;
CREATE POLICY "Admins can manage all referrals" ON public.referrals
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- wallet_transactions
DROP POLICY IF EXISTS "Users can view own wallet transactions" ON public.wallet_transactions;
CREATE POLICY "Users can view own wallet transactions" ON public.wallet_transactions
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can view all wallet transactions" ON public.wallet_transactions;
CREATE POLICY "Admins can view all wallet transactions" ON public.wallet_transactions
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- ─── 9. RPC: generate_referral_code ─────────────────────────
-- Atomically creates a unique 7-char alphanumeric code for a user.
-- Idempotent: returns existing code if already generated.

CREATE OR REPLACE FUNCTION public.generate_referral_code(p_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code TEXT;
  v_existing TEXT;
  v_chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_len  INTEGER := 7;
  i      INTEGER;
  v_attempt INTEGER := 0;
BEGIN
  -- Idempotency: return existing code if present
  SELECT code INTO v_existing FROM public.referral_codes WHERE user_id = p_user_id;
  IF v_existing IS NOT NULL THEN
    RETURN v_existing;
  END IF;

  -- Generate a unique code
  LOOP
    v_attempt := v_attempt + 1;
    IF v_attempt > 10 THEN
      RAISE EXCEPTION 'Could not generate unique referral code after 10 attempts';
    END IF;

    v_code := '';
    FOR i IN 1..v_len LOOP
      v_code := v_code || substr(v_chars, floor(random() * length(v_chars) + 1)::INTEGER, 1);
    END LOOP;

    -- Insert; if UNIQUE violation, loop again
    BEGIN
      INSERT INTO public.referral_codes (user_id, code) VALUES (p_user_id, v_code);
      RETURN v_code;
    EXCEPTION WHEN unique_violation THEN
      -- try again
    END;
  END LOOP;
END;
$$;

-- ─── 10. RPC: apply_referral_code ─────────────────────────────
-- Called at registration to link a referred user to a referrer.
-- Returns JSON { success, error }.

CREATE OR REPLACE FUNCTION public.apply_referral_code(p_new_user_id UUID, p_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referrer_id UUID;
  v_referrer_reward NUMERIC(10,2);
  v_referred_discount NUMERIC(10,2);
BEGIN
  -- Look up referrer
  SELECT rc.user_id INTO v_referrer_id
    FROM public.referral_codes rc
    WHERE UPPER(TRIM(rc.code)) = UPPER(TRIM(p_code));

  IF v_referrer_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid referral code.');
  END IF;

  -- Self-referral check
  IF v_referrer_id = p_new_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'You cannot use your own referral code.');
  END IF;

  -- Already used a code?
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = p_new_user_id AND referral_code_used IS NOT NULL) THEN
    RETURN jsonb_build_object('success', false, 'error', 'You have already used a referral code.');
  END IF;

  -- Already been referred (referrals.referred_id is unique)?
  IF EXISTS (SELECT 1 FROM public.referrals WHERE referred_id = p_new_user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Referral already applied to this account.');
  END IF;

  -- Fetch reward amounts from platform_settings
  SELECT COALESCE((value#>>'{}')::NUMERIC, 100) INTO v_referrer_reward
    FROM public.platform_settings WHERE key = 'referral_reward_referrer';
  SELECT COALESCE((value#>>'{}')::NUMERIC, 50) INTO v_referred_discount
    FROM public.platform_settings WHERE key = 'referral_reward_referred';

  IF v_referrer_reward IS NULL THEN v_referrer_reward := 100; END IF;
  IF v_referred_discount IS NULL THEN v_referred_discount := 50; END IF;

  -- Update new user's profile with referral info
  UPDATE public.profiles
    SET referral_code_used = UPPER(TRIM(p_code)),
        referred_by = v_referrer_id
    WHERE id = p_new_user_id;

  -- Create pending referral record
  INSERT INTO public.referrals (referrer_id, referred_id, status, referrer_reward, referred_discount)
    VALUES (v_referrer_id, p_new_user_id, 'pending', v_referrer_reward, v_referred_discount);

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ─── 11. RPC: complete_referral_reward ────────────────────────
-- Called when a booking reaches 'completed'.
-- Only fires if: customer was referred AND this is their FIRST completed booking.
-- Atomically credits wallet and marks referral completed.

CREATE OR REPLACE FUNCTION public.complete_referral_reward(p_booking_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer_id   UUID;
  v_referrer_id   UUID;
  v_referral_id   UUID;
  v_reward        NUMERIC(10,2);
  v_new_balance   NUMERIC(10,2);
  v_first_booking BOOLEAN;
BEGIN
  -- Get customer of this booking
  SELECT customer_id INTO v_customer_id
    FROM public.bookings WHERE id = p_booking_id;

  IF v_customer_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Booking not found.');
  END IF;

  -- Check if customer was referred
  SELECT referred_by INTO v_referrer_id
    FROM public.profiles WHERE id = v_customer_id;

  IF v_referrer_id IS NULL THEN
    -- Not a referred user — nothing to do
    RETURN jsonb_build_object('success', true, 'skipped', true, 'reason', 'not_referred');
  END IF;

  -- Check pending referral exists
  SELECT id, referrer_reward INTO v_referral_id, v_reward
    FROM public.referrals
    WHERE referred_id = v_customer_id AND status = 'pending';

  IF v_referral_id IS NULL THEN
    -- Already completed or cancelled
    RETURN jsonb_build_object('success', true, 'skipped', true, 'reason', 'referral_not_pending');
  END IF;

  -- Verify this is the customer's FIRST completed booking
  SELECT (COUNT(*) = 1) INTO v_first_booking
    FROM public.bookings
    WHERE customer_id = v_customer_id AND status = 'completed';

  IF NOT v_first_booking THEN
    RETURN jsonb_build_object('success', true, 'skipped', true, 'reason', 'not_first_booking');
  END IF;

  -- Credit referrer's wallet atomically
  UPDATE public.profiles
    SET wallet_balance = wallet_balance + v_reward
    WHERE id = v_referrer_id
    RETURNING wallet_balance INTO v_new_balance;

  -- Log wallet transaction for referrer
  INSERT INTO public.wallet_transactions (user_id, type, source, amount, balance_after, description, reference_id)
    VALUES (v_referrer_id, 'credit', 'referral_reward', v_reward, v_new_balance,
            'Referral reward — friend completed first booking', p_booking_id);

  -- Mark referral as completed
  UPDATE public.referrals
    SET status = 'completed',
        booking_id = p_booking_id,
        completed_at = now()
    WHERE id = v_referral_id;

  RETURN jsonb_build_object('success', true, 'credited', v_reward, 'referrer_id', v_referrer_id);
END;
$$;

-- ─── 12. RPC: get_referral_stats ──────────────────────────────
-- Returns all referral and wallet stats for the dashboard UI.

CREATE OR REPLACE FUNCTION public.get_referral_stats(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code               TEXT;
  v_total_referrals    INTEGER;
  v_completed          INTEGER;
  v_pending            INTEGER;
  v_total_earned       NUMERIC(10,2);
  v_wallet_balance     NUMERIC(10,2);
BEGIN
  SELECT code INTO v_code
    FROM public.referral_codes WHERE user_id = p_user_id;

  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'completed'),
    COUNT(*) FILTER (WHERE status = 'pending')
  INTO v_total_referrals, v_completed, v_pending
    FROM public.referrals WHERE referrer_id = p_user_id;

  SELECT COALESCE(SUM(amount), 0) INTO v_total_earned
    FROM public.wallet_transactions
    WHERE user_id = p_user_id AND type = 'credit' AND source = 'referral_reward';

  SELECT COALESCE(wallet_balance, 0) INTO v_wallet_balance
    FROM public.profiles WHERE id = p_user_id;

  RETURN jsonb_build_object(
    'code',               COALESCE(v_code, ''),
    'total_referrals',    COALESCE(v_total_referrals, 0),
    'completed_referrals',COALESCE(v_completed, 0),
    'pending_referrals',  COALESCE(v_pending, 0),
    'total_earned',       COALESCE(v_total_earned, 0),
    'wallet_balance',     COALESCE(v_wallet_balance, 0)
  );
END;
$$;

-- ─── 13. RPC: use_wallet_balance ──────────────────────────────
-- Called at checkout when customer pays with wallet.
-- Atomically debits balance; fails if insufficient funds.

CREATE OR REPLACE FUNCTION public.use_wallet_balance(p_user_id UUID, p_amount NUMERIC, p_booking_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_balance NUMERIC(10,2);
  v_new_balance     NUMERIC(10,2);
BEGIN
  SELECT wallet_balance INTO v_current_balance
    FROM public.profiles WHERE id = p_user_id FOR UPDATE;

  IF v_current_balance < p_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient wallet balance.');
  END IF;

  v_new_balance := v_current_balance - p_amount;

  UPDATE public.profiles SET wallet_balance = v_new_balance WHERE id = p_user_id;

  INSERT INTO public.wallet_transactions (user_id, type, source, amount, balance_after, description, reference_id)
    VALUES (p_user_id, 'debit', 'booking_discount', p_amount, v_new_balance,
            'Wallet payment applied to booking', p_booking_id);

  RETURN jsonb_build_object('success', true, 'new_balance', v_new_balance);
END;
$$;
