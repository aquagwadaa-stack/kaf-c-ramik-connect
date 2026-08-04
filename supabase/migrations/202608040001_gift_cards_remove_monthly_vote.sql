-- The monthly contest was declined by the client. Remove its public API and stored data.
drop function if exists public.cast_kafe_monthly_vote(text, text, text);
drop function if exists public.get_public_kafe_vote_results(text);
drop function if exists public.get_admin_kafe_vote_results(text);
drop table if exists public.kafe_monthly_votes;

update public.kafe_settings
set value = (value - 'voteOfMonth' - 'giftCardPaymentUrl' - 'giftCardCustomMax') ||
  jsonb_build_object(
    'configurationVersion', 11,
    'googleReviewUrl', 'https://share.google/s8MOPkUla7xtu7zQL',
    'giftCardContactEmail', 'ceramikkafe@gmail.com',
    'giftCardPaymentsEnabled', false,
    'giftCardValidityMonths', 6,
    'giftCardCustomEnabled', true,
    'giftCardCustomMin', 20,
    'giftCardOptions', jsonb_build_array(
      jsonb_build_object(
        'id', 'petit-plaisir',
        'title', 'Le Petit Plaisir',
        'amount', 35,
        'description', 'Une boisson signature, chaude ou fraîche, et une céramique à peindre jusqu''à 25 €.',
        'visible', true,
        'visual', 'rose'
      ),
      jsonb_build_object(
        'id', 'joli-moment',
        'title', 'Le Joli Moment',
        'amount', 60,
        'description', 'Une boisson signature, un brunch et une céramique à peindre jusqu''à 35 €.',
        'visible', true,
        'visual', 'tropical'
      ),
      jsonb_build_object(
        'id', 'parenthese-parfaite',
        'title', 'La Parenthèse Parfaite',
        'amount', 80,
        'description', 'Une boisson signature, un brunch et une céramique à peindre jusqu''à 55 €.',
        'visible', true,
        'visual', 'confetti'
      )
    )
  ),
  updated_at = now()
where id = 'main';

create table if not exists public.kafe_gift_card_orders (
  id text primary key,
  code text not null unique,
  management_token text not null unique,
  value jsonb not null,
  amount numeric(10, 2) not null check (amount >= 20),
  currency text not null default 'EUR',
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'failed', 'expired')),
  provider_checkout_id text unique,
  hosted_checkout_url text,
  paid_at timestamptz,
  expires_at timestamptz,
  pdf_email_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.kafe_gift_card_orders enable row level security;
revoke all on public.kafe_gift_card_orders from public, anon, authenticated;

drop policy if exists "Admins can read gift card orders" on public.kafe_gift_card_orders;
create policy "Admins can read gift card orders"
  on public.kafe_gift_card_orders for select
  to authenticated
  using (private.is_kafe_admin());

drop policy if exists "Admins can update gift card orders" on public.kafe_gift_card_orders;
create policy "Admins can update gift card orders"
  on public.kafe_gift_card_orders for update
  to authenticated
  using (private.is_kafe_admin())
  with check (private.is_kafe_admin());

grant select, update on public.kafe_gift_card_orders to authenticated;
