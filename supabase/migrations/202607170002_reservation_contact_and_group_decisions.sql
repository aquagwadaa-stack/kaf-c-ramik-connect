update public.kafe_settings
set
  value = value || jsonb_build_object(
    'configurationVersion', 5,
    'reservationFieldRequirements', jsonb_build_object(
      'emailRequired', true,
      'childrenAgesRequired', false,
      'messageRequired', false
    ),
    'reservationConditionsText',
      'Annulation possible jusqu''à 48 h avant. Au-delà, merci d''appeler le Kafé. Pour les groupes, l''acompte est remboursable uniquement si l''annulation intervient au moins 24 h avant.'
  ),
  updated_at = now()
where id = 'main';

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
  where public.kafe_settings.id = 'main';

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
    or coalesce(nullif(trim(p_value ->> 'email'), ''), '') = ''
    or coalesce(p_value ->> 'email', '') !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
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
    'r' || extract(epoch from clock_timestamp())::bigint || '-' || replace(gen_random_uuid()::text, '-', '')
  );
  reservation_status := case
    when p_people >= manual_threshold then 'pending'
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
      'slot', p_slot,
      'childrenAges', coalesce(p_value ->> 'childrenAges', ''),
      'message', coalesce(p_value ->> 'message', '')
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

revoke all on function public.create_kafe_reservation(jsonb, date, text, integer) from public;
grant execute on function public.create_kafe_reservation(jsonb, date, text, integer)
  to anon, authenticated;

create or replace function public.decide_kafe_group_reservation(
  p_id text,
  p_approved boolean,
  p_message text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_value jsonb;
  next_status text;
  next_value jsonb;
begin
  if not private.is_kafe_admin() then
    raise exception 'KAFE_ADMIN_REQUIRED';
  end if;

  select value into current_value
  from public.kafe_reservations
  where id = p_id
  for update;

  if current_value is null then
    raise exception 'KAFE_RESERVATION_NOT_FOUND';
  end if;

  next_status := case when p_approved then 'confirmed' else 'cancelled' end;
  next_value := current_value || jsonb_build_object(
    'status', next_status,
    'decisionMessage', case when p_approved then '' else coalesce(trim(p_message), '') end,
    'decisionAt', now(),
    'decisionBy', auth.uid()
  );

  update public.kafe_reservations
  set
    status = next_status,
    value = next_value,
    updated_at = now()
  where id = p_id;

  return next_value;
end;
$$;

revoke all on function public.decide_kafe_group_reservation(text, boolean, text) from public;
grant execute on function public.decide_kafe_group_reservation(text, boolean, text)
  to authenticated;
