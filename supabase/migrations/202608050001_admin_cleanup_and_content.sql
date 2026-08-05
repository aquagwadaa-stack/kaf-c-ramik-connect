-- Final cleanup of the administration labels and persisted content.
-- This migration is intentionally idempotent and leaves uploaded files untouched.

update public.kafe_settings
set value = value || jsonb_build_object(
    'configurationVersion', 12,
    'manualConfirmationThreshold', coalesce(
      nullif(value ->> 'depositThreshold', '')::integer,
      nullif(value ->> 'manualConfirmationThreshold', '')::integer,
      10
    )
  ),
  updated_at = now()
where id = 'main';

update public.kafe_content_documents
set value = value || jsonb_build_object(
    'title', 'Le guide de ton atelier',
    'version', '2026-07',
    'intro', 'Prends le temps de consulter chaque support avant de commencer. Toutes les étapes du guide et du nuancier choisi sont importantes pour la cuisson, l''identification et la récupération de ta création.',
    'body', 'Les documents sont également disponibles sur place. L''équipe reste disponible si une consigne n''est pas claire avant de commencer.'
  ),
  updated_at = now()
where id = 'guide';

update public.kafe_content_documents
set value = jsonb_set(value, '{version}', to_jsonb('2026-07'::text), true),
  updated_at = now()
where id = 'waiver'
  and coalesce(value ->> 'version', '') <> '2026-07';

update public.kafe_content_documents
set value = value || jsonb_build_object(
    'title', 'Carte du Kafé',
    'body', 'Découvre les boissons, brunchs et gourmandises proposés au Kafé.'
  ),
  updated_at = now()
where id = 'menu';

update public.kafe_content_documents
set value = jsonb_set(
    value,
    '{resources}',
    coalesce(
      (
        select jsonb_agg(
          case
            when resource ->> 'category' = 'menu'
              then resource || jsonb_build_object(
                'title', 'Carte du Kafé',
                'description', 'Boissons, brunchs et gourmandises du Kafé.'
              )
            else resource
          end
        )
        from jsonb_array_elements(coalesce(value -> 'resources', '[]'::jsonb)) as resource
      ),
      '[]'::jsonb
    ),
    true
  ),
  updated_at = now()
where id = 'menu';

insert into public.kafe_content_documents (id, value, sort_order, updated_at)
values (
  'menu',
  jsonb_build_object(
    'id', 'menu',
    'title', 'Carte du Kafé',
    'version', 'À publier',
    'updatedAt', now(),
    'body', 'Découvre les boissons, brunchs et gourmandises proposés au Kafé.',
    'resources', jsonb_build_array(
      jsonb_build_object(
        'id', 'menu',
        'title', 'Carte du Kafé',
        'description', 'Boissons, brunchs et gourmandises du Kafé.',
        'category', 'menu',
        'visible', true
      )
    )
  ),
  3,
  now()
)
on conflict (id) do nothing;
