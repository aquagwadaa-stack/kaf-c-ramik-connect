
-- 1. Move DEFINER functions into private schema

-- get_kafe_slot_occupancy
CREATE OR REPLACE FUNCTION private.get_kafe_slot_occupancy(from_date date, to_date date)
RETURNS TABLE(reservation_id text, date text, slot text, people integer, seating_unit_id text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
begin
  perform private.expire_kafe_no_shows();
  return query
  select r.id, r.date::text, r.slot, r.people, r.seating_unit_id
  from public.kafe_reservations r
  where r.date between from_date and to_date
    and r.status <> 'cancelled'
  order by r.date, r.slot, r.people desc;
end;
$function$;

-- expire_kafe_no_shows
CREATE OR REPLACE FUNCTION private.expire_kafe_no_shows()
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare
  grace_minutes integer := 35;
  affected integer := 0;
begin
  select coalesce((value ->> 'lateArrivalGraceMinutes')::integer, 35)
    into grace_minutes from public.kafe_settings where id = 'main';

  update public.kafe_reservations r
  set status = 'cancelled',
      value = jsonb_set(r.value, '{status}', '"cancelled"'::jsonb, true),
      updated_at = now()
  where r.status in ('pending', 'deposit_paid', 'confirmed')
    and (r.date + r.slot::time + make_interval(mins => grace_minutes))
      < timezone('America/Guadeloupe', now())
    and not exists (
      select 1 from public.kafe_waiver_signatures s where s.reservation_ref = r.id
    );

  get diagnostics affected = row_count;
  return affected;
end;
$function$;

-- create_kafe_reservation
CREATE OR REPLACE FUNCTION private.create_kafe_reservation(p_value jsonb, p_date date, p_slot text, p_people integer)
RETURNS TABLE(id text, seating_unit_id text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare
  settings_value jsonb;
  duration_minutes integer;
  interval_minutes integer;
  chosen_unit text;
  new_id text;
  reservation_status text;
  manual_threshold integer;
begin
  if p_people < 1 then raise exception 'KAFE_INVALID_GROUP_SIZE'; end if;

  perform pg_advisory_xact_lock(hashtext('kafe-reservations-' || p_date::text));
  perform private.expire_kafe_no_shows();

  select value into settings_value from public.kafe_settings where public.kafe_settings.id = 'main';
  if settings_value is null then raise exception 'KAFE_SETTINGS_MISSING'; end if;

  duration_minutes := coalesce((settings_value ->> 'slotDurationMinutes')::integer, 120);
  interval_minutes := coalesce((settings_value ->> 'slotIntervalMinutes')::integer, 60);
  manual_threshold := coalesce((settings_value ->> 'manualConfirmationThreshold')::integer, 8);

  if p_date < timezone('America/Guadeloupe', now())::date then
    raise exception 'KAFE_INVALID_DATE';
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
    or coalesce((p_value ->> 'guideAccepted')::boolean, false) is not true
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
  ),
  occupancy as (
    select unit.unit_id, unit.capacity, coalesce(sum(existing.people), 0)::integer as used
    from units unit
    left join public.kafe_reservations existing
      on existing.seating_unit_id = unit.unit_id
      and existing.date = p_date and existing.status <> 'cancelled'
      and existing.slot::time < p_slot::time + make_interval(mins => duration_minutes)
      and existing.slot::time + make_interval(mins => duration_minutes) > p_slot::time
    group by unit.unit_id, unit.capacity
  )
  select unit_id into chosen_unit from occupancy
  where capacity - used >= p_people
  order by capacity - used - p_people, capacity, unit_id
  limit 1;

  if chosen_unit is null then raise exception 'KAFE_SLOT_FULL'; end if;

  new_id := coalesce(nullif(p_value ->> 'id', ''),
    'r' || extract(epoch from clock_timestamp())::bigint || '-' || replace(gen_random_uuid()::text, '-', ''));
  reservation_status := case when p_people >= manual_threshold then 'pending' else 'confirmed' end;

  insert into public.kafe_reservations (id, value, created_at, date, slot, people, status, seating_unit_id, updated_at)
  values (new_id,
    p_value || jsonb_build_object('id', new_id, 'status', reservation_status, 'seatingUnitId', chosen_unit,
      'people', p_people, 'date', p_date::text, 'slot', p_slot,
      'childrenAges', coalesce(p_value ->> 'childrenAges', ''),
      'message', coalesce(p_value ->> 'message', '')),
    coalesce((p_value ->> 'createdAt')::timestamptz, now()),
    p_date, p_slot, p_people, reservation_status, chosen_unit, now());

  return query select new_id, chosen_unit;
end;
$function$;

-- create_kafe_walk_in
CREATE OR REPLACE FUNCTION private.create_kafe_walk_in(p_date date, p_slot text, p_people integer, p_seating_unit_id text, p_label text DEFAULT NULL::text)
RETURNS TABLE(id text, seating_unit_id text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare
  settings_value jsonb;
  duration_minutes integer;
  unit_capacity integer;
  used_capacity integer;
  new_id text;
  display_label text;
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

  insert into public.kafe_reservations (id, value, created_at, date, slot, people, status, seating_unit_id, updated_at)
  values (new_id,
    jsonb_build_object('id', new_id, 'createdAt', now(), 'experience', 'atelier', 'people', p_people,
      'date', p_date::text, 'slot', p_slot, 'firstName', display_label, 'lastName', '',
      'phone', '', 'email', '', 'childrenAges', 'Non renseigné', 'guideAccepted', false,
      'message', 'Ajouté sur place par l''équipe.', 'depositPaid', false,
      'depositRequired', false, 'depositAmount', 0, 'status', 'arrived',
      'seatingUnitId', p_seating_unit_id, 'source', 'walk_in', 'walkInLabel', display_label),
    now(), p_date, p_slot, p_people, 'arrived', p_seating_unit_id, now());

  return query select new_id, p_seating_unit_id;
end;
$function$;

-- decide_kafe_group_reservation
CREATE OR REPLACE FUNCTION private.decide_kafe_group_reservation(p_id text, p_approved boolean, p_message text DEFAULT NULL::text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare
  current_value jsonb;
  next_status text;
  next_value jsonb;
begin
  if not private.is_kafe_admin() then raise exception 'KAFE_ADMIN_REQUIRED'; end if;

  select value into current_value from public.kafe_reservations where id = p_id for update;
  if current_value is null then raise exception 'KAFE_RESERVATION_NOT_FOUND'; end if;

  next_status := case when p_approved then 'confirmed' else 'cancelled' end;
  next_value := current_value || jsonb_build_object(
    'status', next_status,
    'decisionMessage', case when p_approved then '' else coalesce(trim(p_message), '') end,
    'decisionAt', now(), 'decisionBy', auth.uid());

  update public.kafe_reservations
  set status = next_status, value = next_value, updated_at = now()
  where id = p_id;

  return next_value;
end;
$function$;

-- enforce_kafe_reservation_deposit (trigger function)
CREATE OR REPLACE FUNCTION private.enforce_kafe_reservation_deposit()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare
  settings_value jsonb;
  deposit_threshold integer;
  fixed_amount numeric;
  is_walk_in boolean;
  requires_deposit boolean;
begin
  select value into settings_value from public.kafe_settings where public.kafe_settings.id = 'main';
  deposit_threshold := coalesce((settings_value ->> 'depositThreshold')::integer, 8);
  fixed_amount := coalesce((settings_value ->> 'depositFixedAmount')::numeric, 100);
  is_walk_in := coalesce(new.value ->> 'source', '') = 'walk_in';
  requires_deposit := not is_walk_in and new.people >= deposit_threshold;
  new.value := new.value || jsonb_build_object(
    'depositRequired', requires_deposit,
    'depositAmount', case when requires_deposit then fixed_amount else 0 end,
    'depositPaid', case when requires_deposit then coalesce((new.value ->> 'depositPaid')::boolean, false) else false end,
    'isGroupRequest', requires_deposit);
  return new;
end;
$function$;

-- mark_kafe_reservation_arrived (trigger fn, move to private too for consistency)
CREATE OR REPLACE FUNCTION private.mark_kafe_reservation_arrived()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
begin
  if new.reservation_ref is not null then
    update public.kafe_reservations r
    set status = 'arrived',
        value = jsonb_set(r.value, '{status}', '"arrived"'::jsonb, true),
        updated_at = now()
    where r.id = new.reservation_ref and r.status <> 'cancelled';
  end if;
  return new;
end;
$function$;

-- 2. Rewire triggers to private functions
DROP TRIGGER IF EXISTS enforce_kafe_reservation_deposit_on_insert ON public.kafe_reservations;
CREATE TRIGGER enforce_kafe_reservation_deposit_on_insert
  BEFORE INSERT ON public.kafe_reservations
  FOR EACH ROW EXECUTE FUNCTION private.enforce_kafe_reservation_deposit();

DROP TRIGGER IF EXISTS mark_kafe_reservation_arrived_on_signature ON public.kafe_waiver_signatures;
CREATE TRIGGER mark_kafe_reservation_arrived_on_signature
  AFTER INSERT ON public.kafe_waiver_signatures
  FOR EACH ROW EXECUTE FUNCTION private.mark_kafe_reservation_arrived();

-- 3. Drop the old public DEFINER functions
DROP FUNCTION IF EXISTS public.get_kafe_slot_occupancy(date, date);
DROP FUNCTION IF EXISTS public.create_kafe_reservation(jsonb, date, text, integer);
DROP FUNCTION IF EXISTS public.create_kafe_walk_in(date, text, integer, text, text);
DROP FUNCTION IF EXISTS public.decide_kafe_group_reservation(text, boolean, text);
DROP FUNCTION IF EXISTS public.expire_kafe_no_shows();
DROP FUNCTION IF EXISTS public.enforce_kafe_reservation_deposit();
DROP FUNCTION IF EXISTS public.mark_kafe_reservation_arrived();

-- 4. Recreate as SECURITY INVOKER wrappers in public

CREATE OR REPLACE FUNCTION public.get_kafe_slot_occupancy(from_date date, to_date date)
RETURNS TABLE(reservation_id text, date text, slot text, people integer, seating_unit_id text)
LANGUAGE sql SECURITY INVOKER SET search_path TO 'public'
AS $$ select * from private.get_kafe_slot_occupancy(from_date, to_date); $$;

CREATE OR REPLACE FUNCTION public.create_kafe_reservation(p_value jsonb, p_date date, p_slot text, p_people integer)
RETURNS TABLE(id text, seating_unit_id text)
LANGUAGE sql SECURITY INVOKER SET search_path TO 'public'
AS $$ select * from private.create_kafe_reservation(p_value, p_date, p_slot, p_people); $$;

CREATE OR REPLACE FUNCTION public.create_kafe_walk_in(p_date date, p_slot text, p_people integer, p_seating_unit_id text, p_label text DEFAULT NULL::text)
RETURNS TABLE(id text, seating_unit_id text)
LANGUAGE sql SECURITY INVOKER SET search_path TO 'public'
AS $$ select * from private.create_kafe_walk_in(p_date, p_slot, p_people, p_seating_unit_id, p_label); $$;

CREATE OR REPLACE FUNCTION public.decide_kafe_group_reservation(p_id text, p_approved boolean, p_message text DEFAULT NULL::text)
RETURNS jsonb
LANGUAGE sql SECURITY INVOKER SET search_path TO 'public'
AS $$ select private.decide_kafe_group_reservation(p_id, p_approved, p_message); $$;

-- 5. Lock down execution rights
REVOKE ALL ON FUNCTION public.get_kafe_slot_occupancy(date, date) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_kafe_reservation(jsonb, date, text, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_kafe_walk_in(date, text, integer, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.decide_kafe_group_reservation(text, boolean, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_kafe_slot_occupancy(date, date) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_kafe_reservation(jsonb, date, text, integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_kafe_walk_in(date, text, integer, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.decide_kafe_group_reservation(text, boolean, text) TO authenticated;

-- Private helpers must be callable by the wrappers (SECURITY INVOKER)
REVOKE ALL ON FUNCTION private.get_kafe_slot_occupancy(date, date) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.create_kafe_reservation(jsonb, date, text, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.create_kafe_walk_in(date, text, integer, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.decide_kafe_group_reservation(text, boolean, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.expire_kafe_no_shows() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION private.get_kafe_slot_occupancy(date, date) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION private.create_kafe_reservation(jsonb, date, text, integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION private.create_kafe_walk_in(date, text, integer, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION private.decide_kafe_group_reservation(text, boolean, text) TO authenticated;

-- 6. Storage: prevent listing files in the public documents bucket.
-- Direct URLs under /object/public/kafe-documents/... keep working because the bucket is marked public.
DROP POLICY IF EXISTS "Public can read Kafe documents" ON storage.objects;
