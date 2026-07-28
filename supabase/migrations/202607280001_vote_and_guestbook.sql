create table if not exists public.kafe_monthly_votes (
  id uuid primary key default gen_random_uuid(),
  campaign_id text not null,
  entry_id text not null,
  voter_token text not null,
  created_at timestamptz not null default now(),
  unique (campaign_id, voter_token)
);

alter table public.kafe_monthly_votes enable row level security;
revoke all on public.kafe_monthly_votes from public, anon, authenticated;

create or replace function public.cast_kafe_monthly_vote(
  p_campaign_id text,
  p_entry_id text,
  p_voter_token text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  config jsonb;
begin
  if length(p_voter_token) < 20 or length(p_voter_token) > 100 then
    raise exception 'INVALID_VOTER_TOKEN';
  end if;

  select value -> 'voteOfMonth'
  into config
  from public.kafe_settings
  where id = 'main';

  if config is null
    or coalesce((config ->> 'enabled')::boolean, false) is false
    or config ->> 'campaignId' <> p_campaign_id
    or nullif(config ->> 'startsAt', '') is null
    or nullif(config ->> 'endsAt', '') is null
    or current_date < nullif(config ->> 'startsAt', '')::date
    or current_date > nullif(config ->> 'endsAt', '')::date
    or not exists (
      select 1
      from jsonb_array_elements(coalesce(config -> 'entries', '[]'::jsonb)) entry
      where entry ->> 'id' = p_entry_id
        and coalesce((entry ->> 'visible')::boolean, false)
    )
  then
    raise exception 'VOTE_CLOSED_OR_INVALID';
  end if;

  insert into public.kafe_monthly_votes (campaign_id, entry_id, voter_token)
  values (p_campaign_id, p_entry_id, p_voter_token);

  return jsonb_build_object('accepted', true);
exception
  when unique_violation then
    return jsonb_build_object('accepted', false, 'duplicate', true);
end;
$$;

create or replace function public.get_public_kafe_vote_results(p_campaign_id text)
returns table(entry_id text, vote_count bigint)
language plpgsql
security definer
set search_path = public
as $$
declare
  config jsonb;
begin
  select value -> 'voteOfMonth'
  into config
  from public.kafe_settings
  where id = 'main';

  if config is null
    or config ->> 'campaignId' <> p_campaign_id
    or coalesce((config ->> 'showResults')::boolean, false) is false
  then
    return;
  end if;

  return query
  select vote.entry_id, count(*)::bigint
  from public.kafe_monthly_votes vote
  where vote.campaign_id = p_campaign_id
  group by vote.entry_id;
end;
$$;

create or replace function public.get_admin_kafe_vote_results(p_campaign_id text)
returns table(entry_id text, vote_count bigint)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not private.is_kafe_admin() then
    raise exception 'ADMIN_REQUIRED';
  end if;

  return query
  select vote.entry_id, count(*)::bigint
  from public.kafe_monthly_votes vote
  where vote.campaign_id = p_campaign_id
  group by vote.entry_id;
end;
$$;

revoke all on function public.cast_kafe_monthly_vote(text, text, text) from public;
revoke all on function public.get_public_kafe_vote_results(text) from public;
revoke all on function public.get_admin_kafe_vote_results(text) from public;
grant execute on function public.cast_kafe_monthly_vote(text, text, text) to anon, authenticated;
grant execute on function public.get_public_kafe_vote_results(text) to anon, authenticated;
grant execute on function public.get_admin_kafe_vote_results(text) to authenticated;

create table if not exists public.kafe_guestbook_entries (
  id text primary key,
  value jsonb not null,
  sort_order integer,
  updated_at timestamptz not null default now()
);

alter table public.kafe_guestbook_entries enable row level security;

drop policy if exists "Public can read published guestbook entries"
  on public.kafe_guestbook_entries;
create policy "Public can read published guestbook entries"
  on public.kafe_guestbook_entries for select
  to anon, authenticated
  using (value ->> 'status' = 'published');

drop policy if exists "Public can submit guestbook entries"
  on public.kafe_guestbook_entries;
create policy "Public can submit guestbook entries"
  on public.kafe_guestbook_entries for insert
  to anon, authenticated
  with check (
    value ->> 'status' = 'pending'
    and value ->> 'source' = 'site'
    and length(coalesce(value ->> 'author', '')) between 2 and 80
    and length(coalesce(value ->> 'message', '')) between 4 and 800
  );

drop policy if exists "Admins can manage guestbook entries"
  on public.kafe_guestbook_entries;
create policy "Admins can manage guestbook entries"
  on public.kafe_guestbook_entries for all
  to authenticated
  using (private.is_kafe_admin())
  with check (private.is_kafe_admin());

grant select, insert on public.kafe_guestbook_entries to anon;
grant select, insert, update, delete on public.kafe_guestbook_entries to authenticated;
