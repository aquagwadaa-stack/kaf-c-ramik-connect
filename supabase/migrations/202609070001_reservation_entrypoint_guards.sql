-- Public callers cannot impersonate the separate, authenticated walk-in flow.
create or replace function public.create_kafe_reservation(
  p_value jsonb, p_date date, p_slot text, p_people integer
)
returns table(id text, seating_unit_id text)
language plpgsql
set search_path to 'public'
as $$
begin
  if p_people is null or p_people < 1 or p_people > 10 then
    raise exception 'KAFE_INVALID_GROUP_SIZE';
  end if;
  if p_date is null or p_slot is null then
    raise exception 'KAFE_INVALID_SLOT';
  end if;
  if p_value is null or jsonb_typeof(p_value) <> 'object'
    or coalesce(p_value->>'experience', '') not in ('atelier','cafe_atelier','brunch_atelier','groupe')
  then raise exception 'KAFE_REQUIRED_INFORMATION_MISSING'; end if;

  p_value := (p_value - array[
    'depositPaidAt','sumupCheckoutId','decisionAt','decisionBy','decisionMessage',
    'reservationCreatedEmailSentAt','adminAlertEmailSentAt','reminderEmailSentAt',
    'adminPushSentAt','cancellationEmailSentAt','adminCancellationAlertEmailSentAt',
    'adminCancellationPushSentAt','decisionEmailSentAt'
  ]) || jsonb_build_object('source','online','createdAt',now(),'depositPaid',false);
  return query select * from private.create_kafe_reservation(p_value,p_date,p_slot,p_people);
end;
$$;

-- The UI calls this before refreshing the team planning.
create or replace function public.expire_kafe_no_shows()
returns integer
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if not private.is_kafe_admin() then raise exception 'KAFE_ADMIN_REQUIRED'; end if;
  return private.expire_kafe_no_shows();
end;
$$;
revoke all on function public.expire_kafe_no_shows() from public, anon;
grant execute on function public.expire_kafe_no_shows() to authenticated;
