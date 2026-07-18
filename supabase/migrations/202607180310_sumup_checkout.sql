create table if not exists public.kafe_payments (
  id uuid primary key default gen_random_uuid(),
  reservation_id text not null unique references public.kafe_reservations(id) on delete cascade,
  provider text not null default 'sumup',
  provider_checkout_id text unique,
  checkout_reference text not null unique,
  amount numeric(10,2) not null,
  currency text not null default 'EUR',
  status text not null default 'PENDING' check (status in ('PENDING', 'PAID', 'FAILED', 'EXPIRED')),
  hosted_checkout_url text,
  provider_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  paid_at timestamptz
);

update public.kafe_settings
set value = value || jsonb_build_object(
  'sumupPaymentsEnabled', coalesce((value ->> 'sumupPaymentsEnabled')::boolean, false)
), updated_at = now()
where id = 'main';

alter table public.kafe_payments enable row level security;
drop policy if exists "Admins can read Kafe payments" on public.kafe_payments;
create policy "Admins can read Kafe payments" on public.kafe_payments
for select to authenticated using (private.is_kafe_admin());
grant select on public.kafe_payments to authenticated;

create or replace function private.expire_kafe_unpaid_reservations()
returns integer
language plpgsql security definer set search_path = public
as $function$
declare changed integer;
begin
  update public.kafe_reservations reservation
  set status = 'cancelled',
      value = reservation.value || jsonb_build_object(
        'status', 'cancelled',
        'cancelledAt', now(),
        'cancelledBy', 'payment_timeout'
      ),
      updated_at = now()
  where reservation.status = 'pending'
    and coalesce((reservation.value ->> 'depositRequired')::boolean, false)
    and coalesce((reservation.value ->> 'depositPaid')::boolean, false) is not true
    and reservation.created_at < now() - interval '35 minutes';
  get diagnostics changed = row_count;
  return changed;
end;
$function$;

create or replace function private.get_kafe_slot_occupancy(from_date date, to_date date)
returns table(reservation_id text, date text, slot text, people integer, seating_unit_id text)
language plpgsql security definer set search_path to 'public'
as $function$
begin
  perform private.expire_kafe_unpaid_reservations();
  perform private.expire_kafe_no_shows();
  return query
  select
    reservation.id,
    reservation.date::text,
    reservation.slot,
    coalesce((allocation.value ->> 'people')::integer, reservation.people),
    coalesce(allocation.value ->> 'unitId', reservation.seating_unit_id)
  from public.kafe_reservations reservation
  cross join lateral jsonb_array_elements(
    case
      when jsonb_typeof(reservation.value -> 'seatingAllocations') = 'array'
        and jsonb_array_length(reservation.value -> 'seatingAllocations') > 0
      then reservation.value -> 'seatingAllocations'
      else jsonb_build_array(jsonb_build_object(
        'unitId', reservation.seating_unit_id,
        'people', reservation.people
      ))
    end
  ) allocation(value)
  where reservation.date between from_date and to_date
    and reservation.status <> 'cancelled'
  order by reservation.date, reservation.slot, reservation.people desc;
end;
$function$;

revoke all on function private.expire_kafe_unpaid_reservations() from public;
