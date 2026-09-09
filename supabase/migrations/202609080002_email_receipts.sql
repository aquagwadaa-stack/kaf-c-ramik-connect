create or replace function public.mark_kafe_reservation_email(p_id text, p_patch jsonb)
returns jsonb language plpgsql security definer set search_path to 'public'
as $$
declare safe_patch jsonb; result jsonb;
begin
  select coalesce(jsonb_object_agg(key,value),'{}'::jsonb) into safe_patch
  from jsonb_each(p_patch)
  where key = any(array[
    'reservationCreatedEmailSentAt','adminAlertEmailSentAt','adminPushSentAt',
    'cancellationEmailSentAt','adminCancellationAlertEmailSentAt',
    'adminCancellationPushSentAt','decisionEmailSentAt','reminderEmailSentAt',
    'depositReceiptEmailSentAt','groupQuoteNumber','groupQuoteTotal'
  ]);
  update public.kafe_reservations set value = value || safe_patch, updated_at = now()
  where id = p_id returning value into result;
  return result;
end;
$$;
revoke all on function public.mark_kafe_reservation_email(text,jsonb) from public, anon, authenticated;
grant execute on function public.mark_kafe_reservation_email(text,jsonb) to service_role;

create or replace function public.create_kafe_reservation(p_value jsonb, p_date date, p_slot text, p_people integer)
returns table(id text, seating_unit_id text) language plpgsql set search_path to 'public'
as $$
begin
  if p_people is null or p_people < 1 or p_people > 10 then raise exception 'KAFE_INVALID_GROUP_SIZE'; end if;
  if p_date is null or p_slot is null then raise exception 'KAFE_INVALID_SLOT'; end if;
  if p_value is null or jsonb_typeof(p_value) <> 'object'
    or coalesce(p_value->>'experience','') not in ('atelier','cafe_atelier','brunch_atelier','groupe')
  then raise exception 'KAFE_REQUIRED_INFORMATION_MISSING'; end if;
  p_value := (p_value - array[
    'depositPaidAt','sumupCheckoutId','decisionAt','decisionBy','decisionMessage',
    'reservationCreatedEmailSentAt','adminAlertEmailSentAt','reminderEmailSentAt',
    'adminPushSentAt','cancellationEmailSentAt','adminCancellationAlertEmailSentAt',
    'adminCancellationPushSentAt','decisionEmailSentAt','depositReceiptEmailSentAt'
  ]) || jsonb_build_object('source','online','createdAt',now(),'depositPaid',false);
  return query select * from private.create_kafe_reservation(p_value,p_date,p_slot,p_people);
end;
$$;
