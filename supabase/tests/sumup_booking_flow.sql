-- Run after migrations 003/004, inside the caller's transaction, then roll back.
do $$
declare
  target timestamp := date_trunc('hour',timezone('America/Guadeloupe',now())) + interval '1 hour';
  fixture jsonb := '{"firstName":"Audit","lastName":"SumUp","phone":"0000000000","email":"test@example.invalid","experience":"cafe_atelier","guideAccepted":true,"groupCeramicRatePerPerson":35,"groupMealRatePerPerson":20}'::jsonb;
  result jsonb; admin_id uuid;
begin
  assert private.kafe_booking_time_allowed('2026-09-10','10:30',0,'2026-09-10T14:00:00Z');
  assert not private.kafe_booking_time_allowed('2026-09-10','10:00',0,'2026-09-10T14:00:00Z');
  assert not private.kafe_booking_time_allowed('2026-09-10','12:30',3,'2026-09-10T14:00:00Z');
  assert private.kafe_booking_time_allowed('2026-09-10','13:00',3,'2026-09-10T14:00:00Z');
  update public.kafe_settings set value=value || jsonb_build_object(
    'reservationsEnabled',true,'minimumBookingLeadHours',0,'sumupPaymentsEnabled',true,
    'manualConfirmationThreshold',8,'depositThreshold',8,'depositFixedAmount',100,'slotIntervalMinutes',30,
    'seatingAreas','[{"id":"audit-sumup","label":"Table","capacity":12,"quantity":6,"zone":"interieur"}]'::jsonb,
    'scheduleRules',jsonb_build_array(jsonb_build_object('id','audit','weekdays','[0,1,2,3,4,5,6]'::jsonb,
      'validFrom','2020-01-01','validUntil','2099-12-31','startTime','00:00','endTime','23:30'))
  ) where id='main';
  perform public.create_kafe_reservation(fixture || '{"id":"audit-api-one","managementToken":"audit-api-token"}'::jsonb,target::date,to_char(target,'HH24:MI'),8);
  result := public.get_kafe_reservation_by_token('audit-api-token');
  assert not (result->>'paymentEnabled')::boolean;
  select user_id into admin_id from public.kafe_admin_profiles limit 1;
  perform set_config('request.jwt.claim.sub',admin_id::text,true);
  perform public.decide_kafe_group_reservation('audit-api-one',true);
  update public.kafe_reservations set created_at=now()-interval '1 day' where id='audit-api-one';
  perform private.expire_kafe_unpaid_reservations();
  assert (select status='pending' from public.kafe_reservations where id='audit-api-one'), 'No 35-minute payment timeout';
  result := public.get_kafe_reservation_by_token('audit-api-token');
  assert (result->>'paymentEnabled')::boolean and result->>'paymentMode'='sumup';
  insert into public.kafe_payments(reservation_id,provider_checkout_id,checkout_reference,amount,status,hosted_checkout_url)
    values('audit-api-one','audit-checkout','audit-ref',100,'PENDING','https://checkout.sumup.com/pay/audit-checkout');
  begin
    perform public.apply_kafe_deposit_payment('audit-api-one','audit-checkout','PAID');
    raise exception 'UNVERIFIED_PAYMENT_ACCEPTED';
  exception when others then if sqlerrm <> 'PAYMENT_MISMATCH' then raise; end if; end;
  update public.kafe_payments set status='PAID' where reservation_id='audit-api-one';
  result := public.apply_kafe_deposit_payment('audit-api-one','audit-checkout','PAID');
  assert result->>'status'='confirmed' and (result->>'changed')::boolean;
  result := public.apply_kafe_deposit_payment('audit-api-one','audit-checkout','PAID');
  assert not (result->>'changed')::boolean;
  result := public.get_kafe_reservation_by_token('audit-api-token');
  assert not (result->>'paymentEnabled')::boolean;

  perform public.create_kafe_reservation(fixture || '{"id":"audit-api-cancel","managementToken":"audit-api-cancel-token"}'::jsonb,target::date,to_char(target,'HH24:MI'),8);
  perform public.decide_kafe_group_reservation('audit-api-cancel',true);
  perform public.decide_kafe_group_reservation('audit-api-cancel',false,'Test');
  insert into public.kafe_payments(reservation_id,provider_checkout_id,checkout_reference,amount,status)
    values('audit-api-cancel','audit-cancel-checkout','audit-cancel-ref',100,'PAID');
  result := public.apply_kafe_deposit_payment('audit-api-cancel','audit-cancel-checkout','PAID');
  assert result->>'status'='cancelled' and (result#>>'{value,refundRequired}')::boolean;

  update public.kafe_settings set value=value || '{"minimumBookingLeadHours":3}'::jsonb where id='main';
  begin
    perform public.create_kafe_reservation(fixture || '{"id":"audit-too-close"}'::jsonb,target::date,to_char(target,'HH24:MI'),2);
    raise exception 'NOTICE_BYPASSED';
  exception when others then if sqlerrm <> 'KAFE_BOOKING_TOO_LATE' then raise; end if; end;
end $$;
