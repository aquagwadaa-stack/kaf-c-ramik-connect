-- Only a verified server-side SumUp response may activate a gift card.
create or replace function public.apply_kafe_gift_payment(
  p_checkout_id text, p_amount numeric, p_status text, p_expires_at timestamptz
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  card public.kafe_gift_card_orders%rowtype;
  first_paid boolean := false;
begin
  if p_status not in ('PENDING', 'PAID', 'FAILED', 'EXPIRED') then
    raise exception 'INVALID_PAYMENT_STATUS';
  end if;
  select * into card from public.kafe_gift_card_orders
    where provider_checkout_id = p_checkout_id for update;
  if not found or card.amount <> p_amount or card.currency <> 'EUR' then
    raise exception 'PAYMENT_MISMATCH';
  end if;
  if card.status <> 'paid' then
    first_paid := p_status = 'PAID';
    update public.kafe_gift_card_orders set
      status = lower(p_status),
      paid_at = case when first_paid then coalesce(paid_at, now()) else paid_at end,
      expires_at = case when first_paid then coalesce(expires_at, p_expires_at) else expires_at end,
      value = value || jsonb_build_object('status', lower(p_status)) ||
        case when first_paid then jsonb_build_object(
          'paidAt', coalesce(paid_at, now()), 'expiresAt', coalesce(expires_at, p_expires_at)
        ) else '{}'::jsonb end,
      updated_at = now()
    where id = card.id returning * into card;
  end if;
  return jsonb_build_object('firstPaid', first_paid, 'order', to_jsonb(card));
end;
$$;
revoke all on function public.apply_kafe_gift_payment(text, numeric, text, timestamptz) from public, anon, authenticated;
grant execute on function public.apply_kafe_gift_payment(text, numeric, text, timestamptz) to service_role;
