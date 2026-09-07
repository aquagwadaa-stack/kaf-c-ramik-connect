-- Merge delivery metadata atomically; never overwrite a concurrent booking decision.
create or replace function public.mark_kafe_reservation_email(p_id text, p_patch jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  safe_patch jsonb;
  result jsonb;
begin
  select coalesce(jsonb_object_agg(key,value),'{}'::jsonb) into safe_patch
  from jsonb_each(p_patch)
  where key = any(array[
    'reservationCreatedEmailSentAt','adminAlertEmailSentAt','adminPushSentAt',
    'cancellationEmailSentAt','adminCancellationAlertEmailSentAt',
    'adminCancellationPushSentAt','decisionEmailSentAt','reminderEmailSentAt',
    'groupQuoteNumber','groupQuoteTotal'
  ]);
  update public.kafe_reservations
  set value = value || safe_patch, updated_at = now()
  where id = p_id returning value into result;
  return result;
end;
$$;
revoke all on function public.mark_kafe_reservation_email(text,jsonb) from public, anon, authenticated;
grant execute on function public.mark_kafe_reservation_email(text,jsonb) to service_role;
