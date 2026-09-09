begin;
update public.kafe_settings set value = value || '{"reservationsEnabled":true,"slotDurationMinutes":180,"depositThreshold":8,"manualConfirmationThreshold":8,"depositFixedAmount":100}'::jsonb where id='main';
do $$
declare
  v jsonb;
  fixture jsonb := '{"firstName":"Audit","lastName":"Meeting","phone":"0000000000","email":"test@example.invalid","experience":"cafe_atelier","guideAccepted":true,"depositPaid":true,"depositReceiptEmailSentAt":"forged","groupCeramicRatePerPerson":35,"groupMealRatePerPerson":20}'::jsonb;
begin
  perform public.create_kafe_reservation(fixture || '{"id":"audit-meeting-eight"}'::jsonb,'2026-10-15','09:30',8);
  select value into v from public.kafe_reservations where id='audit-meeting-eight';
  assert v->>'status' = 'pending', 'Eight people must await approval';
  assert (v->>'depositRequired')::boolean, 'Eight people must pay a deposit';
  assert (v->>'depositAmount')::numeric = 100, 'Fixed deposit is 100';
  assert not (v->>'depositPaid')::boolean, 'Client cannot forge payment';
  assert not (v ? 'depositReceiptEmailSentAt'), 'Client cannot suppress receipt';

  perform public.create_kafe_reservation(fixture || '{"id":"audit-meeting-seven"}'::jsonb,'2026-10-15','13:30',7);
  select value into v from public.kafe_reservations where id='audit-meeting-seven';
  assert v->>'status' = 'confirmed', 'Seven people are automatic';
  assert not (v->>'depositRequired')::boolean, 'Seven people have no deposit';

  perform public.create_kafe_reservation(fixture || '{"id":"audit-meeting-ten"}'::jsonb,'2026-10-15','09:30',10);
  begin
    perform public.create_kafe_reservation(fixture || '{"id":"audit-meeting-eleven"}'::jsonb,'2026-10-15','09:30',11);
    raise exception 'Eleven people unexpectedly accepted';
  exception when others then
    if sqlerrm <> 'KAFE_INVALID_GROUP_SIZE' then raise; end if;
  end;
  perform public.create_kafe_reservation(fixture || '{"id":"audit-meeting-brunch","experience":"brunch_atelier","guideAccepted":false}'::jsonb,'2026-10-15','09:30',8);
  select value into v from public.kafe_reservations where id='audit-meeting-brunch';
  assert v->>'status' = 'confirmed' and not (v->>'depositRequired')::boolean, 'Brunch stays without deposit';

  update public.kafe_settings set value = value || '{"seatingAreas":[{"id":"audit-unit","label":"Table","capacity":2,"quantity":1,"zone":"interieur"}]}'::jsonb where id='main';
  perform public.create_kafe_reservation(fixture || '{"id":"audit-meeting-start"}'::jsonb,'2026-10-16','09:30',2);
  begin
    perform public.create_kafe_reservation(fixture || '{"id":"audit-meeting-overlap"}'::jsonb,'2026-10-16','11:30',2);
    raise exception 'Table unexpectedly released before three hours';
  exception when others then
    if sqlerrm <> 'KAFE_SLOT_FULL' then raise; end if;
  end;
  perform public.create_kafe_reservation(fixture || '{"id":"audit-meeting-after"}'::jsonb,'2026-10-16','12:30',2);
end;
$$;
rollback;
