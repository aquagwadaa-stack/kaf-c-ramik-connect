create or replace function private.get_kafe_reservation_by_token(p_token text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare r public.kafe_reservations%rowtype; settings_value jsonb;
  notice_hours integer; reservation_at timestamptz; deadline_at timestamptz;
  safe_value jsonb; payment_url text := ''; eligible boolean; api_enabled boolean;
  can_change boolean;
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
  can_change := r.status in ('pending','deposit_paid','confirmed')
    and not coalesce((r.value->>'isGroupRequest')::boolean,false)
    and now() <= deadline_at;
  return jsonb_build_object('reservation',safe_value || jsonb_build_object(
    'id',r.id,'date',r.date::text,'slot',r.slot,'people',r.people,'status',r.status),
    'canCancel',r.status not in ('cancelled','arrived') and now()<=deadline_at,
    'canReschedule',can_change,
    'rescheduleNoticeHours',notice_hours,
    'cancellationDeadline',deadline_at,'cancellationNoticeHours',notice_hours,
    'paymentEnabled',coalesce(eligible and (api_enabled or coalesce(payment_url,'')<>''),false),
    'paymentMode',case when api_enabled then 'sumup' else 'link' end,'paymentUrl',coalesce(payment_url,''));
end $function$;

create or replace function private.reschedule_kafe_reservation_by_token(
  p_token text, p_date date, p_slot text, p_people integer
)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  booking public.kafe_reservations%rowtype;
  settings_value jsonb;
  portal jsonb;
  duration_minutes integer;
  interval_minutes integer;
  deposit_threshold integer;
  manual_threshold integer;
  max_self_people integer;
  preferred_zone text;
  chosen_unit text;
  allocations jsonb := '[]'::jsonb;
  remaining_people integer;
  allocated_people integer;
  unit_record record;
  next_value jsonb;
begin
  if coalesce(trim(p_token), '') = '' then raise exception 'KAFE_INVALID_MANAGEMENT_TOKEN'; end if;
  if p_date is null or p_slot is null or p_slot !~ '^[0-9]{2}:[0-9]{2}$' then
    raise exception 'KAFE_INVALID_SLOT';
  end if;
  if p_people is null or p_people < 1 or p_people > 10 then
    raise exception 'KAFE_INVALID_GROUP_SIZE';
  end if;

  perform pg_advisory_xact_lock(hashtext('kafe-reservations-' || p_date::text));

  select * into booking from public.kafe_reservations
  where value ->> 'managementToken' = p_token for update;
  if not found then raise exception 'KAFE_RESERVATION_NOT_FOUND'; end if;

  portal := private.get_kafe_reservation_by_token(p_token);
  if coalesce((portal ->> 'canReschedule')::boolean, false) is not true then
    raise exception 'KAFE_MODIFICATION_NOT_ALLOWED';
  end if;

  select value into settings_value from public.kafe_settings where public.kafe_settings.id = 'main';
  if settings_value is null then raise exception 'KAFE_SETTINGS_MISSING'; end if;

  duration_minutes := coalesce((settings_value ->> 'slotDurationMinutes')::integer, 120);
  interval_minutes := coalesce((settings_value ->> 'slotIntervalMinutes')::integer, 60);
  deposit_threshold := coalesce((settings_value ->> 'depositThreshold')::integer, 8);
  manual_threshold := coalesce((settings_value ->> 'manualConfirmationThreshold')::integer, 10);
  max_self_people := least(deposit_threshold, manual_threshold) - 1;
  preferred_zone := coalesce(nullif(booking.value ->> 'seatingPreference', ''), 'indifferent');

  if not coalesce((booking.value ->> 'depositRequired')::boolean, false)
    and p_people > greatest(max_self_people, 1)
  then
    raise exception 'KAFE_GROUP_CONTACT_REQUIRED';
  end if;

  if not private.kafe_booking_time_allowed(
    p_date, p_slot, coalesce((settings_value ->> 'minimumBookingLeadHours')::numeric, 0)
  ) then raise exception 'KAFE_BOOKING_TOO_LATE'; end if;

  if not exists (
    select 1 from jsonb_array_elements(settings_value -> 'scheduleRules') schedule_rule
    where extract(dow from p_date)::integer in (
        select weekday::integer from jsonb_array_elements_text(schedule_rule -> 'weekdays') weekday
      )
      and p_date between (schedule_rule ->> 'validFrom')::date and (schedule_rule ->> 'validUntil')::date
      and p_slot::time >= (schedule_rule ->> 'startTime')::time
      and p_slot::time <= (schedule_rule ->> 'endTime')::time
      and mod(
        floor(extract(epoch from (p_slot::time - (schedule_rule ->> 'startTime')::time)) / 60)::integer,
        greatest(interval_minutes, 1)
      ) = 0
  ) then raise exception 'KAFE_INVALID_SLOT'; end if;

  with units as (
    select
      (area ->> 'id') || '-' || series.index as unit_id,
      (area ->> 'capacity')::integer as capacity,
      coalesce(area ->> 'zone', 'interieur') as zone
    from jsonb_array_elements(settings_value -> 'seatingAreas') area
    cross join lateral generate_series(1, greatest((area ->> 'quantity')::integer, 0)) as series(index)
  ), eligible_units as (
    select * from units where preferred_zone = 'indifferent' or zone = preferred_zone
  ), occupancy as (
    select unit.unit_id, unit.capacity, coalesce(sum(existing.people), 0)::integer as used
    from eligible_units unit
    left join private.get_kafe_slot_occupancy(p_date, p_date) existing
      on existing.seating_unit_id = unit.unit_id
      and existing.reservation_id <> booking.id
      and existing.slot::time < p_slot::time + make_interval(mins => duration_minutes)
      and existing.slot::time + make_interval(mins => duration_minutes) > p_slot::time
    group by unit.unit_id, unit.capacity
  )
  select unit_id into chosen_unit
  from occupancy
  where capacity - used >= p_people
  order by capacity - used - p_people, capacity, unit_id
  limit 1;

  if chosen_unit is not null then
    allocations := jsonb_build_array(jsonb_build_object('unitId', chosen_unit, 'people', p_people));
  else
    raise exception 'KAFE_SLOT_FULL';
  end if;

  next_value := booking.value || jsonb_build_object(
    'date', p_date::text,
    'slot', p_slot,
    'people', p_people,
    'seatingUnitId', chosen_unit,
    'seatingAllocations', allocations,
    'rescheduledByCustomerAt', now(),
    'rescheduleCount', coalesce((booking.value ->> 'rescheduleCount')::integer, 0) + 1
  );

  update public.kafe_reservations
  set date = p_date,
      slot = p_slot,
      people = p_people,
      seating_unit_id = chosen_unit,
      value = next_value,
      updated_at = now()
  where id = booking.id;

  return private.get_kafe_reservation_by_token(p_token);
end;
$function$;

create or replace function public.reschedule_kafe_reservation_by_token(
  p_token text, p_date date, p_slot text, p_people integer
)
 returns jsonb
 language sql
 set search_path to 'public'
as $function$
  select private.reschedule_kafe_reservation_by_token(p_token, p_date, p_slot, p_people);
$function$;

revoke all on function public.reschedule_kafe_reservation_by_token(text, date, text, integer) from public;
grant execute on function public.reschedule_kafe_reservation_by_token(text, date, text, integer) to anon, authenticated, service_role;