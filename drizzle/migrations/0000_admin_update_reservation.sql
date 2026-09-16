create or replace function private.update_kafe_reservation(
  p_id text,
  p_date date,
  p_slot text,
  p_people integer,
  p_reactivate boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  booking public.kafe_reservations%rowtype;
  settings_value jsonb;
  duration_minutes integer;
  chosen_unit text;
  allocations jsonb := '[]'::jsonb;
  remaining_people integer;
  allocated_people integer;
  unit_record record;
  preferred_zone text;
  next_status text;
  next_value jsonb;
begin
  if not private.is_kafe_admin() then raise exception 'KAFE_ADMIN_REQUIRED'; end if;
  if p_people is null or p_people < 1 then raise exception 'KAFE_INVALID_GROUP_SIZE'; end if;
  if p_date is null or p_slot is null or p_slot !~ '^[0-9]{2}:[0-9]{2}$' then
    raise exception 'KAFE_INVALID_SLOT';
  end if;

  perform pg_advisory_xact_lock(hashtext('kafe-reservations-' || p_date::text));

  select * into booking from public.kafe_reservations where id = p_id for update;
  if not found then raise exception 'KAFE_RESERVATION_NOT_FOUND'; end if;

  select value into settings_value from public.kafe_settings where public.kafe_settings.id = 'main';
  if settings_value is null then raise exception 'KAFE_SETTINGS_MISSING'; end if;
  duration_minutes := coalesce((settings_value ->> 'slotDurationMinutes')::integer, 120);
  preferred_zone := coalesce(nullif(booking.value ->> 'seatingPreference', ''), 'indifferent');

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
      and existing.reservation_id <> p_id
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
    remaining_people := p_people;
    for unit_record in
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
          and existing.reservation_id <> p_id
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
  end if;

  next_status := booking.status;
  if booking.status = 'cancelled' then
    if not coalesce(p_reactivate, false) then raise exception 'KAFE_RESERVATION_CANCELLED'; end if;
    next_status := case
      when coalesce((booking.value ->> 'depositRequired')::boolean, false)
        and not coalesce((booking.value ->> 'depositPaid')::boolean, false)
      then 'pending'
      else 'confirmed'
    end;
  end if;

  next_value := (booking.value - array[
    'cancelledAt', 'cancelledBy', 'cancellationEmailSentAt',
    'adminCancellationAlertEmailSentAt', 'adminCancellationPushSentAt'
  ]) || jsonb_build_object(
    'status', next_status,
    'date', p_date::text,
    'slot', p_slot,
    'people', p_people,
    'seatingUnitId', chosen_unit,
    'seatingAllocations', allocations,
    'updatedByAdminAt', now(),
    'updatedByAdmin', auth.uid()
  );

  update public.kafe_reservations
  set date = p_date,
      slot = p_slot,
      people = p_people,
      status = next_status,
      seating_unit_id = chosen_unit,
      value = next_value,
      updated_at = now()
  where id = p_id;

  return jsonb_build_object('id', p_id, 'status', next_status, 'value', next_value);
end;
$function$;

create or replace function public.update_kafe_reservation(
  p_id text,
  p_date date,
  p_slot text,
  p_people integer,
  p_reactivate boolean default false
)
returns jsonb
language sql
set search_path to 'public'
as $function$ select private.update_kafe_reservation(p_id, p_date, p_slot, p_people, p_reactivate); $function$;

revoke all on function public.update_kafe_reservation(text, date, text, integer, boolean) from public, anon;
grant execute on function public.update_kafe_reservation(text, date, text, integer, boolean) to authenticated, service_role;