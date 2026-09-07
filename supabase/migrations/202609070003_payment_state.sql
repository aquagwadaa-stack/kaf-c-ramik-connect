-- Serialize a payment callback with staff decisions and customer cancellations.
create or replace function public.apply_kafe_deposit_payment(
  p_id text, p_checkout_id text, p_status text
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  booking public.kafe_reservations%rowtype;
  next_status text;
  next_value jsonb;
begin
  select * into booking from public.kafe_reservations where id=p_id for update;
  if not found then return null; end if;
  if coalesce((booking.value->>'depositPaid')::boolean,false) then
    return jsonb_build_object('changed',false,'status',booking.status,'value',booking.value);
  end if;
  if p_status='PAID' then
    next_status := case when booking.status in ('cancelled','confirmed','arrived')
      then booking.status else 'deposit_paid' end;
    next_value := booking.value || jsonb_build_object(
      'depositPaid',true,'depositPaidAt',now(),'sumupCheckoutId',p_checkout_id,'status',next_status
    ) || case when next_status='cancelled' then '{"refundRequired":true}'::jsonb else '{}'::jsonb end;
  elsif p_status='EXPIRED' and booking.status='pending' then
    next_status := 'cancelled';
    next_value := booking.value || jsonb_build_object('status','cancelled','cancelledAt',now(),'cancelledBy','payment_timeout');
  else
    return jsonb_build_object('changed',false,'status',booking.status,'value',booking.value);
  end if;
  update public.kafe_reservations set status=next_status,value=next_value,updated_at=now() where id=p_id;
  return jsonb_build_object('changed',true,'status',next_status,'value',next_value);
end;
$$;
revoke all on function public.apply_kafe_deposit_payment(text,text,text) from public, anon, authenticated;
grant execute on function public.apply_kafe_deposit_payment(text,text,text) to service_role;
