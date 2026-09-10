create or replace function private.kafe_booking_time_allowed(
  p_date date, p_slot text, p_hours numeric, p_now timestamptz default now()
) returns boolean language sql stable set search_path = '' as $$
  select (p_date + p_slot::time) at time zone 'America/Guadeloupe' > p_now
    and (p_date + p_slot::time) at time zone 'America/Guadeloupe'
      >= p_now + greatest(coalesce(p_hours, 0), 0) * interval '1 hour';
$$;
revoke all on function private.kafe_booking_time_allowed(date,text,numeric,timestamptz) from public;

-- Preserve the existing allocation algorithm; replace only its obsolete date gate.
do $$
declare definition text;
  old_gate text := $old$if p_date < timezone('America/Guadeloupe', now())::date + minimum_lead_days then
    raise exception 'KAFE_BOOKING_TOO_LATE';
  end if;$old$;
begin
  select pg_get_functiondef('private.create_kafe_reservation(jsonb,date,text,integer)'::regprocedure) into definition;
  if strpos(definition, old_gate) = 0 then raise exception 'BOOKING_GATE_SOURCE_CHANGED'; end if;
  definition := replace(definition, old_gate, $new$if not private.kafe_booking_time_allowed(
    p_date, p_slot, coalesce((settings_value->>'minimumBookingLeadHours')::numeric, 0)
  ) then raise exception 'KAFE_BOOKING_TOO_LATE'; end if;$new$);
  execute definition;
end $$;

create or replace function private.enforce_kafe_booking_cutoff_and_quote()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  settings_value jsonb;
  manual_threshold integer;
  ceramic_rate numeric; meal_rate numeric;
  ceramic_min numeric; ceramic_max numeric; meal_min numeric; meal_max numeric;
begin
  if coalesce(new.value->>'source','online') = 'walk_in' then return new; end if;
  select value into settings_value from public.kafe_settings where id='main';
  if settings_value is null then raise exception 'KAFE_SETTINGS_MISSING'; end if;
  if not private.kafe_booking_time_allowed(new.date, new.slot,
    coalesce((settings_value->>'minimumBookingLeadHours')::numeric,0)) then
    raise exception 'KAFE_BOOKING_TOO_LATE';
  end if;
  manual_threshold := coalesce((settings_value->>'manualConfirmationThreshold')::integer,8);
  if new.people >= manual_threshold and coalesce(new.value->>'experience','cafe_atelier') <> 'brunch_atelier' then
    ceramic_rate := nullif(new.value->>'groupCeramicRatePerPerson','')::numeric;
    meal_rate := nullif(new.value->>'groupMealRatePerPerson','')::numeric;
    ceramic_min := coalesce((settings_value->>'groupCeramicRateMin')::numeric,18);
    ceramic_max := coalesce((settings_value->>'groupCeramicRateMax')::numeric,80);
    meal_min := coalesce((settings_value->>'groupMealRateMin')::numeric,15);
    meal_max := coalesce((settings_value->>'groupMealRateMax')::numeric,25);
    if ceramic_rate is null or ceramic_rate < ceramic_min or ceramic_rate > ceramic_max
      or meal_rate is null or meal_rate < meal_min or meal_rate > meal_max then
      raise exception 'KAFE_INVALID_GROUP_QUOTE';
    end if;
    new.value := new.value || jsonb_build_object('groupQuoteTotal',new.people*(ceramic_rate+meal_rate));
  end if;
  return new;
end $$;

update public.kafe_settings
set value = (value - 'minimumBookingLeadDays' - 'bookingCutoffTime') || '{"minimumBookingLeadHours":0}'::jsonb,
    updated_at=now()
where id='main';
