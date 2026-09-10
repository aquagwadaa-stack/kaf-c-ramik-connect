-- Approval first, then a reusable SumUp link and manual payment verification.
-- Do not change opening hours, slot cadence, or existing reservations.
update public.kafe_settings
set value = value || '{"depositPaymentLink":"https://pay.sumup.com/b2c/Q0XPSRZ3"}'::jsonb,
    updated_at = now()
where id = 'main';

create or replace function private.decide_kafe_group_reservation(p_id text, p_approved boolean, p_message text default null)
returns jsonb language plpgsql security definer set search_path to 'public'
as $$
declare r public.kafe_reservations%rowtype; next_status text; next_value jsonb;
begin
  if not private.is_kafe_admin() then raise exception 'KAFE_ADMIN_REQUIRED'; end if;
  if p_approved is null then raise exception 'KAFE_INVALID_DECISION'; end if;
  select * into r from public.kafe_reservations where id=p_id for update;
  if not found then raise exception 'KAFE_RESERVATION_NOT_FOUND'; end if;
  if not coalesce((r.value->>'isGroupRequest')::boolean,false) then raise exception 'KAFE_NOT_A_GROUP'; end if;
  -- Retrying the same action is harmless, including after a lost response.
  if (p_approved and r.status='confirmed' and r.value ? 'groupApprovedAt')
    or (not p_approved and r.status='cancelled') then return r.value; end if;
  if r.status not in ('pending','deposit_paid') then raise exception 'KAFE_INVALID_RESERVATION_STATE'; end if;
  if p_approved and (r.date::text || ' ' || r.slot)::timestamp at time zone 'America/Guadeloupe' <= now()
    then raise exception 'KAFE_RESERVATION_PAST'; end if;
  next_status := case when not p_approved then 'cancelled'
    when coalesce((r.value->>'depositPaid')::boolean,false) then 'confirmed' else 'pending' end;
  next_value := r.value || jsonb_build_object(
    'status',next_status,
    'decisionMessage',case when p_approved then '' else coalesce(trim(p_message),'') end,
    'decisionAt',coalesce(r.value->>'decisionAt',now()::text),'decisionBy',auth.uid()
  );
  if p_approved then
    next_value := next_value || jsonb_build_object('groupApprovedAt',coalesce(r.value->>'groupApprovedAt',now()::text));
  end if;
  update public.kafe_reservations set status=next_status,value=next_value,updated_at=now() where id=p_id;
  return next_value;
end;
$$;

create or replace function public.record_kafe_group_deposit(p_id text)
returns jsonb language plpgsql security definer set search_path to 'public'
as $$
declare r public.kafe_reservations%rowtype; next_value jsonb;
begin
  if not private.is_kafe_admin() then raise exception 'KAFE_ADMIN_REQUIRED'; end if;
  select * into r from public.kafe_reservations where id=p_id for update;
  if not found then raise exception 'KAFE_RESERVATION_NOT_FOUND'; end if;
  if not coalesce((r.value->>'isGroupRequest')::boolean,false)
    or not coalesce((r.value->>'depositRequired')::boolean,false)
    or nullif(r.value->>'groupApprovedAt','') is null then raise exception 'KAFE_GROUP_NOT_APPROVED'; end if;
  if r.status='confirmed' and coalesce((r.value->>'depositPaid')::boolean,false) then return r.value; end if;
  if r.status not in ('pending','deposit_paid') then raise exception 'KAFE_INVALID_RESERVATION_STATE'; end if;
  next_value := r.value || jsonb_build_object('status','confirmed','depositPaid',true,
    'depositPaidAt',coalesce(r.value->>'depositPaidAt',now()::text),'depositRecordedBy',auth.uid());
  update public.kafe_reservations set status='confirmed',value=next_value,updated_at=now() where id=p_id;
  return next_value;
end;
$$;
revoke all on function public.record_kafe_group_deposit(text) from public,anon;
grant execute on function public.record_kafe_group_deposit(text) to authenticated;

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
    'depositReceiptEmailSentAt','paymentRequestEmailSentAt','groupQuoteNumber','groupQuoteTotal'
  ]);
  update public.kafe_reservations set value = value || safe_patch, updated_at = now()
  where id = p_id returning value into result;
  return result;
end;
$$;
revoke all on function public.mark_kafe_reservation_email(text,jsonb) from public,anon,authenticated;
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
    'groupApprovedAt','paymentRequestEmailSentAt','depositRecordedBy',
    'reservationCreatedEmailSentAt','adminAlertEmailSentAt','reminderEmailSentAt',
    'adminPushSentAt','cancellationEmailSentAt','adminCancellationAlertEmailSentAt',
    'adminCancellationPushSentAt','decisionEmailSentAt','depositReceiptEmailSentAt'
  ]) || jsonb_build_object('source','online','createdAt',now(),'depositPaid',false);
  return query select * from private.create_kafe_reservation(p_value,p_date,p_slot,p_people);
end;
$$;

create or replace function private.get_kafe_reservation_by_token(p_token text)
returns jsonb language plpgsql security definer set search_path to 'public'
as $$
declare
  r public.kafe_reservations%rowtype; settings_value jsonb;
  notice_hours integer; reservation_at timestamptz; deadline_at timestamptz;
  safe_value jsonb; payment_url text := '';
begin
  if coalesce(trim(p_token),'')='' then raise exception 'KAFE_INVALID_MANAGEMENT_TOKEN'; end if;
  select * into r from public.kafe_reservations where value->>'managementToken'=p_token limit 1;
  if not found then raise exception 'KAFE_RESERVATION_NOT_FOUND'; end if;
  select value into settings_value from public.kafe_settings where id='main';
  notice_hours := case when coalesce((r.value->>'depositRequired')::boolean,false)
    then coalesce((settings_value->>'groupDepositForfeitHours')::integer,24)
    else coalesce((settings_value->>'cancellationNoticeHours')::integer,48) end;
  reservation_at := (r.date::text || ' ' || r.slot)::timestamp at time zone 'America/Guadeloupe';
  deadline_at := reservation_at - make_interval(hours=>notice_hours);
  safe_value := r.value - array['managementToken','reservationCreatedEmailSentAt','adminAlertEmailSentAt',
    'cancellationEmailSentAt','adminCancellationAlertEmailSentAt','decisionEmailSentAt','reminderEmailSentAt',
    'paymentRequestEmailSentAt','depositReceiptEmailSentAt','adminPushSentAt','adminCancellationPushSentAt',
    'depositRecordedBy','decisionBy','notes','seatingUnitId','seatingAllocations'];
  if r.status='pending' and r.value ? 'groupApprovedAt'
    and coalesce((r.value->>'depositRequired')::boolean,false)
    and not coalesce((r.value->>'depositPaid')::boolean,false) and reservation_at > now()
    and coalesce(settings_value->>'depositPaymentLink','') ~ '^https://pay[.]sumup[.]com/b2c/[A-Za-z0-9]+$'
  then payment_url := settings_value->>'depositPaymentLink'; end if;
  return jsonb_build_object('reservation',safe_value || jsonb_build_object(
    'id',r.id,'date',r.date::text,'slot',r.slot,'people',r.people,'status',r.status),
    'canCancel',r.status not in ('cancelled','arrived') and now()<=deadline_at,
    'cancellationDeadline',deadline_at,'cancellationNoticeHours',notice_hours,
    'paymentEnabled',payment_url <> '', 'paymentUrl',payment_url);
end;
$$;
