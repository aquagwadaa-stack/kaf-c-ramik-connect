update public.kafe_settings
set value = value || jsonb_build_object(
  'configurationVersion', 10,
  'depositThreshold', 10,
  'manualConfirmationThreshold', 10,
  'defaultCapacity', 60,
  'lateArrivalGraceMinutes', 30,
  'maximumVisitHours', 4,
  'walkInNoticeText', 'Réserve ta venue pour garantir ta place. Sans réservation, l''accueil reste possible uniquement selon les places disponibles, sans aucune garantie.',
  'reservationConditionsText', 'Annulation possible jusqu''à 48 h avant. Au-delà, merci d''appeler le Kafé. Une réservation est libérée après plus de 30 minutes de retard. Pour les groupes, l''acompte est conservé si l''annulation intervient moins de 24 h avant.',
  'voteOfMonth',
    coalesce(value -> 'voteOfMonth', '{}'::jsonb) || jsonb_build_object(
      'showResults', true,
      'entries',
      case
        when jsonb_array_length(coalesce(value -> 'voteOfMonth' -> 'entries', '[]'::jsonb)) = 0
        then jsonb_build_array(
          jsonb_build_object(
            'id', 'vote-demo-tortue',
            'title', 'Évasion tropicale',
            'artistName', 'Artiste du Kafé',
            'description', 'Une assiette fleurie inspirée de la Guadeloupe.',
            'imageUrl', '/creations/assiette-tortue.webp',
            'visible', true
          ),
          jsonb_build_object(
            'id', 'vote-demo-feuillage',
            'title', 'Feuillage bleu',
            'artistName', 'Artiste du Kafé',
            'description', 'Une tasse délicate peinte feuille après feuille.',
            'imageUrl', '/creations/tasse-feuillage.webp',
            'visible', true
          ),
          jsonb_build_object(
            'id', 'vote-demo-bateau',
            'title', 'Au large',
            'artistName', 'Artiste du Kafé',
            'description', 'Une grande pièce marine travaillée dans les bleus.',
            'imageUrl', '/creations/assiette-bateau.webp',
            'visible', true
          )
        )
        else value -> 'voteOfMonth' -> 'entries'
      end
    ),
  'seatingAreas', jsonb_build_array(
    jsonb_build_object(
      'id', 'carbet',
      'label', 'Carbet',
      'capacity', 12,
      'quantity', 1,
      'zone', 'carbet'
    ),
    jsonb_build_object(
      'id', 'pique-nique',
      'label', 'Table de pique-nique',
      'capacity', 5,
      'quantity', 8,
      'zone', 'exterieur'
    ),
    jsonb_build_object(
      'id', 'table-2',
      'label', 'Table de 2',
      'capacity', 2,
      'quantity', 2,
      'zone', 'interieur'
    ),
    jsonb_build_object(
      'id', 'salon-2',
      'label', 'Espace salon',
      'capacity', 2,
      'quantity', 2,
      'zone', 'interieur'
    )
  )
), updated_at = now()
where id = 'main';

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
  preferred_zone text;
begin
  if p_people < 1 then raise exception 'KAFE_INVALID_GROUP_SIZE'; end if;

  perform pg_advisory_xact_lock(hashtext('kafe-reservations-' || p_date::text));
  perform private.expire_kafe_no_shows();

  select value into settings_value from public.kafe_settings where public.kafe_settings.id = 'main';
  if settings_value is null then raise exception 'KAFE_SETTINGS_MISSING'; end if;

  duration_minutes := coalesce((settings_value ->> 'slotDurationMinutes')::integer, 120);
  interval_minutes := coalesce((settings_value ->> 'slotIntervalMinutes')::integer, 60);
  minimum_lead_days := greatest(coalesce((settings_value ->> 'minimumBookingLeadDays')::integer, 1), 0);
  manual_threshold := coalesce((settings_value ->> 'manualConfirmationThreshold')::integer, 10);
  experience_value := coalesce(p_value ->> 'experience', 'cafe_atelier');
  preferred_zone := coalesce(nullif(p_value ->> 'seatingPreference', ''), 'indifferent');
  if preferred_zone not in ('indifferent', 'interieur', 'exterieur', 'carbet') then
    raise exception 'KAFE_INVALID_SEATING_ZONE';
  end if;

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
      and mod(
        floor(extract(epoch from (p_slot::time - (schedule_rule ->> 'startTime')::time)) / 60)::integer,
        greatest(interval_minutes, 1)
      ) = 0
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
    where existing.date = p_date
      and existing.status <> 'cancelled'
      and existing.seating_unit_id is null
      and existing.slot::time < p_slot::time + make_interval(mins => duration_minutes)
      and existing.slot::time + make_interval(mins => duration_minutes) > p_slot::time
  ) then raise exception 'KAFE_SEATING_REVIEW_REQUIRED'; end if;

  with units as (
    select
      (area ->> 'id') || '-' || series.index as unit_id,
      (area ->> 'capacity')::integer as capacity,
      coalesce(area ->> 'zone', 'interieur') as zone
    from jsonb_array_elements(settings_value -> 'seatingAreas') area
    cross join lateral generate_series(
      1,
      greatest((area ->> 'quantity')::integer, 0)
    ) as series(index)
  ), eligible_units as (
    select * from units
    where preferred_zone = 'indifferent' or zone = preferred_zone
  ), occupancy as (
    select unit.unit_id, unit.capacity, coalesce(sum(existing.people), 0)::integer as used
    from eligible_units unit
    left join private.get_kafe_slot_occupancy(p_date, p_date) existing
      on existing.seating_unit_id = unit.unit_id
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
    allocations := jsonb_build_array(
      jsonb_build_object('unitId', chosen_unit, 'people', p_people)
    );
  elsif p_people >= manual_threshold then
    remaining_people := p_people;
    for unit_record in
      with units as (
        select
          (area ->> 'id') || '-' || series.index as unit_id,
          (area ->> 'capacity')::integer as capacity,
          coalesce(area ->> 'zone', 'interieur') as zone
        from jsonb_array_elements(settings_value -> 'seatingAreas') area
        cross join lateral generate_series(
          1,
          greatest((area ->> 'quantity')::integer, 0)
        ) as series(index)
      ), eligible_units as (
        select * from units
        where preferred_zone = 'indifferent' or zone = preferred_zone
      ), occupancy as (
        select unit.unit_id, unit.capacity, coalesce(sum(existing.people), 0)::integer as used
        from eligible_units unit
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

  new_id := coalesce(
    nullif(p_value ->> 'id', ''),
    'r' || extract(epoch from clock_timestamp())::bigint || '-' ||
      replace(gen_random_uuid()::text, '-', '')
  );
  reservation_status := case
    when experience_value <> 'brunch_atelier' and p_people >= manual_threshold then 'pending'
    else 'confirmed'
  end;

  insert into public.kafe_reservations (
    id, value, created_at, date, slot, people, status, seating_unit_id, updated_at
  ) values (
    new_id,
    p_value || jsonb_build_object(
      'id', new_id,
      'status', reservation_status,
      'seatingUnitId', chosen_unit,
      'seatingAllocations', allocations,
      'seatingPreference', preferred_zone,
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
$function$;
