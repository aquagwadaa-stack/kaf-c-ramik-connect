-- Restore the public cleanup RPC used when a visitor image upload fails.
-- The upload policy requires the pending guestbook row to exist before the
-- storage object can be created, so this RPC safely removes a now-broken
-- image reference if storage rejects or times out during the upload.

create or replace function public.clear_failed_kafe_guestbook_image(
  p_id text,
  p_image_url text
)
returns void
language sql
security definer
set search_path = public
as $$
  update public.kafe_guestbook_entries
  set value = value - 'imageUrl',
    updated_at = now()
  where id = p_id
    and value ->> 'status' = 'pending'
    and value ->> 'source' = 'site'
    and value ->> 'imageUrl' = p_image_url;
$$;

revoke all on function public.clear_failed_kafe_guestbook_image(text, text) from public;
grant execute on function public.clear_failed_kafe_guestbook_image(text, text) to anon, authenticated;
