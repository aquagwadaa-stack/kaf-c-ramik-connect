create or replace function private.notify_kafe_reservation_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare
  group_request boolean;
begin
  if tg_op = 'INSERT' then
    group_request := coalesce((new.value ->> 'isGroupRequest')::boolean, false);
    insert into public.kafe_admin_notifications(kind, title, body, reservation_id)
    values (
      case when group_request then 'group_request' else 'reservation_created' end,
      case
        when group_request then 'Nouvelle demande de groupe'
        else U&'Nouvelle r\00E9servation'
      end,
      coalesce(new.value ->> 'firstName', '') || ' ' || coalesce(new.value ->> 'lastName', '') ||
        U&' \00B7 ' || new.people || U&' pers. \00B7 ' || new.date::text || U&' \00E0 ' || new.slot,
      new.id
    );
  elsif old.status is distinct from new.status and new.status = 'cancelled' then
    insert into public.kafe_admin_notifications(kind, title, body, reservation_id)
    values (
      'reservation_cancelled',
      U&'R\00E9servation annul\00E9e',
      coalesce(new.value ->> 'firstName', '') || ' ' || coalesce(new.value ->> 'lastName', '') ||
        U&' \00B7 ' || new.date::text || U&' \00E0 ' || new.slot,
      new.id
    );
  end if;
  return new;
end;
$function$;

create or replace function private.notify_kafe_admin_access_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
begin
  if new.status = 'pending' and (tg_op = 'INSERT' or old.status is distinct from new.status) then
    insert into public.kafe_admin_notifications(kind, title, body, access_request_id)
    values ('admin_access_requested', U&'Nouvelle demande d\2019acc\00E8s', new.email, new.id);
  end if;
  return new;
end;
$function$;

update public.kafe_admin_notifications notification
set
  title = case notification.kind
    when 'reservation_created' then U&'Nouvelle r\00E9servation'
    when 'group_request' then 'Nouvelle demande de groupe'
    when 'reservation_cancelled' then U&'R\00E9servation annul\00E9e'
    else notification.title
  end,
  body = coalesce(reservation.value ->> 'firstName', '') || ' ' ||
    coalesce(reservation.value ->> 'lastName', '') ||
    case
      when notification.kind in ('reservation_created', 'group_request')
        then U&' \00B7 ' || reservation.people || U&' pers. \00B7 '
      else U&' \00B7 '
    end || reservation.date::text || U&' \00E0 ' || reservation.slot
from public.kafe_reservations reservation
where notification.reservation_id = reservation.id
  and notification.kind in ('reservation_created', 'group_request', 'reservation_cancelled');

update public.kafe_admin_notifications
set title = U&'Nouvelle demande d\2019acc\00E8s'
where kind = 'admin_access_requested';
