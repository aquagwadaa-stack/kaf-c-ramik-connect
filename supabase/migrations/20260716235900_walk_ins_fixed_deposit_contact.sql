update public.kafe_settings
set
  value = (value - 'depositPerPerson') || jsonb_build_object(
    'configurationVersion', 3,
    'depositThreshold', 8,
    'depositFixedAmount', 100,
    'contactPhone', '0690 28 47 88',
    'contactAddress', 'Lieu dit Loyette, 97118 Saint-François, Guadeloupe',
    'contactMapUrl', 'https://www.google.com/maps?q=16.286364%2C-61.288357'
  ),
  updated_at = now()
where id = 'main';

create or replace function public.enforce_kafe_reservation_deposit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  settings_value jsonb;
  deposit_threshold integer;
  fixed_amount numeric;
  is_walk_in boolean;
  requires_deposit boolean;
begin
  select value into settings_value
  from public.kafe_settings
  where public.kafe_settings.id = 'main';

  deposit_threshold := coalesce((settings_value ->> 'depositThreshold')::integer, 8);
  fixed_amount := coalesce((settings_value ->> 'depositFixedAmount')::numeric, 100);
  is_walk_in := coalesce(new.value ->> 'source', '') = 'walk_in';
  requires_deposit := not is_walk_in and new.people >= deposit_threshold;

  new.value := new.value || jsonb_build_object(
    'depositRequired', requires_deposit,
    'depositAmount', case when requires_deposit then fixed_amount else 0 end,
    'depositPaid', case
      when requires_deposit then coalesce((new.value ->> 'depositPaid')::boolean, false)
      else false
    end,
    'isGroupRequest', requires_deposit
  );
  return new;
end;
$$;

drop trigger if exists enforce_kafe_reservation_deposit_on_insert
  on public.kafe_reservations;

create trigger enforce_kafe_reservation_deposit_on_insert
before insert on public.kafe_reservations
for each row execute function public.enforce_kafe_reservation_deposit();

update public.kafe_reservations reservation
set
  value = reservation.value || jsonb_build_object(
    'depositRequired', case
      when coalesce(reservation.value ->> 'source', '') = 'walk_in' then false
      else reservation.people >= 8
    end,
    'depositAmount', case
      when coalesce(reservation.value ->> 'source', '') <> 'walk_in' and reservation.people >= 8
        then 100
      else 0
    end,
    'depositPaid', case
      when coalesce(reservation.value ->> 'source', '') <> 'walk_in' and reservation.people >= 8
        then coalesce((reservation.value ->> 'depositPaid')::boolean, false)
      else false
    end,
    'isGroupRequest', case
      when coalesce(reservation.value ->> 'source', '') = 'walk_in' then false
      else reservation.people >= 8
    end
  ),
  updated_at = now();

create or replace function public.create_kafe_walk_in(
  p_date date,
  p_slot text,
  p_people integer,
  p_seating_unit_id text,
  p_label text default null
)
returns table(id text, seating_unit_id text)
language plpgsql
security definer
set search_path = public
as $$
declare
  settings_value jsonb;
  duration_minutes integer;
  unit_capacity integer;
  used_capacity integer;
  new_id text;
  display_label text;
begin
  if not private.is_kafe_admin() then
    raise exception 'KAFE_ADMIN_REQUIRED';
  end if;

  if p_people < 1 or p_date < timezone('America/Guadeloupe', now())::date then
    raise exception 'KAFE_INVALID_WALK_IN';
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

  with units as (
    select
      (area ->> 'id') || '-' || series.index as unit_id,
      (area ->> 'capacity')::integer as capacity
    from jsonb_array_elements(settings_value -> 'seatingAreas') area
    cross join lateral generate_series(
      1,
      greatest((area ->> 'quantity')::integer, 0)
    ) as series(index)
  )
  select capacity into unit_capacity
  from units
  where unit_id = p_seating_unit_id;

  if unit_capacity is null then
    raise exception 'KAFE_INVALID_SEATING_UNIT';
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

  select coalesce(sum(existing.people), 0)::integer into used_capacity
  from public.kafe_reservations existing
  where existing.date = p_date
    and existing.status <> 'cancelled'
    and existing.seating_unit_id = p_seating_unit_id
    and existing.slot::time < p_slot::time + make_interval(mins => duration_minutes)
    and existing.slot::time + make_interval(mins => duration_minutes) > p_slot::time;

  if unit_capacity - used_capacity < p_people then
    raise exception 'KAFE_SLOT_FULL';
  end if;

  new_id := 'walk-in-' || extract(epoch from clock_timestamp())::bigint || '-' || replace(gen_random_uuid()::text, '-', '');
  display_label := coalesce(nullif(trim(p_label), ''), 'Groupe sur place');

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
    jsonb_build_object(
      'id', new_id,
      'createdAt', now(),
      'experience', 'atelier',
      'people', p_people,
      'date', p_date::text,
      'slot', p_slot,
      'firstName', display_label,
      'lastName', '',
      'phone', '',
      'email', '',
      'childrenAges', 'Non renseigné',
      'guideAccepted', false,
      'message', 'Ajouté sur place par l''équipe.',
      'depositPaid', false,
      'depositRequired', false,
      'depositAmount', 0,
      'status', 'arrived',
      'seatingUnitId', p_seating_unit_id,
      'source', 'walk_in',
      'walkInLabel', display_label
    ),
    now(),
    p_date,
    p_slot,
    p_people,
    'arrived',
    p_seating_unit_id,
    now()
  );

  return query select new_id, p_seating_unit_id;
end;
$$;

revoke all on function public.create_kafe_walk_in(date, text, integer, text, text) from public;
grant execute on function public.create_kafe_walk_in(date, text, integer, text, text)
  to authenticated;
