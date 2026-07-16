
-- Create private schema not exposed by PostgREST
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA private TO authenticated, anon, service_role;

-- Recreate SECURITY DEFINER helpers in private schema
CREATE OR REPLACE FUNCTION private.is_kafe_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  select exists (
    select 1 from public.kafe_admin_profiles p where p.user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION private.is_kafe_owner()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  select exists (
    select 1 from public.kafe_admin_profiles p
    where p.user_id = auth.uid() and p.role = 'owner'
  );
$$;

CREATE OR REPLACE FUNCTION private.get_current_kafe_admin()
RETURNS TABLE(email text, role text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  select p.email, p.role from public.kafe_admin_profiles p where p.user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION private.get_kafe_slot_capacity(from_date date, to_date date)
RETURNS TABLE(date text, slot text, reserved_people integer)
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  select r.date::text, r.slot, coalesce(sum(r.people),0)::int
  from public.kafe_reservations r
  where r.date between from_date and to_date and r.status <> 'cancelled'
  group by r.date, r.slot order by r.date, r.slot;
$$;

REVOKE ALL ON FUNCTION private.is_kafe_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION private.is_kafe_owner() FROM PUBLIC;
REVOKE ALL ON FUNCTION private.get_current_kafe_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION private.get_kafe_slot_capacity(date, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.is_kafe_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_kafe_owner() TO authenticated;
GRANT EXECUTE ON FUNCTION private.get_current_kafe_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION private.get_kafe_slot_capacity(date, date) TO anon, authenticated;

-- Repoint RLS policies to private functions
DROP POLICY IF EXISTS "Admins can read admin profiles" ON public.kafe_admin_profiles;
DROP POLICY IF EXISTS "Owners can manage admin profiles" ON public.kafe_admin_profiles;
CREATE POLICY "Admins can read admin profiles" ON public.kafe_admin_profiles
  FOR SELECT TO authenticated USING (private.is_kafe_admin());
CREATE POLICY "Owners can manage admin profiles" ON public.kafe_admin_profiles
  FOR ALL TO authenticated USING (private.is_kafe_owner()) WITH CHECK (private.is_kafe_owner());

DROP POLICY IF EXISTS "Admins can manage kafe settings" ON public.kafe_settings;
CREATE POLICY "Admins can manage kafe settings" ON public.kafe_settings
  FOR ALL TO authenticated USING (private.is_kafe_admin()) WITH CHECK (private.is_kafe_admin());

DROP POLICY IF EXISTS "Admins can manage ceramic objects" ON public.kafe_ceramic_objects;
CREATE POLICY "Admins can manage ceramic objects" ON public.kafe_ceramic_objects
  FOR ALL TO authenticated USING (private.is_kafe_admin()) WITH CHECK (private.is_kafe_admin());

DROP POLICY IF EXISTS "Admins can manage documents" ON public.kafe_content_documents;
CREATE POLICY "Admins can manage documents" ON public.kafe_content_documents
  FOR ALL TO authenticated USING (private.is_kafe_admin()) WITH CHECK (private.is_kafe_admin());

DROP POLICY IF EXISTS "Admins can read reservations" ON public.kafe_reservations;
DROP POLICY IF EXISTS "Admins can update reservations" ON public.kafe_reservations;
DROP POLICY IF EXISTS "Admins can delete reservations" ON public.kafe_reservations;
CREATE POLICY "Admins can read reservations" ON public.kafe_reservations
  FOR SELECT TO authenticated USING (private.is_kafe_admin());
CREATE POLICY "Admins can update reservations" ON public.kafe_reservations
  FOR UPDATE TO authenticated USING (private.is_kafe_admin()) WITH CHECK (private.is_kafe_admin());
CREATE POLICY "Admins can delete reservations" ON public.kafe_reservations
  FOR DELETE TO authenticated USING (private.is_kafe_admin());

DROP POLICY IF EXISTS "Admins can manage waiver signatures" ON public.kafe_waiver_signatures;
CREATE POLICY "Admins can manage waiver signatures" ON public.kafe_waiver_signatures
  FOR ALL TO authenticated USING (private.is_kafe_admin()) WITH CHECK (private.is_kafe_admin());

-- Replace public SECURITY DEFINER functions with SECURITY INVOKER wrappers
-- so the client-facing RPC surface remains identical (get_current_kafe_admin, get_kafe_slot_capacity).
DROP FUNCTION IF EXISTS public.is_kafe_admin();
DROP FUNCTION IF EXISTS public.is_kafe_owner();
DROP FUNCTION IF EXISTS public.get_current_kafe_admin();
DROP FUNCTION IF EXISTS public.get_kafe_slot_capacity(date, date);

CREATE OR REPLACE FUNCTION public.get_current_kafe_admin()
RETURNS TABLE(email text, role text)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public
AS $$ select * from private.get_current_kafe_admin(); $$;

CREATE OR REPLACE FUNCTION public.get_kafe_slot_capacity(from_date date, to_date date)
RETURNS TABLE(date text, slot text, reserved_people integer)
LANGUAGE sql SECURITY INVOKER SET search_path = public
AS $$ select * from private.get_kafe_slot_capacity(from_date, to_date); $$;

REVOKE ALL ON FUNCTION public.get_current_kafe_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_kafe_slot_capacity(date, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_current_kafe_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_kafe_slot_capacity(date, date) TO anon, authenticated;
