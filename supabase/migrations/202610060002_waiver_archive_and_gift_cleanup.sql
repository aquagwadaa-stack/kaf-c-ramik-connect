-- Keep waiver archives lightweight in the admin and expire abandoned gift checkouts.

create or replace function public.get_kafe_waiver_signature_summaries()
returns table(value jsonb)
language plpgsql
stable
security definer
set search_path = public, private
as $$
begin
  if not private.is_kafe_admin() then
    raise exception 'ADMIN_REQUIRED';
  end if;

  return query
  select w.value - array['signatureDataUrl', 'documentUrl', 'documentPreviewUrl', 'acceptanceText']
  from public.kafe_waiver_signatures w
  order by w.signed_at desc, w.id desc;
end;
$$;

revoke all on function public.get_kafe_waiver_signature_summaries() from public, anon;
grant execute on function public.get_kafe_waiver_signature_summaries() to authenticated, service_role;

create or replace function public.get_kafe_waiver_signature_details(p_ids text[])
returns table(value jsonb)
language plpgsql
stable
security definer
set search_path = public, private
as $$
begin
  if not private.is_kafe_admin() then
    raise exception 'ADMIN_REQUIRED';
  end if;

  return query
  select w.value
  from public.kafe_waiver_signatures w
  where w.id = any(coalesce(p_ids, array[]::text[]))
  order by w.signed_at desc, w.id desc;
end;
$$;

revoke all on function public.get_kafe_waiver_signature_details(text[]) from public, anon;
grant execute on function public.get_kafe_waiver_signature_details(text[]) to authenticated, service_role;

create or replace function private.expire_stale_kafe_gift_orders()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  affected integer := 0;
begin
  update public.kafe_gift_card_orders
  set status = 'expired',
      value = jsonb_set(value, '{status}', '"expired"'::jsonb, true),
      updated_at = now()
  where status = 'pending'
    and created_at < now() - interval '24 hours';

  get diagnostics affected = row_count;
  return affected;
end;
$$;

revoke all on function private.expire_stale_kafe_gift_orders() from public, anon, authenticated;

do $$
declare
  existing_job record;
begin
  for existing_job in
    select jobid from cron.job where jobname = 'expire-stale-kafe-gift-orders'
  loop
    perform cron.unschedule(existing_job.jobid);
  end loop;
end;
$$;

select cron.schedule(
  'expire-stale-kafe-gift-orders',
  '17 * * * *',
  'select private.expire_stale_kafe_gift_orders();'
);
