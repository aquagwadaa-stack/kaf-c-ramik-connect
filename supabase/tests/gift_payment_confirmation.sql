begin;
insert into public.kafe_gift_card_orders
  (id, code, management_token, value, amount, provider_checkout_id)
values ('audit-gift-payment', 'AUDIT-GIFT-PAYMENT', 'audit-gift-token',
  '{"recipientName":"TEST","usedAt":"preserve-admin-data"}', 42.50, 'audit-gift-checkout');
do $$
declare result jsonb;
begin
  if has_function_privilege('anon', 'public.apply_kafe_gift_payment(text,numeric,text,timestamptz)', 'EXECUTE')
    or has_function_privilege('authenticated', 'public.apply_kafe_gift_payment(text,numeric,text,timestamptz)', 'EXECUTE') then
    raise exception 'PUBLIC_PAYMENT_ACCESS';
  end if;
  begin
    perform public.apply_kafe_gift_payment('audit-gift-checkout', 20, 'PAID', now() + interval '6 months');
    raise exception 'WRONG_AMOUNT_ACCEPTED';
  exception when others then
    if sqlerrm <> 'PAYMENT_MISMATCH' then raise; end if;
  end;
  result := public.apply_kafe_gift_payment('audit-gift-checkout', 42.50, 'PAID', '2027-03-11T03:59:59Z');
  if not (result->>'firstPaid')::boolean or result#>>'{order,status}' <> 'paid'
    or result#>>'{order,value,usedAt}' <> 'preserve-admin-data' then raise exception 'PAID_STATE_INVALID'; end if;
  result := public.apply_kafe_gift_payment('audit-gift-checkout', 42.50, 'PAID', '2028-03-11T03:59:59Z');
  if (result->>'firstPaid')::boolean or (result#>>'{order,expires_at}')::timestamptz <> '2027-03-11T03:59:59Z' then
    raise exception 'REPLAY_CHANGED_VALIDITY'; end if;
  result := public.apply_kafe_gift_payment('audit-gift-checkout', 42.50, 'PENDING', now());
  if result#>>'{order,status}' <> 'paid' then raise exception 'PAID_STATE_DOWNGRADED'; end if;
end $$;
rollback;
