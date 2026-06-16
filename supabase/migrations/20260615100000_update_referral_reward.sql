-- Update default value for referrer_reward on referrals table
ALTER TABLE public.referrals ALTER COLUMN referrer_reward SET DEFAULT 50;

-- Update seed value in platform_settings
UPDATE public.platform_settings
SET value = '"50"'::jsonb
WHERE key = 'referral_reward_referrer';

-- Update apply_referral_code function to use 50 as fallback instead of 100
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
  SELECT COALESCE((value#>>'{}')::NUMERIC, 50) INTO v_referrer_reward
    FROM public.platform_settings WHERE key = 'referral_reward_referrer';
  SELECT COALESCE((value#>>'{}')::NUMERIC, 50) INTO v_referred_discount
    FROM public.platform_settings WHERE key = 'referral_reward_referred';

  IF v_referrer_reward IS NULL THEN v_referrer_reward := 50; END IF;
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
