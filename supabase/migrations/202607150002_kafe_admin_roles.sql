create table if not exists public.kafe_admin_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text,
  role text not null default 'manager' check (role in ('owner', 'manager', 'team', 'readonly')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.kafe_admin_profiles enable row level security;

create or replace function public.is_kafe_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.kafe_admin_profiles profile
    where profile.user_id = auth.uid()
  );
$$;

create or replace function public.get_current_kafe_admin()
returns table(email text, role text)
language sql
stable
security definer
set search_path = public
as $$
  select profile.email, profile.role
  from public.kafe_admin_profiles profile
  where profile.user_id = auth.uid();
$$;

create or replace function public.is_kafe_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.kafe_admin_profiles profile
    where profile.user_id = auth.uid()
      and profile.role = 'owner'
  );
$$;

grant execute on function public.is_kafe_admin() to authenticated;
grant execute on function public.get_current_kafe_admin() to authenticated;
grant execute on function public.is_kafe_owner() to authenticated;

drop policy if exists "Admins can read admin profiles" on public.kafe_admin_profiles;
create policy "Admins can read admin profiles"
  on public.kafe_admin_profiles for select
  to authenticated
  using (public.is_kafe_admin());

drop policy if exists "Owners can manage admin profiles" on public.kafe_admin_profiles;
create policy "Owners can manage admin profiles"
  on public.kafe_admin_profiles for all
  to authenticated
  using (public.is_kafe_owner())
  with check (public.is_kafe_owner());

drop policy if exists "Admins can manage kafe settings" on public.kafe_settings;
create policy "Admins can manage kafe settings"
  on public.kafe_settings for all
  to authenticated
  using (public.is_kafe_admin())
  with check (public.is_kafe_admin());

drop policy if exists "Admins can manage ceramic objects" on public.kafe_ceramic_objects;
create policy "Admins can manage ceramic objects"
  on public.kafe_ceramic_objects for all
  to authenticated
  using (public.is_kafe_admin())
  with check (public.is_kafe_admin());

drop policy if exists "Admins can manage documents" on public.kafe_content_documents;
create policy "Admins can manage documents"
  on public.kafe_content_documents for all
  to authenticated
  using (public.is_kafe_admin())
  with check (public.is_kafe_admin());

drop policy if exists "Admins can read reservations" on public.kafe_reservations;
create policy "Admins can read reservations"
  on public.kafe_reservations for select
  to authenticated
  using (public.is_kafe_admin());

drop policy if exists "Admins can update reservations" on public.kafe_reservations;
create policy "Admins can update reservations"
  on public.kafe_reservations for update
  to authenticated
  using (public.is_kafe_admin())
  with check (public.is_kafe_admin());

drop policy if exists "Admins can manage waiver signatures" on public.kafe_waiver_signatures;
create policy "Admins can manage waiver signatures"
  on public.kafe_waiver_signatures for all
  to authenticated
  using (public.is_kafe_admin())
  with check (public.is_kafe_admin());
