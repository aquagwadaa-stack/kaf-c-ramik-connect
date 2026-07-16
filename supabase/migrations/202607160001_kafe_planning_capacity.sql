alter table public.kafe_reservations
  add column if not exists seating_unit_id text;

alter table public.kafe_reservations
  drop constraint if exists kafe_reservations_status_check;

alter table public.kafe_reservations
  add constraint kafe_reservations_status_check
  check (status in ('pending', 'deposit_paid', 'confirmed', 'arrived', 'cancelled'));

update public.kafe_settings
set
  value = value || jsonb_build_object(
    'configurationVersion', 2,
    'defaultCapacity', 63,
    'slotDurationMinutes', 120,
    'slotIntervalMinutes', 60,
    'slots', jsonb_build_array(
      '09:30', '10:30', '11:30', '12:30', '13:30', '14:30', '15:30', '16:30'
    ),
    'scheduleRules', jsonb_build_array(
      jsonb_build_object(
        'id', 'rule-standard',
        'label', 'Semaine type',
        'weekdays', jsonb_build_array(2, 3, 4, 5, 6, 0),
        'startTime', '09:30',
        'endTime', '16:30',
        'validFrom', '2026-01-01',
        'validUntil', '2030-12-31'
      )
    ),
    'seatingAreas', jsonb_build_array(
      jsonb_build_object('id', 'carbet', 'label', 'Carbet', 'capacity', 15, 'quantity', 1),
      jsonb_build_object('id', 'pique-nique', 'label', 'Table de pique-nique', 'capacity', 5, 'quantity', 8),
      jsonb_build_object('id', 'table-2', 'label', 'Table de 2', 'capacity', 2, 'quantity', 2),
      jsonb_build_object('id', 'salon-2', 'label', 'Espace salon', 'capacity', 2, 'quantity', 2)
    ),
    'closedWeekdays', jsonb_build_array(1),
    'kitchenClosingTime', '17:30',
    'lateArrivalGraceMinutes', 35,
    'cancellationNoticeHours', 48,
    'groupDepositForfeitHours', 24,
    'reservationFieldRequirements', jsonb_build_object(
      'emailRequired', false,
      'childrenAgesRequired', true,
      'messageRequired', true
    ),
    'manualConfirmationForGroups', true,
    'manualConfirmationThreshold', 8,
    'reservationConditionsText', 'Annulation possible jusqu''à 48 h avant. Au-delà, merci d''appeler le Kafé. Une réservation est libérée après plus de 30 minutes de retard. Pour les groupes, l''acompte est conservé si l''annulation intervient moins de 24 h avant.'
  ),
  updated_at = now()
where id = 'main';

create or replace function public.expire_kafe_no_shows()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  grace_minutes integer := 35;
  affected integer := 0;
begin
  select coalesce((value ->> 'lateArrivalGraceMinutes')::integer, 35)
  into grace_minutes
  from public.kafe_settings
  where id = 'main';

  update public.kafe_reservations r
  set
    status = 'cancelled',
    value = jsonb_set(r.value, '{status}', '"cancelled"'::jsonb, true),
    updated_at = now()
  where r.status in ('pending', 'deposit_paid', 'confirmed')
    and (r.date + r.slot::time + make_interval(mins => grace_minutes))
      < timezone('America/Guadeloupe', now())
    and not exists (
      select 1
      from public.kafe_waiver_signatures s
      where s.reservation_ref = r.id
    );

  get diagnostics affected = row_count;
  return affected;
end;
$$;

revoke all on function public.expire_kafe_no_shows() from public;
grant execute on function public.expire_kafe_no_shows() to authenticated;

create or replace function public.mark_kafe_reservation_arrived()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.reservation_ref is not null then
    update public.kafe_reservations r
    set
      status = 'arrived',
      value = jsonb_set(r.value, '{status}', '"arrived"'::jsonb, true),
      updated_at = now()
    where r.id = new.reservation_ref
      and r.status <> 'cancelled';
  end if;
  return new;
end;
$$;

drop trigger if exists mark_kafe_reservation_arrived_on_signature
  on public.kafe_waiver_signatures;

create trigger mark_kafe_reservation_arrived_on_signature
after insert or update of reservation_ref on public.kafe_waiver_signatures
for each row execute function public.mark_kafe_reservation_arrived();

do $$
declare
  settings_value jsonb;
  reservation_record record;
  chosen_unit text;
  duration_minutes integer;
begin
  select value into settings_value
  from public.kafe_settings
  where id = 'main';

  duration_minutes := coalesce((settings_value ->> 'slotDurationMinutes')::integer, 120);

  for reservation_record in
    select id, date, slot, people
    from public.kafe_reservations
    where status <> 'cancelled'
      and seating_unit_id is null
    order by date, slot, people desc, created_at
  loop
    with units as (
      select
        (area ->> 'id') || '-' || series.index as unit_id,
        (area ->> 'capacity')::integer as capacity
      from jsonb_array_elements(settings_value -> 'seatingAreas') area
      cross join lateral generate_series(
        1,
        greatest((area ->> 'quantity')::integer, 0)
      ) as series(index)
    ),
    occupancy as (
      select
        unit.unit_id,
        unit.capacity,
        coalesce(sum(existing.people), 0)::integer as used
      from units unit
      left join public.kafe_reservations existing
        on existing.seating_unit_id = unit.unit_id
        and existing.date = reservation_record.date
        and existing.status <> 'cancelled'
        and existing.id <> reservation_record.id
        and existing.slot::time
          < reservation_record.slot::time + make_interval(mins => duration_minutes)
        and existing.slot::time + make_interval(mins => duration_minutes)
          > reservation_record.slot::time
      group by unit.unit_id, unit.capacity
    )
    select unit_id
    into chosen_unit
    from occupancy
    where capacity - used >= reservation_record.people
    order by capacity - used - reservation_record.people, capacity, unit_id
    limit 1;

    if chosen_unit is not null then
      update public.kafe_reservations
      set
        seating_unit_id = chosen_unit,
        value = value || jsonb_build_object('seatingUnitId', chosen_unit),
        updated_at = now()
      where id = reservation_record.id;
    end if;
  end loop;
end;
$$;

create or replace function public.get_kafe_slot_occupancy(from_date date, to_date date)
returns table(
  reservation_id text,
  date text,
  slot text,
  people integer,
  seating_unit_id text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.expire_kafe_no_shows();

  return query
  select
    r.id,
    r.date::text,
    r.slot,
    r.people,
    r.seating_unit_id
  from public.kafe_reservations r
  where r.date between from_date and to_date
    and r.status <> 'cancelled'
  order by r.date, r.slot, r.people desc;
end;
$$;

revoke all on function public.get_kafe_slot_occupancy(date, date) from public;
grant execute on function public.get_kafe_slot_occupancy(date, date) to anon, authenticated;

create or replace function public.create_kafe_reservation(
  p_value jsonb,
  p_date date,
  p_slot text,
  p_people integer
)
returns table(id text, seating_unit_id text)
language plpgsql
security definer
set search_path = public
as $$
declare
  settings_value jsonb;
  duration_minutes integer;
  interval_minutes integer;
  chosen_unit text;
  new_id text;
  reservation_status text;
  manual_threshold integer;
begin
  if p_people < 1 then
    raise exception 'KAFE_INVALID_GROUP_SIZE';
  end if;

  perform pg_advisory_xact_lock(hashtext('kafe-reservations-' || p_date::text));
  perform public.expire_kafe_no_shows();

  select value into settings_value
  from public.kafe_settings
  where id = 'main';

  if settings_value is null then
    raise exception 'KAFE_SETTINGS_MISSING';
  end if;

  duration_minutes := coalesce((settings_value ->> 'slotDurationMinutes')::integer, 120);
  interval_minutes := coalesce((settings_value ->> 'slotIntervalMinutes')::integer, 60);
  manual_threshold := coalesce((settings_value ->> 'manualConfirmationThreshold')::integer, 8);

  if p_date < timezone('America/Guadeloupe', now())::date then
    raise exception 'KAFE_INVALID_DATE';
  end if;

  if not exists (
    select 1
    from jsonb_array_elements(settings_value -> 'scheduleRules') schedule_rule
    where extract(dow from p_date)::integer in (
        select weekday::integer
        from jsonb_array_elements_text(schedule_rule -> 'weekdays') weekday
      )
      and p_date between
        (schedule_rule ->> 'validFrom')::date
        and (schedule_rule ->> 'validUntil')::date
      and p_slot::time >= (schedule_rule ->> 'startTime')::time
      and p_slot::time <= (schedule_rule ->> 'endTime')::time
      and mod(
        floor(
          extract(
            epoch from (p_slot::time - (schedule_rule ->> 'startTime')::time)
          ) / 60
        )::integer,
        greatest(interval_minutes, 1)
      ) = 0
  ) then
    raise exception 'KAFE_INVALID_SLOT';
  end if;

  if coalesce(nullif(trim(p_value ->> 'firstName'), ''), '') = ''
    or coalesce(nullif(trim(p_value ->> 'lastName'), ''), '') = ''
    or length(regexp_replace(coalesce(p_value ->> 'phone', ''), '[^0-9+]', '', 'g')) < 8
    or coalesce(nullif(trim(p_value ->> 'childrenAges'), ''), '') = ''
    or coalesce(nullif(trim(p_value ->> 'message'), ''), '') = ''
    or coalesce((p_value ->> 'guideAccepted')::boolean, false) is not true
  then
    raise exception 'KAFE_REQUIRED_INFORMATION_MISSING';
  end if;

  if exists (
    select 1
    from public.kafe_reservations existing
    where existing.date = p_date
      and existing.status <> 'cancelled'
      and existing.seating_unit_id is null
      and existing.slot::time < p_slot::time + make_interval(mins => duration_minutes)
      and existing.slot::time + make_interval(mins => duration_minutes) > p_slot::time
  ) then
    raise exception 'KAFE_SEATING_REVIEW_REQUIRED';
  end if;

  with units as (
    select
      (area ->> 'id') || '-' || series.index as unit_id,
      (area ->> 'capacity')::integer as capacity
    from jsonb_array_elements(settings_value -> 'seatingAreas') area
    cross join lateral generate_series(
      1,
      greatest((area ->> 'quantity')::integer, 0)
    ) as series(index)
  ),
  occupancy as (
    select
      unit.unit_id,
      unit.capacity,
      coalesce(sum(existing.people), 0)::integer as used
    from units unit
    left join public.kafe_reservations existing
      on existing.seating_unit_id = unit.unit_id
      and existing.date = p_date
      and existing.status <> 'cancelled'
      and existing.slot::time < p_slot::time + make_interval(mins => duration_minutes)
      and existing.slot::time + make_interval(mins => duration_minutes) > p_slot::time
    group by unit.unit_id, unit.capacity
  )
  select unit_id
  into chosen_unit
  from occupancy
  where capacity - used >= p_people
  order by capacity - used - p_people, capacity, unit_id
  limit 1;

  if chosen_unit is null then
    raise exception 'KAFE_SLOT_FULL';
  end if;

  new_id := coalesce(
    nullif(p_value ->> 'id', ''),
    'r' || extract(epoch from clock_timestamp())::bigint || '-' || encode(gen_random_bytes(4), 'hex')
  );
  reservation_status := case
    when p_people >= manual_threshold or p_value ->> 'experience' = 'groupe' then 'pending'
    else 'confirmed'
  end;

  insert into public.kafe_reservations (
    id,
    value,
    created_at,
    date,
    slot,
    people,
    status,
    seating_unit_id,
    updated_at
  )
  values (
    new_id,
    p_value || jsonb_build_object(
      'id', new_id,
      'status', reservation_status,
      'seatingUnitId', chosen_unit,
      'people', p_people,
      'date', p_date::text,
      'slot', p_slot
    ),
    coalesce((p_value ->> 'createdAt')::timestamptz, now()),
    p_date,
    p_slot,
    p_people,
    reservation_status,
    chosen_unit,
    now()
  );

  return query select new_id, chosen_unit;
end;
$$;

drop policy if exists "Public can create reservations" on public.kafe_reservations;
revoke insert on public.kafe_reservations from public, anon, authenticated;

revoke all on function public.create_kafe_reservation(jsonb, date, text, integer) from public;
grant execute on function public.create_kafe_reservation(jsonb, date, text, integer)
  to anon, authenticated;
