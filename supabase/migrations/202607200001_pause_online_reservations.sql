update public.kafe_settings
set value = value || jsonb_build_object(
  'configurationVersion', 8,
  'reservationsEnabled', false,
  'reservationPauseMessage', ''
), updated_at = now()
where id = 'main';

create or replace function private.enforce_kafe_reservations_enabled()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  settings_value jsonb;
  reservations_enabled boolean;
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

  reservations_enabled := coalesce(
    (settings_value ->> 'reservationsEnabled')::boolean,
    true
  );

  if not reservations_enabled then
    raise exception 'KAFE_RESERVATIONS_PAUSED';
  end if;

  return new;
end;
$function$;

drop trigger if exists enforce_kafe_reservations_enabled on public.kafe_reservations;
create trigger enforce_kafe_reservations_enabled
before insert on public.kafe_reservations
for each row execute function private.enforce_kafe_reservations_enabled();
