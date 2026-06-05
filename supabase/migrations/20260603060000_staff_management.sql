-- Remove auto-assignment functions
DROP FUNCTION IF EXISTS public.auto_assign_partner(UUID, TEXT, TIMESTAMP WITH TIME ZONE, UUID[]) CASCADE;
DROP FUNCTION IF EXISTS public.reassign_partner(UUID) CASCADE;

-- Create create_staff_user helper function
CREATE OR REPLACE FUNCTION public.create_staff_user(
  p_email TEXT,
  p_password TEXT,
  p_phone TEXT,
  p_full_name TEXT,
  p_city TEXT,
  p_service_tier TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_encrypted_pw TEXT;
BEGIN
  v_user_id := gen_random_uuid();
  v_encrypted_pw := extensions.crypt(p_password, extensions.gen_salt('bf'));

  -- Insert into auth.users
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    role,
    aud,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    created_at,
    updated_at,
    phone,
    phone_confirmed_at,
    confirmed_at,
    is_sso_user,
    is_anonymous
  ) VALUES (
    v_user_id,
    '00000000-0000-0000-0000-000000000000'::uuid,
    p_email,
    v_encrypted_pw,
    now(),
    'authenticated',
    'authenticated',
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    jsonb_build_object('role', 'partner', 'full_name', p_full_name),
    false,
    now(),
    now(),
    p_phone,
    now(),
    now(),
    false,
    false
  );

  -- Update profiles table
  UPDATE public.profiles
  SET 
    phone = p_phone,
    status = 'offline',
    city = p_city,
    service_tier = p_service_tier,
    kyc_status = 'approved',
    rating_avg = 5.0,
    rating_count = 0,
    jobs_offered_count = 0,
    jobs_accepted_count = 0,
    jobs_cancelled_count = 0,
    acceptance_rate = 1.0,
    cancellation_rate = 0.0,
    is_available = true
  WHERE id = v_user_id;

  RETURN v_user_id;
END;
$$;

-- Create update_staff_user helper function
CREATE OR REPLACE FUNCTION public.update_staff_user(
  p_id UUID,
  p_email TEXT,
  p_password TEXT,
  p_phone TEXT,
  p_full_name TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update auth.users
  UPDATE auth.users
  SET
    email = p_email,
    phone = p_phone,
    raw_user_meta_data = raw_user_meta_data || jsonb_build_object('full_name', p_full_name),
    updated_at = now()
  WHERE id = p_id;

  -- Update password if provided
  IF p_password IS NOT NULL AND p_password <> '' THEN
    UPDATE auth.users
    SET encrypted_password = extensions.crypt(p_password, extensions.gen_salt('bf'))
    WHERE id = p_id;
  END IF;

  -- Update profiles
  UPDATE public.profiles
  SET
    email = p_email,
    phone = p_phone,
    full_name = p_full_name,
    updated_at = now()
  WHERE id = p_id;
END;
$$;
