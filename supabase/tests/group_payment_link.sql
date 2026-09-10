begin;
-- Transaction-local fixtures only. No provider call, email, or persisted booking.
do $$
declare
  target date := current_date + 60 + ((2-extract(dow from current_date+60)::integer+7)%7);
  fixture jsonb := '{"firstName":"Audit","lastName":"Lien","phone":"0000000000","email":"test@example.invalid","experience":"cafe_atelier","guideAccepted":true,"groupCeramicRatePerPerson":35,"groupMealRatePerPerson":20,"groupApprovedAt":"forged","paymentRequestEmailSentAt":"forged","depositRecordedBy":"forged","managementToken":"audit-payment-link-token"}'::jsonb;
  v jsonb; once jsonb; admin_id uuid;
begin
  select user_id into admin_id from public.kafe_admin_profiles limit 1;
  assert admin_id is not null, 'An admin fixture context is required';
  update public.kafe_settings set value=value || jsonb_build_object(
    'reservationsEnabled',true,'slotIntervalMinutes',30,'slotDurationMinutes',180,
    'manualConfirmationThreshold',8,'depositThreshold',8,'depositFixedAmount',100,
    'seatingAreas','[{"id":"audit-link","label":"Table","capacity":12,"quantity":2,"zone":"interieur"}]'::jsonb
  ) where id='main';
  perform public.create_kafe_reservation(fixture || '{"id":"audit-payment-link"}'::jsonb,target,'10:00',8);
  select value into v from public.kafe_reservations where id='audit-payment-link';
  assert not (v ? 'groupApprovedAt' or v ? 'paymentRequestEmailSentAt' or v ? 'depositRecordedBy'), 'Spoofed fields must be removed';
  assert v->>'status'='pending', 'Group starts pending';
  v := public.get_kafe_reservation_by_token('audit-payment-link-token');
  assert not (v->>'paymentEnabled')::boolean, 'No link before acceptance';
  begin
    perform public.record_kafe_group_deposit('audit-payment-link');
    raise exception 'Anonymous payment marking allowed';
  exception when others then if sqlerrm <> 'KAFE_ADMIN_REQUIRED' then raise; end if; end;
  perform set_config('request.jwt.claim.sub',admin_id::text,true);
  begin
    perform public.record_kafe_group_deposit('audit-payment-link');
    raise exception 'Payment marking allowed before approval';
  exception when others then if sqlerrm <> 'KAFE_GROUP_NOT_APPROVED' then raise; end if; end;
  once := public.decide_kafe_group_reservation('audit-payment-link',true);
  assert once->>'status'='pending' and once ? 'groupApprovedAt' and not (once->>'depositPaid')::boolean, 'Approval is not confirmation';
  v := public.decide_kafe_group_reservation('audit-payment-link',true);
  assert v=once, 'Approval retry preserves the event';
  v := public.get_kafe_reservation_by_token('audit-payment-link-token');
  assert (v->>'paymentEnabled')::boolean and v->>'paymentUrl'='https://pay.sumup.com/b2c/Q0XPSRZ3', 'Approved customer gets the payment link';
  assert not (v->'reservation' ? 'seatingAllocations' or v->'reservation' ? 'decisionBy'), 'Portal excludes internal data';
  assert (select sum(people) from public.get_kafe_slot_occupancy(target,target) where reservation_id='audit-payment-link')=8, 'Pending deposit still occupies the seats';
  once := public.record_kafe_group_deposit('audit-payment-link');
  assert once->>'status'='confirmed' and (once->>'depositPaid')::boolean, 'Verified payment confirms the booking';
  v := public.record_kafe_group_deposit('audit-payment-link');
  assert v=once, 'Payment retry does not overwrite the audit time';
  v := public.get_kafe_reservation_by_token('audit-payment-link-token');
  assert not (v->>'paymentEnabled')::boolean and v->>'paymentUrl'='', 'Paid booking cannot pay again from portal';

  perform public.create_kafe_reservation(fixture || '{"id":"audit-payment-rejected","managementToken":"audit-rejected-token"}'::jsonb,target,'14:00',8);
  perform public.decide_kafe_group_reservation('audit-payment-rejected',true);
  perform public.decide_kafe_group_reservation('audit-payment-rejected',false,'Complet');
  begin
    perform public.decide_kafe_group_reservation('audit-payment-rejected',true);
    raise exception 'Cancelled booking reopened';
  exception when others then if sqlerrm <> 'KAFE_INVALID_RESERVATION_STATE' then raise; end if; end;
  begin
    perform public.record_kafe_group_deposit('audit-payment-rejected');
    raise exception 'Cancelled booking confirmed by payment';
  exception when others then if sqlerrm <> 'KAFE_INVALID_RESERVATION_STATE' then raise; end if; end;
  v := public.get_kafe_reservation_by_token('audit-rejected-token');
  assert not (v->>'paymentEnabled')::boolean, 'Cancelled booking has no payment action';
end;
$$;
set local role anon;
do $$ begin
  begin
    perform public.record_kafe_group_deposit('audit-payment-link');
    raise exception 'Public execute permission on payment verification';
  exception when insufficient_privilege then null; end;
end; $$;
reset role;
rollback;
