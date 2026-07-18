update public.kafe_settings
set value = value || jsonb_build_object(
  'configurationVersion', 6,
  'minimumBookingLeadDays', 1,
  'groupOutsideFoodNotice', 'Pour les groupes, les boissons et la nourriture provenant de l''extérieur ne peuvent pas être consommées au Kafé.',
  'adminNotificationEmail', coalesce(nullif(value ->> 'adminNotificationEmail', ''), 'malamadre971@gmail.com'),
  'giftCardPaymentUrl', coalesce(value ->> 'giftCardPaymentUrl', ''),
  'groupCeramicRatePerPerson', coalesce((value ->> 'groupCeramicRatePerPerson')::numeric, 0),
  'groupMealRatePerPerson', coalesce((value ->> 'groupMealRatePerPerson')::numeric, 0)
), updated_at = now()
where id = 'main';

create or replace function private.get_kafe_slot_occupancy(from_date date, to_date date)
returns table(reservation_id text, date text, slot text, people integer, seating_unit_id text)
language plpgsql security definer set search_path to 'public'
as $function$
begin
  perform private.expire_kafe_no_shows();
  return query
  select
    r.id,
    r.date::text,
    r.slot,
    coalesce((allocation.value ->> 'people')::integer, r.people),
    coalesce(allocation.value ->> 'unitId', r.seating_unit_id)
  from public.kafe_reservations r
  cross join lateral jsonb_array_elements(
    case
      when jsonb_typeof(r.value -> 'seatingAllocations') = 'array'
        and jsonb_array_length(r.value -> 'seatingAllocations') > 0
      then r.value -> 'seatingAllocations'
      else jsonb_build_array(jsonb_build_object(
        'unitId', r.seating_unit_id,
        'people', r.people
      ))
    end
  ) allocation(value)
  where r.date between from_date and to_date
    and r.status <> 'cancelled'
  order by r.date, r.slot, r.people desc;
end;
$function$;
create or replace function private.create_kafe_reservation(
  p_value jsonb,
  p_date date,
  p_slot text,
  p_people integer
)
returns table(id text, seating_unit_id text)
language plpgsql security definer set search_path to 'public'
as $function$
declare
  settings_value jsonb;
  duration_minutes integer;
  interval_minutes integer;
  minimum_lead_days integer;
  chosen_unit text;
  new_id text;
  reservation_status text;
  manual_threshold integer;
  allocations jsonb := '[]'::jsonb;
  remaining_people integer;
  allocated_people integer;
  unit_record record;
  experience_value text;
begin
  if p_people < 1 then raise exception 'KAFE_INVALID_GROUP_SIZE'; end if;

  perform pg_advisory_xact_lock(hashtext('kafe-reservations-' || p_date::text));
  perform private.expire_kafe_no_shows();

  select value into settings_value from public.kafe_settings where public.kafe_settings.id = 'main';
  if settings_value is null then raise exception 'KAFE_SETTINGS_MISSING'; end if;

  duration_minutes := coalesce((settings_value ->> 'slotDurationMinutes')::integer, 120);
  interval_minutes := coalesce((settings_value ->> 'slotIntervalMinutes')::integer, 60);
  minimum_lead_days := greatest(coalesce((settings_value ->> 'minimumBookingLeadDays')::integer, 1), 0);
  manual_threshold := coalesce((settings_value ->> 'manualConfirmationThreshold')::integer, 8);
  experience_value := coalesce(p_value ->> 'experience', 'cafe_atelier');

  if p_date < timezone('America/Guadeloupe', now())::date + minimum_lead_days then
    raise exception 'KAFE_BOOKING_TOO_LATE';
  end if;

  if not exists (
    select 1 from jsonb_array_elements(settings_value -> 'scheduleRules') schedule_rule
    where extract(dow from p_date)::integer in (
        select weekday::integer from jsonb_array_elements_text(schedule_rule -> 'weekdays') weekday
      )
      and p_date between (schedule_rule ->> 'validFrom')::date and (schedule_rule ->> 'validUntil')::date
      and p_slot::time >= (schedule_rule ->> 'startTime')::time
      and p_slot::time <= (schedule_rule ->> 'endTime')::time
      and mod(floor(extract(epoch from (p_slot::time - (schedule_rule ->> 'startTime')::time)) / 60)::integer,
              greatest(interval_minutes, 1)) = 0
  ) then raise exception 'KAFE_INVALID_SLOT'; end if;

  if coalesce(nullif(trim(p_value ->> 'firstName'), ''), '') = ''
    or coalesce(nullif(trim(p_value ->> 'lastName'), ''), '') = ''
    or length(regexp_replace(coalesce(p_value ->> 'phone', ''), '[^0-9+]', '', 'g')) < 8
    or coalesce(nullif(trim(p_value ->> 'email'), ''), '') = ''
    or coalesce(p_value ->> 'email', '') !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    or (
      experience_value <> 'brunch_atelier'
      and coalesce((p_value ->> 'guideAccepted')::boolean, false) is not true
    )
  then raise exception 'KAFE_REQUIRED_INFORMATION_MISSING'; end if;

  if exists (
    select 1 from public.kafe_reservations existing
    where existing.date = p_date and existing.status <> 'cancelled'
      and existing.seating_unit_id is null
      and existing.slot::time < p_slot::time + make_interval(mins => duration_minutes)
      and existing.slot::time + make_interval(mins => duration_minutes) > p_slot::time
  ) then raise exception 'KAFE_SEATING_REVIEW_REQUIRED'; end if;

  with units as (
    select (area ->> 'id') || '-' || series.index as unit_id,
      (area ->> 'capacity')::integer as capacity
    from jsonb_array_elements(settings_value -> 'seatingAreas') area
    cross join lateral generate_series(1, greatest((area ->> 'quantity')::integer, 0)) as series(index)
  ), occupancy as (
    select unit.unit_id, unit.capacity, coalesce(sum(existing.people), 0)::integer as used
    from units unit
    left join private.get_kafe_slot_occupancy(p_date, p_date) existing
      on existing.seating_unit_id = unit.unit_id
      and existing.slot::time < p_slot::time + make_interval(mins => duration_minutes)
      and existing.slot::time + make_interval(mins => duration_minutes) > p_slot::time
    group by unit.unit_id, unit.capacity
  )
  select unit_id into chosen_unit from occupancy
  where capacity - used >= p_people
  order by capacity - used - p_people, capacity, unit_id
  limit 1;

  if chosen_unit is not null then
    allocations := jsonb_build_array(jsonb_build_object('unitId', chosen_unit, 'people', p_people));
  elsif p_people >= manual_threshold then
    remaining_people := p_people;
    for unit_record in
      with units as (
        select (area ->> 'id') || '-' || series.index as unit_id,
          (area ->> 'capacity')::integer as capacity
        from jsonb_array_elements(settings_value -> 'seatingAreas') area
        cross join lateral generate_series(1, greatest((area ->> 'quantity')::integer, 0)) as series(index)
      ), occupancy as (
        select unit.unit_id, unit.capacity, coalesce(sum(existing.people), 0)::integer as used
        from units unit
        left join private.get_kafe_slot_occupancy(p_date, p_date) existing
          on existing.seating_unit_id = unit.unit_id
          and existing.slot::time < p_slot::time + make_interval(mins => duration_minutes)
          and existing.slot::time + make_interval(mins => duration_minutes) > p_slot::time
        group by unit.unit_id, unit.capacity
      )
      select unit_id, capacity - used as remaining
      from occupancy
      where capacity - used > 0
      order by capacity - used desc, capacity desc, unit_id
    loop
      exit when remaining_people <= 0;
      allocated_people := least(unit_record.remaining, remaining_people);
      allocations := allocations || jsonb_build_array(jsonb_build_object(
        'unitId', unit_record.unit_id,
        'people', allocated_people
      ));
      remaining_people := remaining_people - allocated_people;
    end loop;

    if remaining_people > 0 then raise exception 'KAFE_SLOT_FULL'; end if;
    chosen_unit := allocations -> 0 ->> 'unitId';
  else
    raise exception 'KAFE_SLOT_FULL';
  end if;

  new_id := coalesce(nullif(p_value ->> 'id', ''),
    'r' || extract(epoch from clock_timestamp())::bigint || '-' || replace(gen_random_uuid()::text, '-', ''));
  reservation_status := case when p_people >= manual_threshold then 'pending' else 'confirmed' end;

  insert into public.kafe_reservations (
    id, value, created_at, date, slot, people, status, seating_unit_id, updated_at
  ) values (
    new_id,
    p_value || jsonb_build_object(
      'id', new_id,
      'status', reservation_status,
      'seatingUnitId', chosen_unit,
      'seatingAllocations', allocations,
      'people', p_people,
      'date', p_date::text,
      'slot', p_slot,
      'childrenAges', coalesce(p_value ->> 'childrenAges', ''),
      'message', coalesce(p_value ->> 'message', '')
    ),
    coalesce((p_value ->> 'createdAt')::timestamptz, now()),
    p_date, p_slot, p_people, reservation_status, chosen_unit, now()
  );

  return query select new_id, chosen_unit;
end;
$function$;
