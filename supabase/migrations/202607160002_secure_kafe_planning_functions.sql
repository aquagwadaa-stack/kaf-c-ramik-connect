revoke all on function public.expire_kafe_no_shows() from public, anon;
grant execute on function public.expire_kafe_no_shows() to authenticated;

revoke all on function public.mark_kafe_reservation_arrived() from public, anon, authenticated;
