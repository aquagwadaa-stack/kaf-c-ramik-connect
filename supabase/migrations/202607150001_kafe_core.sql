create extension if not exists pgcrypto;

create table if not exists public.kafe_settings (
  id text primary key default 'main',
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.kafe_ceramic_objects (
  id text primary key,
  value jsonb not null,
  sort_order integer,
  updated_at timestamptz not null default now()
);

create table if not exists public.kafe_content_documents (
  id text primary key,
  value jsonb not null,
  sort_order integer,
  updated_at timestamptz not null default now()
);

create table if not exists public.kafe_reservations (
  id text primary key default ('r' || extract(epoch from clock_timestamp())::bigint || '-' || encode(gen_random_bytes(4), 'hex')),
  value jsonb not null,
  created_at timestamptz not null default now(),
  date date not null,
  slot text not null,
  people integer not null check (people > 0),
  status text not null check (status in ('pending', 'deposit_paid', 'confirmed', 'cancelled')),
  updated_at timestamptz not null default now()
);

create table if not exists public.kafe_waiver_signatures (
  id text primary key,
  value jsonb not null,
  reservation_ref text,
  document_version text,
  signed_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.kafe_settings enable row level security;
alter table public.kafe_ceramic_objects enable row level security;
alter table public.kafe_content_documents enable row level security;
alter table public.kafe_reservations enable row level security;
alter table public.kafe_waiver_signatures enable row level security;

drop policy if exists "Public can read kafe settings" on public.kafe_settings;
create policy "Public can read kafe settings"
  on public.kafe_settings for select
  using (true);

drop policy if exists "Admins can manage kafe settings" on public.kafe_settings;
create policy "Admins can manage kafe settings"
  on public.kafe_settings for all
  to authenticated
  using (true)
  with check (true);

drop policy if exists "Public can read ceramic objects" on public.kafe_ceramic_objects;
create policy "Public can read ceramic objects"
  on public.kafe_ceramic_objects for select
  using (true);

drop policy if exists "Admins can manage ceramic objects" on public.kafe_ceramic_objects;
create policy "Admins can manage ceramic objects"
  on public.kafe_ceramic_objects for all
  to authenticated
  using (true)
  with check (true);

drop policy if exists "Public can read published documents" on public.kafe_content_documents;
create policy "Public can read published documents"
  on public.kafe_content_documents for select
  using (true);

drop policy if exists "Admins can manage documents" on public.kafe_content_documents;
create policy "Admins can manage documents"
  on public.kafe_content_documents for all
  to authenticated
  using (true)
  with check (true);

drop policy if exists "Public can create reservations" on public.kafe_reservations;
create policy "Public can create reservations"
  on public.kafe_reservations for insert
  to anon, authenticated
  with check (true);

drop policy if exists "Admins can read reservations" on public.kafe_reservations;
create policy "Admins can read reservations"
  on public.kafe_reservations for select
  to authenticated
  using (true);

drop policy if exists "Admins can update reservations" on public.kafe_reservations;
create policy "Admins can update reservations"
  on public.kafe_reservations for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "Admins can manage waiver signatures" on public.kafe_waiver_signatures;
create policy "Admins can manage waiver signatures"
  on public.kafe_waiver_signatures for all
  to authenticated
  using (true)
  with check (true);

create or replace function public.get_kafe_slot_capacity(from_date date, to_date date)
returns table(date text, slot text, reserved_people integer)
language sql
security definer
set search_path = public
as $$
  select
    r.date::text,
    r.slot,
    coalesce(sum(r.people), 0)::integer as reserved_people
  from public.kafe_reservations r
  where r.date between from_date and to_date
    and r.status <> 'cancelled'
  group by r.date, r.slot
  order by r.date, r.slot;
$$;

grant execute on function public.get_kafe_slot_capacity(date, date) to anon, authenticated;

insert into public.kafe_settings (id, value)
values (
  'main',
  jsonb_build_object(
    'depositThreshold', 8,
    'depositPerPerson', 10,
    'defaultCapacity', 12,
    'slotDurationMinutes', 90,
    'slots', jsonb_build_array('09:30', '10:30', '11:30', '13:30', '14:30', '15:30', '16:30'),
    'closedWeekdays', jsonb_build_array(1),
    'manualConfirmationForGroups', true,
    'manualConfirmationThreshold', 8,
    'signatureRequiredOnArrival', true,
    'walkInCafeEnabled', true,
    'walkInNoticeText', 'Pas besoin de réserver pour boire un café, manger un bagel ou bruncher. Pour peindre, l''atelier se fait avec une consommation sur place et les personnes ayant réservé sont prioritaires.',
    'reservationConditionsText', 'Pour toute annulation, retard ou modification, merci de prévenir le Kafé dès que possible. Les règles définitives seront précisées par Mala Madre.',
    'guideAcceptanceText', 'J''ai pris connaissance des informations importantes de l''atelier et je m''engage à respecter le guide transmis par le Kafé Céramik.',
    'confirmationEmailText', 'Votre réservation est enregistrée. Le guide et les informations pratiques vous seront envoyés avant votre venue.'
  )
)
on conflict (id) do nothing;

insert into public.kafe_content_documents (id, value, sort_order)
values
  (
    'guide',
    jsonb_build_object(
      'id', 'guide',
      'title', 'Guide de peinture',
      'version', 'v1-demo',
      'updatedAt', now(),
      'body', 'Guide provisoire. Le texte officiel sera fourni par Mala Madre.'
    ),
    1
  ),
  (
    'waiver',
    jsonb_build_object(
      'id', 'waiver',
      'title', 'Décharge atelier',
      'version', 'v1-demo',
      'updatedAt', now(),
      'body', 'Décharge provisoire. Le texte officiel sera fourni par Mala Madre et validé par le client avant publication.'
    ),
    2
  )
on conflict (id) do nothing;
