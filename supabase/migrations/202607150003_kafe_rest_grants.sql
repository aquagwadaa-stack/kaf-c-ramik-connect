grant usage on schema public to anon, authenticated;

grant select on public.kafe_settings to anon, authenticated;
grant select on public.kafe_ceramic_objects to anon, authenticated;
grant select on public.kafe_content_documents to anon, authenticated;

drop policy if exists "Public can create reservations" on public.kafe_reservations;
create policy "Public can create reservations"
  on public.kafe_reservations for insert
  to public
  with check (true);

grant insert on public.kafe_reservations to public;
grant select, update on public.kafe_reservations to authenticated;

grant select, insert, update, delete on public.kafe_settings to authenticated;
grant select, insert, update, delete on public.kafe_ceramic_objects to authenticated;
grant select, insert, update, delete on public.kafe_content_documents to authenticated;
grant select, insert, update, delete on public.kafe_waiver_signatures to authenticated;
grant select, insert, update, delete on public.kafe_admin_profiles to authenticated;

grant execute on function public.get_kafe_slot_capacity(date, date) to anon, authenticated;
grant execute on function public.is_kafe_admin() to authenticated;
grant execute on function public.get_current_kafe_admin() to authenticated;
grant execute on function public.is_kafe_owner() to authenticated;
