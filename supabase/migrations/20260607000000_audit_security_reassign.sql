-- ═══════════════════════════════════════════════════════════════
-- Audit Security & Reassignment Remediation Migration
-- Created: 2026-06-07
-- ═══════════════════════════════════════════════════════════════

-- 1. Profile Role & Status Escalation Prevention Trigger
CREATE OR REPLACE FUNCTION public.check_profile_immutable_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- If trying to change role or status, verify if the session user is an admin
  -- Also allow changes if auth.uid() is NULL (e.g. direct updates in the database/SQL editor)
  IF (OLD.role IS DISTINCT FROM NEW.role OR OLD.status IS DISTINCT FROM NEW.status)
     AND auth.uid() IS NOT NULL
     AND NOT public.is_admin(auth.uid()) THEN
     
    -- Block role changes entirely for non-admins
    IF OLD.role IS DISTINCT FROM NEW.role THEN
      RAISE EXCEPTION 'Unauthorized: You cannot modify the profile role.';
    END IF;
    
    -- Restrict status changes for non-admins
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      -- Allow operational status changes (active, offline, busy, pending)
      -- But block changing to or from 'suspended' or 'blocked'
      IF NEW.status IN ('suspended', 'blocked') OR OLD.status IN ('suspended', 'blocked') THEN
        RAISE EXCEPTION 'Unauthorized: You cannot suspend, unsuspend, or block profiles.';
      END IF;
      
      -- Verify user is updating their own profile
      IF auth.uid() IS DISTINCT FROM OLD.id THEN
        RAISE EXCEPTION 'Unauthorized: You cannot modify another user''s status.';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_profiles_immutable_fields ON public.profiles;
CREATE TRIGGER tr_profiles_immutable_fields
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.check_profile_immutable_fields();

-- 2. Restrict check_rate_limit execution to service_role only
REVOKE EXECUTE ON FUNCTION public.check_rate_limit(text, integer, integer) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(text, integer, integer) TO service_role;

-- 3. Restore the reassign_partner RPC
CREATE OR REPLACE FUNCTION public.reassign_partner(p_booking_id UUID)
RETURNS UUID
SECURITY DEFINER
LANGUAGE plpgsql AS $$
DECLARE
  v_service_id UUID;
  v_pincode TEXT;
  v_selected_partner_id UUID;
BEGIN
  -- Get the booking's service_id and pincode
  SELECT service_id, pincode INTO v_service_id, v_pincode
  FROM public.bookings
  WHERE id = p_booking_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- Find the eligible partner using Round-Robin (oldest last_assigned_at)
  SELECT p.id INTO v_selected_partner_id
  FROM public.profiles p
  JOIN public.partner_services ps ON ps.partner_id = p.id
  JOIN public.partner_service_areas psa ON psa.partner_id = p.id
  WHERE p.role = 'partner'
    AND p.status = 'active'
    AND p.is_available = true
    AND ps.service_id = v_service_id
    AND psa.pincode = v_pincode
    -- Exclude partners who have already rejected this booking
    AND p.id NOT IN (
      SELECT partner_id 
      FROM public.booking_rejections 
      WHERE booking_id = p_booking_id
    )
  ORDER BY p.last_assigned_at ASC NULLS FIRST
  LIMIT 1;

  -- If partner found, perform the assignment
  IF v_selected_partner_id IS NOT NULL THEN
    UPDATE public.bookings
    SET partner_id = v_selected_partner_id,
        status = 'confirmed'
    WHERE id = p_booking_id;

    UPDATE public.profiles
    SET last_assigned_at = NOW()
    WHERE id = v_selected_partner_id;
  END IF;

  RETURN v_selected_partner_id;
END;
$$;

-- 4. Strengthen Bookings INSERT policy
DROP POLICY IF EXISTS "Customers can insert their own bookings" ON public.bookings;
CREATE POLICY "Customers can insert their own bookings" ON public.bookings
  FOR INSERT TO authenticated
  WITH CHECK (
    customer_id = auth.uid() 
    AND status = 'pending' 
    AND total_amount > 0
  );

-- 5. Strengthen Reviews INSERT policy
DROP POLICY IF EXISTS "Customers can insert reviews for bookings" ON public.reviews;
CREATE POLICY "Customers can insert reviews for bookings" ON public.reviews
  FOR INSERT TO authenticated
  WITH CHECK (
    customer_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_id 
        AND b.customer_id = auth.uid() 
        AND b.status = 'completed'
    )
  );
