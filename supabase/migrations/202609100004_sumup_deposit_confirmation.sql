-- Approval comes before payment; an unapproved request has no payment deadline.
-- Keep the legacy caller compatible. No-show expiration is handled separately.
create or replace function private.expire_kafe_unpaid_reservations()
returns integer language sql security definer set search_path = '' as $$ select 0; $$;

create or replace function public.apply_kafe_deposit_payment(p_id text, p_checkout_id text, p_status text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare booking public.kafe_reservations%rowtype;
  payment public.kafe_payments%rowtype;
  next_status text; next_value jsonb;
begin
  select * into booking from public.kafe_reservations where id=p_id for update;
  if not found then return null; end if;
  select * into payment from public.kafe_payments where reservation_id=p_id and provider_checkout_id=p_checkout_id;
  if not found or payment.amount <> coalesce((booking.value->>'depositAmount')::numeric,100)
    or payment.currency <> 'EUR' or payment.status <> p_status then raise exception 'PAYMENT_MISMATCH'; end if;
  if coalesce((booking.value->>'depositPaid')::boolean,false) then
    return jsonb_build_object('changed',false,'status',booking.status,'value',booking.value);
  end if;
  if p_status='PAID' then
    next_status := case when booking.status in ('cancelled','confirmed','arrived') then booking.status
      when booking.status='pending' and nullif(booking.value->>'groupApprovedAt','') is not null then 'confirmed'
      else 'deposit_paid' end;
    next_value := booking.value || jsonb_build_object('depositPaid',true,'depositPaidAt',now(),
      'sumupCheckoutId',p_checkout_id,'status',next_status)
      || case when next_status='cancelled' then '{"refundRequired":true}'::jsonb else '{}'::jsonb end;
  elsif p_status='EXPIRED' and booking.status='pending' then
    next_status := 'cancelled';
    next_value := booking.value || jsonb_build_object('status','cancelled','cancelledAt',now(),'cancelledBy','payment_timeout');
  else return jsonb_build_object('changed',false,'status',booking.status,'value',booking.value);
  end if;
  update public.kafe_reservations set status=next_status,value=next_value,updated_at=now() where id=p_id;
  return jsonb_build_object('changed',true,'status',next_status,'value',next_value);
end $$;
revoke all on function public.apply_kafe_deposit_payment(text,text,text) from public,anon,authenticated;
grant execute on function public.apply_kafe_deposit_payment(text,text,text) to service_role;

create or replace function private.get_kafe_reservation_by_token(p_token text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare r public.kafe_reservations%rowtype; settings_value jsonb;
  notice_hours integer; reservation_at timestamptz; deadline_at timestamptz;
  safe_value jsonb; payment_url text := ''; eligible boolean; api_enabled boolean;
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
  return jsonb_build_object('reservation',safe_value || jsonb_build_object(
    'id',r.id,'date',r.date::text,'slot',r.slot,'people',r.people,'status',r.status),
    'canCancel',r.status not in ('cancelled','arrived') and now()<=deadline_at,
    'cancellationDeadline',deadline_at,'cancellationNoticeHours',notice_hours,
    'paymentEnabled',coalesce(eligible and (api_enabled or coalesce(payment_url,'')<>''),false),
    'paymentMode',case when api_enabled then 'sumup' else 'link' end,'paymentUrl',coalesce(payment_url,''));
end $$;
