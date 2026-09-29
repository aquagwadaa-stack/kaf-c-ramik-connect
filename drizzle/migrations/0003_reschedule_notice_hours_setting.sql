create or replace function private.get_kafe_reservation_by_token(p_token text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare r public.kafe_reservations%rowtype; settings_value jsonb;
  notice_hours integer; reservation_at timestamptz; deadline_at timestamptz;
  safe_value jsonb; payment_url text := ''; eligible boolean; api_enabled boolean;
  can_change boolean; reschedule_hours integer; reschedule_deadline timestamptz;
begin
  if coalesce(trim(p_token),'')='' then raise exception 'KAFE_INVALID_MANAGEMENT_TOKEN'; end if;
  select * into r from public.kafe_reservations where value->>'managementToken'=p_token limit 1;
  if not found then raise exception 'KAFE_RESERVATION_NOT_FOUND'; end if;
  select value into settings_value from public.kafe_settings where id='main';
  notice_hours := case when coalesce((r.value->>'depositRequired')::boolean,false)
    then coalesce((settings_value->>'groupDepositForfeitHours')::integer,24)
    else coalesce((settings_value->>'cancellationNoticeHours')::integer,48) end;
  reservation_at := (r.date + r.slot::time) at time zone 'America/Guadeloupe';
  deadline_at := reservation_at - make_interval(hours=>notice_hours);
  reschedule_hours := greatest(0, coalesce((settings_value->>'rescheduleNoticeHours')::integer,24));
  reschedule_deadline := reservation_at - make_interval(hours=>reschedule_hours);
  safe_value := r.value - array['managementToken','reservationCreatedEmailSentAt','adminAlertEmailSentAt',
    'cancellationEmailSentAt','adminCancellationAlertEmailSentAt','decisionEmailSentAt','reminderEmailSentAt',
    'paymentRequestEmailSentAt','depositReceiptEmailSentAt','adminPushSentAt','adminCancellationPushSentAt',
    'depositRecordedBy','decisionBy','notes','seatingUnitId','seatingAllocations'];
  eligible := r.status='pending' and nullif(r.value->>'groupApprovedAt','') is not null
    and coalesce((r.value->>'depositRequired')::boolean,false)
    and not coalesce((r.value->>'depositPaid')::boolean,false) and reservation_at > now();
  api_enabled := coalesce((settings_value->>'sumupPaymentsEnabled')::boolean,false);
  if eligible then
    if api_enabled then
      select hosted_checkout_url into payment_url from public.kafe_payments
        where reservation_id=r.id and status='PENDING'
        and hosted_checkout_url ~ '^https://checkout[.]sumup[.]com/pay/[A-Za-z0-9-]+$' limit 1;
    elsif coalesce(settings_value->>'depositPaymentLink','') ~ '^https://pay[.]sumup[.]com/b2c/[A-Za-z0-9]+$' then
      payment_url := settings_value->>'depositPaymentLink';
    end if;
  end if;
  can_change := r.status in ('pending','deposit_paid','confirmed')
    and not coalesce((r.value->>'isGroupRequest')::boolean,false)
    and now() <= reschedule_deadline;
  return jsonb_build_object('reservation',safe_value || jsonb_build_object(
    'id',r.id,'date',r.date::text,'slot',r.slot,'people',r.people,'status',r.status),
    'canCancel',r.status not in ('cancelled','arrived') and now()<=deadline_at,
    'canReschedule',can_change,
    'rescheduleNoticeHours',reschedule_hours,
    'cancellationDeadline',deadline_at,'cancellationNoticeHours',notice_hours,
    'paymentEnabled',coalesce(eligible and (api_enabled or coalesce(payment_url,'')<>''),false),
    'paymentMode',case when api_enabled then 'sumup' else 'link' end,'paymentUrl',coalesce(payment_url,''));
end $function$;