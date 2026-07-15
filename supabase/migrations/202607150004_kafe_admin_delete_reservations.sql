drop policy if exists "Admins can delete reservations" on public.kafe_reservations;
create policy "Admins can delete reservations"
  on public.kafe_reservations for delete
  to authenticated
  using (public.is_kafe_admin());

grant delete on public.kafe_reservations to authenticated;
