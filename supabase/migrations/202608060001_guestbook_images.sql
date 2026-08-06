-- Optional guestbook images submitted by visitors and managed by the Kafe team.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'kafe-guestbook',
  'kafe-guestbook',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create or replace function private.can_upload_kafe_guestbook_image(object_name text)
returns boolean
language sql
stable
security definer
set search_path = public, storage, private
as $$
  select
    split_part(object_name, '/', 1) = 'submissions'
    and exists (
      select 1
      from public.kafe_guestbook_entries entry
      where entry.id = split_part(object_name, '/', 2)
        and entry.value ->> 'status' = 'pending'
        and entry.value ->> 'source' = 'site'
        and entry.value ->> 'imageUrl' like '%/' || object_name
    );
$$;

revoke all on function private.can_upload_kafe_guestbook_image(text) from public;
grant execute on function private.can_upload_kafe_guestbook_image(text) to anon, authenticated;

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

drop policy if exists "Public can upload linked Kafe guestbook images" on storage.objects;
create policy "Public can upload linked Kafe guestbook images"
  on storage.objects for insert
  to anon, authenticated
  with check (
    bucket_id = 'kafe-guestbook'
    and private.can_upload_kafe_guestbook_image(name)
  );

drop policy if exists "Kafe admins can manage guestbook images" on storage.objects;
create policy "Kafe admins can manage guestbook images"
  on storage.objects for all
  to authenticated
  using (bucket_id = 'kafe-guestbook' and private.is_kafe_admin())
  with check (bucket_id = 'kafe-guestbook' and private.is_kafe_admin());
