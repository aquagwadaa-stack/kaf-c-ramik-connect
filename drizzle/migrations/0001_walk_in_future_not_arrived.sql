create or replace function private.create_kafe_walk_in(p_date date, p_slot text, p_people integer, p_seating_unit_id text, p_label text default null)
returns table(id text, seating_unit_id text)
language plpgsql
security definer
set search_path to ''
as $$
declare
  settings_value jsonb;
  duration_minutes integer;
  unit_capacity integer;
  used_capacity integer;
  new_id text;
  display_label text;
  new_status text;
begin
  if not private.is_kafe_admin() then raise exception 'KAFE_ADMIN_REQUIRED'; end if;
  if p_people < 1 or p_date < timezone('America/Guadeloupe', now())::date then
    raise exception 'KAFE_INVALID_WALK_IN'; end if;

  perform pg_advisory_xact_lock(hashtext('kafe-reservations-' || p_date::text));
  perform private.expire_kafe_no_shows();

  select value into settings_value from public.kafe_settings where public.kafe_settings.id = 'main';
  if settings_value is null then raise exception 'KAFE_SETTINGS_MISSING'; end if;
  duration_minutes := coalesce((settings_value ->> 'slotDurationMinutes')::integer, 120);

  with units as (
    select (area ->> 'id') || '-' || series.index as unit_id,
      (area ->> 'capacity')::integer as capacity
    from jsonb_array_elements(settings_value -> 'seatingAreas') area
    cross join lateral generate_series(1, greatest((area ->> 'quantity')::integer, 0)) as series(index)
  )
  select capacity into unit_capacity from units where unit_id = p_seating_unit_id;

  if unit_capacity is null then raise exception 'KAFE_INVALID_SEATING_UNIT'; end if;

  if exists (
    select 1 from public.kafe_reservations existing
    where existing.date = p_date and existing.status <> 'cancelled'
      and existing.seating_unit_id is null
      and existing.slot::time < p_slot::time + make_interval(mins => duration_minutes)
      and existing.slot::time + make_interval(mins => duration_minutes) > p_slot::time
  ) then raise exception 'KAFE_SEATING_REVIEW_REQUIRED'; end if;

  select coalesce(sum(existing.people), 0)::integer into used_capacity
  from public.kafe_reservations existing
  where existing.date = p_date and existing.status <> 'cancelled'
    and existing.seating_unit_id = p_seating_unit_id
    and existing.slot::time < p_slot::time + make_interval(mins => duration_minutes)
    and existing.slot::time + make_interval(mins => duration_minutes) > p_slot::time;

  if unit_capacity - used_capacity < p_people then raise exception 'KAFE_SLOT_FULL'; end if;

  new_id := 'walk-in-' || extract(epoch from clock_timestamp())::bigint || '-' || replace(gen_random_uuid()::text, '-', '');
  display_label := coalesce(nullif(trim(p_label), ''), 'Groupe sur place');
  new_status := 'confirmed';

  insert into public.kafe_reservations (id, value, created_at, date, slot, people, status, seating_unit_id, updated_at)
  values (new_id,
    jsonb_build_object('id', new_id, 'createdAt', now(), 'experience', 'atelier', 'people', p_people,
      'date', p_date::text, 'slot', p_slot, 'firstName', display_label, 'lastName', '',
      'phone', '', 'email', '', 'childrenAges', 'Non renseigné', 'guideAccepted', false,
      'message', 'Ajouté sur place par l''équipe.', 'depositPaid', false,
      'depositRequired', false, 'depositAmount', 0, 'status', new_status,
      'seatingUnitId', p_seating_unit_id, 'source', 'walk_in', 'walkInLabel', display_label),
    now(), p_date, p_slot, p_people, new_status, p_seating_unit_id, now());

  return query select new_id, p_seating_unit_id;
end;
$$;
revoke all on function private.create_kafe_walk_in(date, text, integer, text, text) from public;
