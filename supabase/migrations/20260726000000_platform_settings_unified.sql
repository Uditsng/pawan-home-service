-- ═══════════════════════════════════════════════════════════════
-- Platform Settings Unified Migration (Commission, GST, Referral)
-- Created: 2026-07-26
-- ═══════════════════════════════════════════════════════════════

-- Ensure platform_settings table exists
CREATE TABLE IF NOT EXISTS public.platform_settings (
  key   TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed dynamic platform setting keys if missing
INSERT INTO public.platform_settings (key, value)
VALUES
  ('platform_commission',       '"20"'::jsonb),
  ('tax_rate',                  '"18"'::jsonb),
  ('gst_enabled',               'true'::jsonb),
  ('referral_enabled',          'true'::jsonb),
  ('referral_reward_referrer',  '"50"'::jsonb),
  ('referral_reward_referred',  '"50"'::jsonb),
  ('free_cancellation_window',  '"2 Hours"'::jsonb),
  ('partner_penalty_rate',      '"10%"'::jsonb),
  ('service_areas',             '["Roorkee", "Chandigarh", "Dehradun", "Haridwar"]'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- RLS for platform_settings
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view platform settings" ON public.platform_settings;
CREATE POLICY "Public can view platform settings" ON public.platform_settings
  FOR SELECT TO authenticated, anon USING (true);

DROP POLICY IF EXISTS "Admins can manage platform settings" ON public.platform_settings;
CREATE POLICY "Admins can manage platform settings" ON public.platform_settings
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Update RPC apply_referral_code to check referral_enabled
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
  v_referral_enabled BOOLEAN;
BEGIN
  -- Check if referral system is globally enabled
  SELECT COALESCE((value#>>'{}')::BOOLEAN, true) INTO v_referral_enabled
    FROM public.platform_settings WHERE key = 'referral_enabled';

  IF v_referral_enabled IS FALSE THEN
    RETURN jsonb_build_object('success', false, 'error', 'Referral program is currently disabled by administrator.');
  END IF;

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

  -- Already been referred?
  IF EXISTS (SELECT 1 FROM public.referrals WHERE referred_id = p_new_user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Referral already applied to this account.');
  END IF;

  -- Fetch dynamic reward amounts from platform_settings (default 50-50)
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
