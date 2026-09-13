-- ═══════════════════════════════════════════════════════════════
-- Real-Money Wallet — Cash / Bonus Ledger Split
-- Created: 2026-09-20
--
-- Adds a proper cash/bonus balance split on top of the existing wallet.
--
-- Key design decisions (approved architecture):
--   * profiles keeps wallet_balance as the TOTAL (cash + bonus) so every
--     existing consumer (checkout, refund trigger, referral stats, wallet
--     hero) keeps working without changes.
--   * wallet_cash_balance / wallet_bonus_balance are the authoritative
--     sub-ledgers; wallet_balance is always kept in sync = cash + bonus.
--   * Recharges credit CASH only. Bonus is promo/referral money.
--   * credit_wallet() gains a balance_type param; referral rewards route to
--     BONUS, admin adjustments and recharges default to CASH.
--   * The protected-column trigger now also guards the new sub-balances.
--   * Wallet debits consume bonus first (protects the user's real money).
-- ═══════════════════════════════════════════════════════════════

-- ─── 1. PROFILES — cash/bonus sub-balances ────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS wallet_cash_balance  NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS wallet_bonus_balance NUMERIC(10,2) NOT NULL DEFAULT 0;

-- Backfill: treat historical balances as cash, carve out the portion that
-- provably came from referral credits into bonus (capped so cash never goes
-- negative and cash + bonus always equals the existing wallet_balance).
UPDATE public.profiles p
   SET wallet_bonus_balance = LEAST(
         COALESCE((
           SELECT SUM(w.amount) FROM public.wallet_transactions w
            WHERE w.user_id = p.id
              AND w.type    = 'credit'
              AND w.source IN ('referral_reward', 'referral_bonus')
         ), 0),
         COALESCE(p.wallet_balance, 0)
       ),
       wallet_cash_balance = COALESCE(p.wallet_balance, 0) - LEAST(
         COALESCE((
           SELECT SUM(w.amount) FROM public.wallet_transactions w
            WHERE w.user_id = p.id
              AND w.type    = 'credit'
              AND w.source IN ('referral_reward', 'referral_bonus')
         ), 0),
         COALESCE(p.wallet_balance, 0)
       )
 WHERE COALESCE(p.wallet_balance, 0) > 0;

-- Extend the protected-column trigger so users can never self-edit the new
-- sub-balance columns (RLS owned-row hole stays closed).
CREATE OR REPLACE FUNCTION public.protect_profiles_protected_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_actor_id  UUID      := NULL;
  v_is_admin  BOOLEAN;
BEGIN
  BEGIN
    v_actor_id := auth.uid();
  EXCEPTION WHEN OTHERS THEN
    v_actor_id := NULL;
  END;

  -- Bypass: inside a SECURITY DEFINER function (current_user <> session_user).
  IF current_user IS DISTINCT FROM session_user THEN
    RETURN NEW;
  END IF;

  -- Bypass: service-role key holders.
  IF v_actor_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Admins may change everything.
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = v_actor_id AND role = 'admin'
  ) INTO v_is_admin;

  IF v_is_admin THEN
    RETURN NEW;
  END IF;

  -- Non-admins may never mutate these protected columns.
  IF NEW.wallet_balance IS DISTINCT FROM OLD.wallet_balance
     OR NEW.wallet_cash_balance  IS DISTINCT FROM OLD.wallet_cash_balance
     OR NEW.wallet_bonus_balance IS DISTINCT FROM OLD.wallet_bonus_balance
     OR NEW.referred_by IS DISTINCT FROM OLD.referred_by
     OR NEW.referral_code_used IS DISTINCT FROM OLD.referral_code_used
     OR NEW.role IS DISTINCT FROM OLD.role
     OR NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'Protected profile column change is not allowed for non-admin users.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_protect_profiles_protected_columns ON public.profiles;
CREATE TRIGGER tr_protect_profiles_protected_columns
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profiles_protected_columns();

-- ─── 2. WALLET_TRANSACTIONS — balance_type + new sources ─────
ALTER TABLE public.wallet_transactions
  ADD COLUMN IF NOT EXISTS balance_type TEXT NOT NULL DEFAULT 'cash'
    CHECK (balance_type IN ('cash', 'bonus'));

ALTER TABLE public.wallet_transactions
  DROP CONSTRAINT IF EXISTS wallet_transactions_source_check;
ALTER TABLE public.wallet_transactions
  ADD CONSTRAINT wallet_transactions_source_check
    CHECK (source IN (
      'referral_reward', 'referral_bonus', 'booking_discount',
      'admin_adjustment', 'refund', 'recharge', 'promo_credit', 'reversal'
    ));

-- ─── 3. CREDIT WALLET — balance_type aware ────────────────────
CREATE OR REPLACE FUNCTION public.credit_wallet(
  p_user_id      UUID,
  p_amount       NUMERIC,
  p_source       TEXT,
  p_reference_id UUID DEFAULT NULL,
  p_metadata     JSONB DEFAULT NULL,
  p_description  TEXT DEFAULT NULL,
  p_balance_type TEXT DEFAULT 'cash'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_total    NUMERIC(10,2);
  v_new_cash     NUMERIC(10,2);
  v_new_bonus    NUMERIC(10,2);
  v_tx_id        UUID;
  v_balance_type TEXT;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Amount must be positive.');
  END IF;

  IF p_balance_type IN ('cash', 'bonus') THEN v_balance_type := p_balance_type;
  ELSE v_balance_type := 'cash'; END IF;

  UPDATE public.profiles
     SET wallet_balance       = wallet_balance + p_amount,
         wallet_cash_balance  = wallet_cash_balance + (CASE WHEN v_balance_type = 'cash'  THEN p_amount ELSE 0 END),
         wallet_bonus_balance = wallet_bonus_balance + (CASE WHEN v_balance_type = 'bonus' THEN p_amount ELSE 0 END)
   WHERE id = p_user_id
   RETURNING wallet_balance, wallet_cash_balance, wallet_bonus_balance
   INTO v_new_total, v_new_cash, v_new_bonus;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found.');
  END IF;

  INSERT INTO public.wallet_transactions (
    user_id, type, source, amount, balance_after, description, reference_id, metadata, balance_type
  ) VALUES (
    p_user_id, 'credit', p_source, p_amount, v_new_total, p_description, p_reference_id, p_metadata, v_balance_type
  )
  RETURNING id INTO v_tx_id;

  RETURN jsonb_build_object(
    'success', true,
    'new_balance', v_new_total,
    'new_cash', v_new_cash,
    'new_bonus', v_new_bonus,
    'transaction_id', v_tx_id
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.credit_wallet(UUID, NUMERIC, TEXT, UUID, JSONB, TEXT, TEXT) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.credit_wallet(UUID, NUMERIC, TEXT, UUID, JSONB, TEXT, TEXT) TO service_role;

-- ─── 4. REFERRAL REWARDS → BONUS ──────────────────────────────
-- Referral credits are promotional money: they land in BONUS.

CREATE OR REPLACE FUNCTION public.reward_customer_referral(p_referral_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referral public.referrals%ROWTYPE;
  v_actor_id UUID;
BEGIN
  BEGIN
    v_actor_id := auth.uid();
  EXCEPTION WHEN OTHERS THEN
    v_actor_id := NULL;
  END;

  SELECT * INTO v_referral
    FROM public.referrals
   WHERE id = p_referral_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Referral not found.');
  END IF;

  IF v_actor_id IS NOT NULL
     AND NOT public.is_admin(v_actor_id)
     AND v_actor_id NOT IN (v_referral.referrer_id, v_referral.referred_id) THEN
    RAISE EXCEPTION 'Unauthorized: cannot reward a referral you are not part of.';
  END IF;

  IF v_referral.reward_model <> 'wallet_v1' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Referral is not under the wallet reward model.');
  END IF;

  IF v_referral.status = 'rewarded' THEN
    RETURN jsonb_build_object('success', true, 'already_rewarded', true);
  END IF;

  IF v_referral.status <> 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Referral is not rewardable.');
  END IF;

  -- Defense in depth: if credits already exist, mark rewarded, never double-pay.
  IF EXISTS (
    SELECT 1 FROM public.wallet_transactions
     WHERE reference_id = p_referral_id
       AND source IN ('referral_reward', 'referral_bonus')
  ) THEN
    UPDATE public.referrals
       SET status = 'rewarded', rewarded_at = now()
     WHERE id = p_referral_id;
    RETURN jsonb_build_object('success', true, 'already_rewarded', true);
  END IF;

  -- Lock profiles in canonical order to avoid deadlocks.
  PERFORM 1 FROM public.profiles
    WHERE id IN (v_referral.referrer_id, v_referral.referred_id)
    ORDER BY id
    FOR UPDATE;

  PERFORM public.credit_wallet(
    p_user_id      => v_referral.referrer_id,
    p_amount       => v_referral.referrer_reward,
    p_source       => 'referral_reward',
    p_reference_id => p_referral_id,
    p_metadata     => jsonb_build_object('program', 'customer', 'party', 'referrer'),
    p_description  => 'Referral reward — someone joined PHS with your code',
    p_balance_type => 'bonus'
  );

  PERFORM public.credit_wallet(
    p_user_id      => v_referral.referred_id,
    p_amount       => COALESCE(v_referral.referred_discount, 0),
    p_source       => 'referral_bonus',
    p_reference_id => p_referral_id,
    p_metadata     => jsonb_build_object('program', 'customer', 'party', 'referred'),
    p_description  => 'Referral bonus — wallet reward for joining PHS',
    p_balance_type => 'bonus'
  );

  UPDATE public.referrals
     SET status = 'rewarded',
         qualified_at = COALESCE(qualified_at, now()),
         rewarded_at  = now()
   WHERE id = p_referral_id;

  INSERT INTO public.referral_events (referral_id, event_type, actor_role)
    VALUES (p_referral_id, 'rewarded', COALESCE(v_actor_id::TEXT, 'system'));

  RETURN jsonb_build_object('success', true, 'referral_id', p_referral_id);
EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('success', true, 'already_rewarded', true);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.reward_customer_referral(UUID) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.reward_customer_referral(UUID) TO authenticated;

-- Legacy payout path credits bonus as well.
CREATE OR REPLACE FUNCTION public.complete_legacy_referral_reward(p_booking_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer_id   UUID;
  v_referral      public.referrals%ROWTYPE;
  v_reward        NUMERIC(10,2);
  v_new_balance   NUMERIC(10,2);
  v_first_booking BOOLEAN;
  v_actor_id      UUID;
BEGIN
  BEGIN
    v_actor_id := auth.uid();
  EXCEPTION WHEN OTHERS THEN
    v_actor_id := NULL;
  END;

  SELECT customer_id INTO v_customer_id
    FROM public.bookings WHERE id = p_booking_id;

  IF v_customer_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Booking not found.');
  END IF;

  SELECT * INTO v_referral
    FROM public.referrals
   WHERE referred_id = v_customer_id
     AND status = 'pending'
     AND reward_model = 'legacy'
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', true, 'skipped', true, 'reason', 'no_pending_legacy_referral');
  END IF;

  v_reward := v_referral.referrer_reward;

  SELECT (COUNT(*) = 1) INTO v_first_booking
    FROM public.bookings
   WHERE customer_id = v_customer_id AND status = 'completed';

  IF NOT v_first_booking THEN
    RETURN jsonb_build_object('success', true, 'skipped', true, 'reason', 'not_first_booking');
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.wallet_transactions
     WHERE user_id = v_referral.referrer_id
       AND source = 'referral_reward'
       AND reference_id = p_booking_id
  ) THEN
    RETURN jsonb_build_object('success', true, 'skipped', true, 'reason', 'already_rewarded');
  END IF;

  UPDATE public.profiles
     SET wallet_balance       = wallet_balance + v_reward,
         wallet_bonus_balance = wallet_bonus_balance + v_reward
   WHERE id = v_referral.referrer_id
   RETURNING wallet_balance INTO v_new_balance;

  INSERT INTO public.wallet_transactions (
    user_id, type, source, amount, balance_after, description, reference_id, metadata, balance_type
  ) VALUES (
    v_referral.referrer_id, 'credit', 'referral_reward', v_reward, v_new_balance,
    'Referral reward — friend completed first booking', p_booking_id,
    jsonb_build_object('program', 'customer', 'party', 'referrer', 'model', 'legacy'),
    'bonus'
  );

  UPDATE public.referrals
     SET status = 'completed',
         booking_id = p_booking_id,
         completed_at = now()
   WHERE id = v_referral.id AND status = 'pending';

  INSERT INTO public.referral_events (referral_id, event_type, actor_role, metadata)
    VALUES (v_referral.id, 'completed', COALESCE(v_actor_id::TEXT, 'system'),
            jsonb_build_object('booking_id', p_booking_id));

  RETURN jsonb_build_object('success', true, 'credited', v_reward, 'referrer_id', v_referral.referrer_id);
EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('success', true, 'skipped', true, 'reason', 'already_rewarded');
END;
$$;

REVOKE EXECUTE ON FUNCTION public.complete_legacy_referral_reward(UUID) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.complete_legacy_referral_reward(UUID) TO authenticated;

-- ─── 5. WALLET DEBIT — bonus-first consumption ────────────────
-- Booking payments consume bonus before cash (protect the user's real money).
CREATE OR REPLACE FUNCTION public.use_wallet_balance(p_user_id UUID, p_amount NUMERIC, p_booking_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total       NUMERIC(10,2);
  v_cash        NUMERIC(10,2);
  v_bonus       NUMERIC(10,2);
  v_spend_bonus NUMERIC(10,2);
  v_spend_cash  NUMERIC(10,2);
  v_new_total   NUMERIC(10,2);
  v_new_cash    NUMERIC(10,2);
  v_new_bonus   NUMERIC(10,2);
BEGIN
  SELECT wallet_balance, wallet_cash_balance, wallet_bonus_balance
    INTO v_total, v_cash, v_bonus
    FROM public.profiles WHERE id = p_user_id FOR UPDATE;

  IF COALESCE(v_total, 0) < p_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient wallet balance.');
  END IF;

  v_spend_bonus := LEAST(COALESCE(v_bonus, 0), p_amount);
  v_spend_cash  := p_amount - v_spend_bonus;
  v_new_bonus   := COALESCE(v_bonus, 0) - v_spend_bonus;
  v_new_cash    := COALESCE(v_cash, 0) - v_spend_cash;
  v_new_total   := v_new_cash + v_new_bonus;

  UPDATE public.profiles
     SET wallet_balance       = v_new_total,
         wallet_cash_balance  = v_new_cash,
         wallet_bonus_balance = v_new_bonus
   WHERE id = p_user_id;

  INSERT INTO public.wallet_transactions (
    user_id, type, source, amount, balance_after, description, reference_id, metadata, balance_type
  ) VALUES (
    p_user_id, 'debit', 'booking_discount', p_amount, v_new_total,
    'Wallet payment applied to booking', p_booking_id,
    jsonb_build_object('cash_used', v_spend_cash, 'bonus_used', v_spend_bonus),
    'cash'
  );

  RETURN jsonb_build_object('success', true, 'new_balance', v_new_total,
    'new_cash', v_new_cash, 'new_bonus', v_new_bonus);
END;
$$;

-- ─── 6. CANCELLATION REFUND → CASH ────────────────────────────
-- A refund restores the customer's CASH ledger (they paid real money);
-- total stays in sync with cash + bonus.
CREATE OR REPLACE FUNCTION public.handle_booking_cancellation_refund()
RETURNS TRIGGER AS $$
DECLARE
  v_new_balance NUMERIC(10, 2);
BEGIN
  IF NEW.status = 'cancelled'
     AND OLD.status IS DISTINCT FROM 'cancelled'
     AND NEW.payment_status = 'paid'
     AND NEW.refund_eligible IS NOT FALSE
     AND NOT EXISTS (
       SELECT 1 FROM public.wallet_transactions
        WHERE reference_id = NEW.id
          AND source       = 'refund'
     ) THEN
    UPDATE public.profiles
       SET wallet_balance       = wallet_balance + NEW.total_amount,
           wallet_cash_balance  = wallet_cash_balance + NEW.total_amount
     WHERE id = NEW.customer_id
     RETURNING wallet_balance INTO v_new_balance;

    INSERT INTO public.wallet_transactions (
      user_id, type, source, amount, balance_after, description, reference_id, metadata, balance_type
    ) VALUES (
      NEW.customer_id,
      'credit',
      'refund',
      NEW.total_amount,
      v_new_balance,
      'Refund for cancelled booking #' || SUBSTRING(NEW.id::text, 1, 8),
      NEW.id,
      jsonb_build_object('booking_id', NEW.id),
      'cash'
    );

    NEW.payment_status := 'refunded';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_bookings_cancellation_refund ON public.bookings;
CREATE TRIGGER tr_bookings_cancellation_refund
  BEFORE UPDATE OF status ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_booking_cancellation_refund();