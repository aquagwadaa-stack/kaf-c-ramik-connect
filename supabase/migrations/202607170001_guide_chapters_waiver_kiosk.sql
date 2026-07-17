-- The public guide is now driven by three official document chapters.
-- Move the breakage prevention out of the waiver and into the guide resources.
with breakage_resource as (
  select coalesce(
    (
      select resource || '{"category":"prevention"}'::jsonb
      from public.kafe_content_documents waiver,
        lateral jsonb_array_elements(coalesce(waiver.value->'resources', '[]'::jsonb)) resource
      where waiver.id = 'waiver' and resource->>'id' = 'casse-ceramique'
      limit 1
    ),
    '{
      "id":"casse-ceramique",
      "title":"Prévention casse céramique",
      "description":"Une céramique brute cassée peut être facturée à hauteur de 50 % de son prix.",
      "category":"prevention",
      "attachmentUrl":"/documents/casse-ceramique.pdf",
      "attachmentName":"Casse céramique pdf.pdf",
      "attachmentType":"application/pdf",
      "previewImageUrls":["/documents/casse-ceramique.webp"],
      "visible":true
    }'::jsonb
  ) as resource
), guide_resources as (
  select
    guide.id,
    coalesce(jsonb_agg(resource order by ordinal) filter (where resource->>'id' <> 'casse-ceramique'), '[]'::jsonb) as resources
  from public.kafe_content_documents guide
  left join lateral jsonb_array_elements(coalesce(guide.value->'resources', '[]'::jsonb))
    with ordinality as entries(resource, ordinal) on true
  where guide.id = 'guide'
  group by guide.id
)
update public.kafe_content_documents guide
set
  value = jsonb_set(
    jsonb_set(
      jsonb_set(
        guide.value,
        '{resources}',
        guide_resources.resources || jsonb_build_array(breakage_resource.resource),
        true
      ),
      '{intro}',
      to_jsonb('Prenez le temps de consulter chaque support avant de commencer. Toutes les étapes du guide et du nuancier choisi sont importantes pour la cuisson, l''identification et la récupération de votre création.'::text),
      true
    ),
    '{version}',
    to_jsonb('2026-07-chapitres-officiels'::text),
    true
  ),
  updated_at = now()
from guide_resources, breakage_resource
where guide.id = guide_resources.id;

update public.kafe_content_documents waiver
set
  value = jsonb_set(
    jsonb_set(
      waiver.value,
      '{resources}',
      coalesce(
        (
          select jsonb_agg(resource order by ordinal)
          from jsonb_array_elements(coalesce(waiver.value->'resources', '[]'::jsonb))
            with ordinality as entries(resource, ordinal)
          where resource->>'id' <> 'casse-ceramique'
        ),
        '[]'::jsonb
      ),
      true
    ),
    '{body}',
    to_jsonb('Je reconnais avoir pris connaissance du guide complet de l''atelier. En cas de non-respect de celui-ci, l''établissement ne pourra pas être tenu responsable et aucun remboursement ne pourra être exigé.'::text),
    true
  ),
  updated_at = now()
where waiver.id = 'waiver';
