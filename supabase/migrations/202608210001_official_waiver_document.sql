-- Pin the validated waiver supplied by Kafe Ceramik.
-- The document is now maintained with the application and is no longer replaceable from admin.

update public.kafe_content_documents
set value = (value - 'attachmentDataUrl' - 'previewImageDataUrls') || jsonb_build_object(
    'title', 'Décharge officielle',
    'version', '2026-08-21',
    'updatedAt', now(),
    'body', 'Je reconnais avoir pris connaissance du guide complet de l''atelier. En cas de non-respect de celui-ci, l''établissement ne pourra pas être tenu responsable et aucun remboursement ne pourra être exigé.',
    'attachmentUrl', '/documents/decharge-officielle.pdf',
    'attachmentName', 'Decharge-Kafe-Ceramik-IMPRESSION.pdf',
    'attachmentType', 'application/pdf',
    'previewImageUrls', jsonb_build_array('/documents/decharge-officielle.webp'),
    'resources', '[]'::jsonb
  ),
  updated_at = now()
where id = 'waiver';

insert into public.kafe_content_documents (id, value, sort_order, updated_at)
values (
  'waiver',
  jsonb_build_object(
    'id', 'waiver',
    'title', 'Décharge officielle',
    'version', '2026-08-21',
    'updatedAt', now(),
    'body', 'Je reconnais avoir pris connaissance du guide complet de l''atelier. En cas de non-respect de celui-ci, l''établissement ne pourra pas être tenu responsable et aucun remboursement ne pourra être exigé.',
    'attachmentUrl', '/documents/decharge-officielle.pdf',
    'attachmentName', 'Decharge-Kafe-Ceramik-IMPRESSION.pdf',
    'attachmentType', 'application/pdf',
    'previewImageUrls', jsonb_build_array('/documents/decharge-officielle.webp'),
    'resources', '[]'::jsonb
  ),
  2,
  now()
)
on conflict (id) do nothing;
