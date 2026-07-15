
-- Lock down SECURITY DEFINER function EXECUTE privileges
REVOKE ALL ON FUNCTION public.is_kafe_admin() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_kafe_owner() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_current_kafe_admin() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_kafe_slot_capacity(date, date) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.is_kafe_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_kafe_owner() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_current_kafe_admin() TO authenticated;
-- Slot capacity aggregate is intentionally public (reservation form on public page)
GRANT EXECUTE ON FUNCTION public.get_kafe_slot_capacity(date, date) TO anon, authenticated;

-- Tighten overly-permissive INSERT policy on kafe_reservations
DROP POLICY IF EXISTS "Public can create reservations" ON public.kafe_reservations;

CREATE POLICY "Public can create reservations"
ON public.kafe_reservations
FOR INSERT
TO anon, authenticated
WITH CHECK (
  people > 0
  AND people <= 50
  AND date >= current_date
  AND status = 'pending'
);
