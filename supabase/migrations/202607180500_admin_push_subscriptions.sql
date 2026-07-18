create table if not exists public.kafe_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth_key text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index if not exists kafe_push_subscriptions_user_id_idx
  on public.kafe_push_subscriptions(user_id);

alter table public.kafe_push_subscriptions enable row level security;
revoke all on table public.kafe_push_subscriptions from anon, authenticated;
