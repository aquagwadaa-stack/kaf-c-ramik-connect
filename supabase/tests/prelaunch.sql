-- Run inside BEGIN / ROLLBACK after all 20260907 migrations.
-- All bookings here are disposable transaction-local fixtures; no email call.
do $$
declare
  target date := current_date + 14 + ((2 - extract(dow from current_date)::integer + 7) % 7);
  input jsonb := jsonb_build_object('id','audit-prelaunch','firstName','Audit','lastName','Technique',
    'phone','0000000000','email','audit@example.invalid','experience','cafe_atelier',
    'guideAccepted',true,'source','walk_in','createdAt','2000-01-01T00:00:00Z',
    'adminAlertEmailSentAt','forged');
  result record;
  saved jsonb;
begin
  update kafe_settings set value = value || '{"reservationsEnabled":false}'::jsonb where id='main';
  begin
    perform public.create_kafe_reservation(input,target,'09:30',2);
    raise exception 'ASSERT: spoofed walk-in bypassed pause';
  exception when others then
    if sqlerrm <> 'KAFE_RESERVATIONS_PAUSED' then raise; end if;
  end;
  begin
    perform public.create_kafe_reservation(input,target,'09:30',11);
    raise exception 'ASSERT: eleven people booked online';
  exception when others then
    if sqlerrm <> 'KAFE_INVALID_GROUP_SIZE' then raise; end if;
  end;
  update kafe_settings set value=value || '{"reservationsEnabled":true}'::jsonb where id='main';
  select * into result from public.create_kafe_reservation(input,target,'09:30',2);
  select value into saved from kafe_reservations where id=result.id;
  if saved->>'source' <> 'online' or saved ? 'adminAlertEmailSentAt'
    or (saved->>'createdAt')::timestamptz < now() - interval '1 minute'
    or (saved->>'depositPaid')::boolean
    or saved->>'status' <> 'confirmed'
  then raise exception 'ASSERT: server-controlled data not normalized'; end if;
  if (select coalesce(sum(people),0) from public.get_kafe_slot_occupancy(target,target)
      where reservation_id=result.id) <> 2 then
    raise exception 'ASSERT: reservation is absent from occupancy';
  end if;
end;
$$;

set local role anon;
do $$
begin
  if exists(select 1 from kafe_reservations)
    or exists(select 1 from kafe_waiver_signatures)
    or exists(select 1 from kafe_admin_profiles)
  then raise exception 'ASSERT: anonymous visitor can read private records'; end if;
  begin
    perform public.expire_kafe_no_shows();
    raise exception 'ASSERT: anonymous visitor can call team-only RPC';
  exception when insufficient_privilege then null;
  end;
end;
$$;
reset role;

do $$
declare
  state text;
  result jsonb;
begin
  update kafe_reservations set status='cancelled',value=value||'{"status":"cancelled"}'::jsonb where id='audit-prelaunch';
  perform public.mark_kafe_reservation_email('audit-prelaunch','{"status":"confirmed","reminderEmailSentAt":"2026-09-07T00:00:00Z"}'::jsonb);
  if not exists(select 1 from kafe_reservations where id='audit-prelaunch' and status='cancelled' and value->>'status'='cancelled' and value ? 'reminderEmailSentAt') then
    raise exception 'ASSERT: metadata overwrote cancellation';
  end if;
  foreach state in array array['pending','cancelled','confirmed','arrived'] loop
    update kafe_reservations set status=state,value=value||jsonb_build_object('status',state,'depositPaid',false) where id='audit-prelaunch';
    result := public.apply_kafe_deposit_payment('audit-prelaunch','test-only-checkout','PAID');
    if result->>'status' <> (case when state='pending' then 'deposit_paid' else state end) then
      raise exception 'ASSERT: payment overwrote %', state;
    end if;
    result := public.apply_kafe_deposit_payment('audit-prelaunch','test-only-checkout','PAID');
    if (result->>'changed')::boolean then raise exception 'ASSERT: replay changed booking twice'; end if;
    result := public.apply_kafe_deposit_payment('audit-prelaunch','test-only-checkout','EXPIRED');
    if (result->>'changed')::boolean then raise exception 'ASSERT: expiry cancelled paid booking'; end if;
  end loop;
end $$;
set local role authenticated;
do $$ begin
  begin perform public.mark_kafe_reservation_email('audit-prelaunch','{}'); raise exception 'ASSERT: email RPC exposed'; exception when insufficient_privilege then null; end;
  begin perform public.apply_kafe_deposit_payment('audit-prelaunch','test','PAID'); raise exception 'ASSERT: payment RPC exposed'; exception when insufficient_privilege then null; end;
end $$;
reset role;
