update public.kafe_settings
set value = value || jsonb_build_object(
  'configurationVersion', 7,
  'minimumBookingLeadDays', 1,
  'bookingCutoffTime', '18:00',
  'adminNotificationEmail', 'ceramikkafe@gmail.com',
  'groupCeramicRateMin', 18,
  'groupCeramicRateMax', 80,
  'groupMealRateMin', 15,
  'groupMealRateMax', 25
), updated_at = now()
where id = 'main';

create or replace function private.enforce_kafe_booking_cutoff_and_quote()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  settings_value jsonb;
  local_now timestamp;
  minimum_lead_days integer;
  cutoff_time time;
  manual_threshold integer;
  ceramic_rate numeric;
  meal_rate numeric;
  ceramic_min numeric;
  ceramic_max numeric;
  meal_min numeric;
  meal_max numeric;
  quote_total numeric;
begin
  if coalesce(new.value ->> 'source', 'online') = 'walk_in' then
    return new;
  end if;

  select value into settings_value
  from public.kafe_settings
  where id = 'main';

  if settings_value is null then
    raise exception 'KAFE_SETTINGS_MISSING';
  end if;

  local_now := timezone('America/Guadeloupe', now());
  minimum_lead_days := greatest(
    coalesce((settings_value ->> 'minimumBookingLeadDays')::integer, 1),
    1
  );
  cutoff_time := coalesce((settings_value ->> 'bookingCutoffTime')::time, '18:00'::time);

  if new.date < local_now::date + minimum_lead_days then
    raise exception 'KAFE_BOOKING_TOO_LATE';
  end if;

  if minimum_lead_days = 1
    and new.date = local_now::date + 1
    and local_now::time >= cutoff_time
  then
    raise exception 'KAFE_BOOKING_TOO_LATE';
  end if;

  manual_threshold := coalesce((settings_value ->> 'manualConfirmationThreshold')::integer, 8);
  if new.people >= manual_threshold
    and coalesce(new.value ->> 'experience', 'cafe_atelier') <> 'brunch_atelier'
  then
    ceramic_rate := nullif(new.value ->> 'groupCeramicRatePerPerson', '')::numeric;
    meal_rate := nullif(new.value ->> 'groupMealRatePerPerson', '')::numeric;
    ceramic_min := coalesce((settings_value ->> 'groupCeramicRateMin')::numeric, 18);
    ceramic_max := coalesce((settings_value ->> 'groupCeramicRateMax')::numeric, 80);
    meal_min := coalesce((settings_value ->> 'groupMealRateMin')::numeric, 15);
    meal_max := coalesce((settings_value ->> 'groupMealRateMax')::numeric, 25);

    if ceramic_rate is null
      or ceramic_rate < ceramic_min
      or ceramic_rate > ceramic_max
      or meal_rate is null
      or meal_rate < meal_min
      or meal_rate > meal_max
    then
      raise exception 'KAFE_INVALID_GROUP_QUOTE';
    end if;

    quote_total := new.people * (ceramic_rate + meal_rate);
    new.value := new.value || jsonb_build_object('groupQuoteTotal', quote_total);
  end if;

  return new;
end;
$function$;

drop trigger if exists enforce_kafe_booking_cutoff_and_quote on public.kafe_reservations;
create trigger enforce_kafe_booking_cutoff_and_quote
before insert on public.kafe_reservations
for each row execute function private.enforce_kafe_booking_cutoff_and_quote();
