-- Customer reservation portal, consistent atelier rules and controlled admin onboarding.

create extension if not exists pgcrypto;

update public.kafe_reservations
set value = value || jsonb_build_object('managementToken', gen_random_uuid()::text),
    updated_at = now()
where coalesce(value ->> 'managementToken', '') = '';

update public.kafe_reservations
set status = case when status = 'pending' then 'confirmed' else status end,
    value = value || jsonb_build_object(
      'status', case when status = 'pending' then 'confirmed' else status end,
      'isGroupRequest', false,
      'depositRequired', false,
      'depositPaid', false,
      'depositAmount', 0
    ),
    updated_at = now()
where value ->> 'experience' = 'brunch_atelier';

create unique index if not exists kafe_reservations_management_token_idx
  on public.kafe_reservations ((value ->> 'managementToken'));

create or replace function private.normalize_kafe_reservation_insert()
returns trigger
language plpgsql security definer set search_path = public
as $function$
declare
  settings_value jsonb;
  threshold integer;
  deposit_amount numeric;
  experience_value text;
  is_ceramic boolean;
begin
  if coalesce(new.value ->> 'managementToken', '') = '' then
    new.value := new.value || jsonb_build_object('managementToken', gen_random_uuid()::text);
  end if;

  if coalesce(new.value ->> 'source', 'online') = 'walk_in' then
    return new;
  end if;

  select value into settings_value from public.kafe_settings where id = 'main';
  threshold := coalesce((settings_value ->> 'manualConfirmationThreshold')::integer, 8);
  deposit_amount := coalesce((settings_value ->> 'depositFixedAmount')::numeric, 100);
  experience_value := coalesce(new.value ->> 'experience', 'cafe_atelier');
  is_ceramic := experience_value <> 'brunch_atelier';

  if is_ceramic and new.people >= threshold then
    new.status := 'pending';
    new.value := new.value || jsonb_build_object(
      'status', 'pending',
      'isGroupRequest', true,
      'depositRequired', true,
      'depositPaid', false,
      'depositAmount', deposit_amount
    );
  else
    new.status := 'confirmed';
    new.value := new.value || jsonb_build_object(
      'status', 'confirmed',
      'isGroupRequest', false,
      'depositRequired', false,
      'depositPaid', false,
      'depositAmount', 0
    );
  end if;

  return new;
end;
$function$;

drop trigger if exists enforce_kafe_reservation_deposit_on_insert on public.kafe_reservations;
drop trigger if exists normalize_kafe_reservation_insert on public.kafe_reservations;
create trigger normalize_kafe_reservation_insert
before insert on public.kafe_reservations
for each row execute function private.normalize_kafe_reservation_insert();

create or replace function private.get_kafe_reservation_by_token(p_token text)
returns jsonb
language plpgsql security definer set search_path = public
as $function$
declare
  reservation_row public.kafe_reservations%rowtype;
  settings_value jsonb;
  notice_hours integer;
  reservation_at timestamptz;
  deadline_at timestamptz;
  safe_value jsonb;
begin
  if coalesce(trim(p_token), '') = '' then raise exception 'KAFE_INVALID_MANAGEMENT_TOKEN'; end if;

  select * into reservation_row
  from public.kafe_reservations
  where value ->> 'managementToken' = p_token
  limit 1;
  if not found then raise exception 'KAFE_RESERVATION_NOT_FOUND'; end if;

  select value into settings_value from public.kafe_settings where id = 'main';
  notice_hours := case
    when coalesce((reservation_row.value ->> 'depositRequired')::boolean, false)
      then coalesce((settings_value ->> 'groupDepositForfeitHours')::integer, 24)
    else coalesce((settings_value ->> 'cancellationNoticeHours')::integer, 48)
  end;
  reservation_at := (reservation_row.date::text || ' ' || reservation_row.slot)::timestamp
    at time zone 'America/Guadeloupe';
  deadline_at := reservation_at - make_interval(hours => notice_hours);
  safe_value := reservation_row.value
    - 'managementToken'
    - 'reservationCreatedEmailSentAt'
    - 'adminAlertEmailSentAt'
    - 'cancellationEmailSentAt'
    - 'adminCancellationAlertEmailSentAt'
    - 'decisionEmailSentAt'
    - 'reminderEmailSentAt';

  return jsonb_build_object(
    'reservation', safe_value || jsonb_build_object(
      'id', reservation_row.id,
      'date', reservation_row.date::text,
      'slot', reservation_row.slot,
      'people', reservation_row.people,
      'status', reservation_row.status
    ),
    'canCancel', reservation_row.status not in ('cancelled', 'arrived') and now() <= deadline_at,
    'cancellationDeadline', deadline_at,
    'cancellationNoticeHours', notice_hours,
    'paymentEnabled', coalesce((settings_value ->> 'sumupPaymentsEnabled')::boolean, false)
  );
end;
$function$;

create or replace function private.cancel_kafe_reservation_by_token(p_token text)
returns jsonb
language plpgsql security definer set search_path = public
as $function$
declare
  reservation_row public.kafe_reservations%rowtype;
  portal jsonb;
begin
  if coalesce(trim(p_token), '') = '' then raise exception 'KAFE_INVALID_MANAGEMENT_TOKEN'; end if;
  select * into reservation_row
  from public.kafe_reservations
  where value ->> 'managementToken' = p_token
  for update;
  if not found then raise exception 'KAFE_RESERVATION_NOT_FOUND'; end if;

  portal := private.get_kafe_reservation_by_token(p_token);
  if reservation_row.status in ('cancelled', 'arrived') then
    return portal;
  end if;
  if coalesce((portal ->> 'canCancel')::boolean, false) is not true then
    raise exception 'KAFE_CANCELLATION_DEADLINE';
  end if;

  update public.kafe_reservations
  set status = 'cancelled',
      value = value || jsonb_build_object(
        'status', 'cancelled',
        'cancelledAt', now(),
        'cancelledBy', 'customer'
      ),
      updated_at = now()
  where id = reservation_row.id;

  return private.get_kafe_reservation_by_token(p_token);
end;
$function$;

create or replace function public.get_kafe_reservation_by_token(p_token text)
returns jsonb
language sql security invoker set search_path = public
as $$ select private.get_kafe_reservation_by_token(p_token); $$;

create or replace function public.cancel_kafe_reservation_by_token(p_token text)
returns jsonb
language sql security invoker set search_path = public
as $$ select private.cancel_kafe_reservation_by_token(p_token); $$;

revoke all on function private.get_kafe_reservation_by_token(text) from public;
revoke all on function private.cancel_kafe_reservation_by_token(text) from public;
revoke all on function public.get_kafe_reservation_by_token(text) from public;
revoke all on function public.cancel_kafe_reservation_by_token(text) from public;
grant execute on function private.get_kafe_reservation_by_token(text) to anon, authenticated;
grant execute on function private.cancel_kafe_reservation_by_token(text) to anon, authenticated;
grant execute on function public.get_kafe_reservation_by_token(text) to anon, authenticated;
grant execute on function public.cancel_kafe_reservation_by_token(text) to anon, authenticated;

create table if not exists public.kafe_admin_access_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  email text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  requested_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by uuid references auth.users(id) on delete set null
);

create table if not exists public.kafe_admin_notifications (
  id bigint generated by default as identity primary key,
  kind text not null,
  title text not null,
  body text not null default '',
  reservation_id text references public.kafe_reservations(id) on delete cascade,
  access_request_id uuid references public.kafe_admin_access_requests(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.kafe_admin_notification_reads (
  notification_id bigint not null references public.kafe_admin_notifications(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (notification_id, user_id)
);

alter table public.kafe_admin_access_requests enable row level security;
alter table public.kafe_admin_notifications enable row level security;
alter table public.kafe_admin_notification_reads enable row level security;

drop policy if exists "Users can read own admin request" on public.kafe_admin_access_requests;
create policy "Users can read own admin request" on public.kafe_admin_access_requests
for select to authenticated using (user_id = auth.uid() or private.is_kafe_admin());

drop policy if exists "Admins can read notifications" on public.kafe_admin_notifications;
create policy "Admins can read notifications" on public.kafe_admin_notifications
for select to authenticated using (private.is_kafe_admin());

drop policy if exists "Admins can read notification receipts" on public.kafe_admin_notification_reads;
create policy "Admins can read notification receipts" on public.kafe_admin_notification_reads
for select to authenticated using (private.is_kafe_admin());

grant select on public.kafe_admin_access_requests to authenticated;
grant select on public.kafe_admin_notifications to authenticated;
grant select on public.kafe_admin_notification_reads to authenticated;

create or replace function private.handle_new_kafe_admin_user()
returns trigger
language plpgsql security definer set search_path = public
as $function$
begin
  insert into public.kafe_admin_access_requests(user_id, email, status)
  values (new.id, coalesce(new.email, ''), 'pending')
  on conflict (user_id) do update
    set email = excluded.email,
        status = case
          when public.kafe_admin_access_requests.status = 'approved' then 'approved'
          else 'pending'
        end,
        requested_at = now();
  return new;
end;
$function$;

drop trigger if exists kafe_admin_access_request_on_signup on auth.users;
create trigger kafe_admin_access_request_on_signup
after insert on auth.users
for each row execute function private.handle_new_kafe_admin_user();

insert into public.kafe_admin_access_requests(user_id, email, status)
select user_record.id, coalesce(user_record.email, ''), 'pending'
from auth.users user_record
left join public.kafe_admin_profiles profile on profile.user_id = user_record.id
left join public.kafe_admin_access_requests request on request.user_id = user_record.id
where profile.user_id is null and request.user_id is null;

create or replace function private.approve_kafe_admin_request(p_request_id uuid)
returns jsonb
language plpgsql security definer set search_path = public
as $function$
declare request_row public.kafe_admin_access_requests%rowtype;
begin
  if private.is_kafe_admin() is not true then raise exception 'KAFE_ADMIN_REQUIRED'; end if;
  select * into request_row from public.kafe_admin_access_requests where id = p_request_id for update;
  if not found then raise exception 'KAFE_REQUEST_NOT_FOUND'; end if;

  insert into public.kafe_admin_profiles(user_id, email, role, updated_at)
  values (request_row.user_id, request_row.email, 'manager', now())
  on conflict (user_id) do update set email = excluded.email, role = 'manager', updated_at = now();
  update public.kafe_admin_access_requests
  set status = 'approved', decided_at = now(), decided_by = auth.uid()
  where id = p_request_id;
  return jsonb_build_object('ok', true, 'userId', request_row.user_id, 'email', request_row.email);
end;
$function$;

create or replace function private.reject_kafe_admin_request(p_request_id uuid)
returns jsonb
language plpgsql security definer set search_path = public
as $function$
begin
  if private.is_kafe_admin() is not true then raise exception 'KAFE_ADMIN_REQUIRED'; end if;
  update public.kafe_admin_access_requests
  set status = 'rejected', decided_at = now(), decided_by = auth.uid()
  where id = p_request_id;
  if not found then raise exception 'KAFE_REQUEST_NOT_FOUND'; end if;
  return jsonb_build_object('ok', true);
end;
$function$;

create or replace function private.revoke_kafe_admin_access(p_user_id uuid)
returns jsonb
language plpgsql security definer set search_path = public
as $function$
declare target_role text;
begin
  if private.is_kafe_admin() is not true then raise exception 'KAFE_ADMIN_REQUIRED'; end if;
  if p_user_id = auth.uid() then raise exception 'KAFE_CANNOT_REVOKE_SELF'; end if;
  select role into target_role from public.kafe_admin_profiles where user_id = p_user_id;
  if target_role = 'owner' then raise exception 'KAFE_CANNOT_REVOKE_OWNER'; end if;
  delete from public.kafe_admin_profiles where user_id = p_user_id;
  update public.kafe_admin_access_requests
  set status = 'rejected', decided_at = now(), decided_by = auth.uid()
  where user_id = p_user_id;
  return jsonb_build_object('ok', true);
end;
$function$;

create or replace function public.approve_kafe_admin_request(p_request_id uuid)
returns jsonb language sql security invoker set search_path = public
as $$ select private.approve_kafe_admin_request(p_request_id); $$;
create or replace function public.reject_kafe_admin_request(p_request_id uuid)
returns jsonb language sql security invoker set search_path = public
as $$ select private.reject_kafe_admin_request(p_request_id); $$;
create or replace function public.revoke_kafe_admin_access(p_user_id uuid)
returns jsonb language sql security invoker set search_path = public
as $$ select private.revoke_kafe_admin_access(p_user_id); $$;

revoke all on function public.approve_kafe_admin_request(uuid) from public;
revoke all on function public.reject_kafe_admin_request(uuid) from public;
revoke all on function public.revoke_kafe_admin_access(uuid) from public;
grant execute on function public.approve_kafe_admin_request(uuid) to authenticated;
grant execute on function public.reject_kafe_admin_request(uuid) to authenticated;
grant execute on function public.revoke_kafe_admin_access(uuid) to authenticated;

create or replace function private.notify_kafe_reservation_change()
returns trigger
language plpgsql security definer set search_path = public
as $function$
declare group_request boolean;
begin
  if tg_op = 'INSERT' then
    group_request := coalesce((new.value ->> 'isGroupRequest')::boolean, false);
    insert into public.kafe_admin_notifications(kind, title, body, reservation_id)
    values (
      case when group_request then 'group_request' else 'reservation_created' end,
      case when group_request then 'Nouvelle demande de groupe' else 'Nouvelle réservation' end,
      coalesce(new.value ->> 'firstName', '') || ' ' || coalesce(new.value ->> 'lastName', '') ||
        ' · ' || new.people || ' pers. · ' || new.date::text || ' à ' || new.slot,
      new.id
    );
  elsif old.status is distinct from new.status and new.status = 'cancelled' then
    insert into public.kafe_admin_notifications(kind, title, body, reservation_id)
    values (
      'reservation_cancelled',
      'Réservation annulée',
      coalesce(new.value ->> 'firstName', '') || ' ' || coalesce(new.value ->> 'lastName', '') ||
        ' · ' || new.date::text || ' à ' || new.slot,
      new.id
    );
  end if;
  return new;
end;
$function$;

drop trigger if exists notify_kafe_reservation_change on public.kafe_reservations;
create trigger notify_kafe_reservation_change
after insert or update of status on public.kafe_reservations
for each row execute function private.notify_kafe_reservation_change();

create or replace function private.notify_kafe_admin_access_request()
returns trigger
language plpgsql security definer set search_path = public
as $function$
begin
  if new.status = 'pending' and (tg_op = 'INSERT' or old.status is distinct from new.status) then
    insert into public.kafe_admin_notifications(kind, title, body, access_request_id)
    values ('admin_access_requested', 'Nouvelle demande d’accès', new.email, new.id);
  end if;
  return new;
end;
$function$;

drop trigger if exists notify_kafe_admin_access_request on public.kafe_admin_access_requests;
create trigger notify_kafe_admin_access_request
after insert or update of status on public.kafe_admin_access_requests
for each row execute function private.notify_kafe_admin_access_request();

create or replace function private.get_kafe_admin_notifications(p_limit integer default 20)
returns table(
  id bigint,
  kind text,
  title text,
  body text,
  reservation_id text,
  access_request_id uuid,
  created_at timestamptz,
  is_read boolean
)
language sql security definer set search_path = public
as $function$
  select notification.id, notification.kind, notification.title, notification.body,
    notification.reservation_id, notification.access_request_id, notification.created_at,
    exists (
      select 1 from public.kafe_admin_notification_reads receipt
      where receipt.notification_id = notification.id and receipt.user_id = auth.uid()
    ) as is_read
  from public.kafe_admin_notifications notification
  where private.is_kafe_admin()
  order by notification.created_at desc
  limit greatest(1, least(coalesce(p_limit, 20), 100));
$function$;

create or replace function private.mark_kafe_notification_read(p_notification_id bigint)
returns void
language plpgsql security definer set search_path = public
as $function$
begin
  if private.is_kafe_admin() is not true then raise exception 'KAFE_ADMIN_REQUIRED'; end if;
  insert into public.kafe_admin_notification_reads(notification_id, user_id)
  values (p_notification_id, auth.uid())
  on conflict (notification_id, user_id) do update set read_at = now();
end;
$function$;

create or replace function public.get_kafe_admin_notifications(p_limit integer default 20)
returns table(id bigint, kind text, title text, body text, reservation_id text,
  access_request_id uuid, created_at timestamptz, is_read boolean)
language sql security invoker set search_path = public
as $$ select * from private.get_kafe_admin_notifications(p_limit); $$;
create or replace function public.mark_kafe_notification_read(p_notification_id bigint)
returns void language sql security invoker set search_path = public
as $$ select private.mark_kafe_notification_read(p_notification_id); $$;

revoke all on function public.get_kafe_admin_notifications(integer) from public;
revoke all on function public.mark_kafe_notification_read(bigint) from public;
grant execute on function public.get_kafe_admin_notifications(integer) to authenticated;
grant execute on function public.mark_kafe_notification_read(bigint) to authenticated;
