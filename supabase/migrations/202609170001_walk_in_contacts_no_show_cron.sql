-- Optional phone/email for reservations created by the team.
-- Keep the legacy 5-argument function for older deployed clients; the new
-- 7-argument overload is used by the current admin interface.

create or replace function private.create_kafe_walk_in(
  p_date date,
  p_slot text,
  p_people integer,
  p_seating_unit_id text,
  p_label text,
  p_phone text,
  p_email text
)
returns table(id text, seating_unit_id text)
language plpgsql
security definer
set search_path to ''
as $$
declare
  created_id text;
  created_unit text;
  cleaned_phone text := coalesce(trim(p_phone), '');
  cleaned_email text := lower(coalesce(trim(p_email), ''));
begin
  if cleaned_email <> '' and cleaned_email !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'KAFE_INVALID_EMAIL';
  end if;

  select created.id, created.seating_unit_id
    into created_id, created_unit
  from private.create_kafe_walk_in(
    p_date,
    p_slot,
    p_people,
    p_seating_unit_id,
    p_label
  ) created;

  update public.kafe_reservations
  set value = value || jsonb_build_object(
        'phone', cleaned_phone,
        'email', cleaned_email
      ),
      updated_at = now()
  where public.kafe_reservations.id = created_id;

  return query select created_id, created_unit;
end;
$$;

revoke all on function private.create_kafe_walk_in(date, text, integer, text, text, text, text) from public;
grant execute on function private.create_kafe_walk_in(date, text, integer, text, text, text, text) to authenticated;

create or replace function public.create_kafe_walk_in(
  p_date date,
  p_slot text,
  p_people integer,
  p_seating_unit_id text,
  p_label text,
  p_phone text,
  p_email text
)
returns table(id text, seating_unit_id text)
language sql
set search_path to 'public'
as $$
  select * from private.create_kafe_walk_in(
    p_date,
    p_slot,
    p_people,
    p_seating_unit_id,
    p_label,
    p_phone,
    p_email
  );
$$;

revoke all on function public.create_kafe_walk_in(date, text, integer, text, text, text, text) from public;
grant execute on function public.create_kafe_walk_in(date, text, integer, text, text, text, text) to anon, authenticated, service_role;

-- Expire no-shows even if nobody currently has the admin screen open.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron')
     and not exists (select 1 from cron.job where jobname = 'kafe-no-show-expiry') then
    perform cron.schedule(
      'kafe-no-show-expiry',
      '*/5 * * * *',
      $cron$select private.expire_kafe_no_shows();$cron$
    );
  end if;
end;
$$;
