insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'kafe-documents',
  'kafe-documents',
  true,
  15728640,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can read Kafe documents" on storage.objects;
create policy "Public can read Kafe documents"
  on storage.objects for select
  using (bucket_id = 'kafe-documents');

drop policy if exists "Kafe admins can upload documents" on storage.objects;
create policy "Kafe admins can upload documents"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'kafe-documents' and private.is_kafe_admin());

drop policy if exists "Kafe admins can update documents" on storage.objects;
create policy "Kafe admins can update documents"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'kafe-documents' and private.is_kafe_admin())
  with check (bucket_id = 'kafe-documents' and private.is_kafe_admin());

drop policy if exists "Kafe admins can delete documents" on storage.objects;
create policy "Kafe admins can delete documents"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'kafe-documents' and private.is_kafe_admin());

update public.kafe_settings
set
  value = value || jsonb_build_object(
    'configurationVersion', 4,
    'guideAcceptanceText', 'J''ai pris connaissance du guide. Le Kafé ne pourra en aucun cas être tenu responsable des suites malheureuses d''un non-respect de ses consignes.',
    'confirmationEmailText', 'Votre réservation est enregistrée. Vous retrouverez les informations pratiques dans cette confirmation.'
  ),
  updated_at = now()
where id = 'main';

insert into public.kafe_content_documents (id, value, sort_order, updated_at)
values
  (
    'guide',
    $json${
      "id": "guide",
      "title": "Le guide de votre atelier",
      "version": "2026-07-officiel",
      "updatedAt": "2026-07-16T12:00:00.000Z",
      "intro": "Prenez quelques minutes pour lire les consignes avant de peindre. Elles permettent d'obtenir le meilleur résultat possible après cuisson et de retrouver facilement votre création.",
      "body": "La consommation sur place est obligatoire pour participer à l'atelier. Les enfants restent sous la surveillance permanente de l'adulte qui les accompagne.",
      "sections": [
        {"id":"guide-choose","number":"01","title":"Choisissez votre pièce et vos couleurs","body":"Le prix comprend la céramique, le matériel de peinture et la cuisson. Fiez-vous aux nuanciers : la couleur avant cuisson est différente du résultat final.","imageUrl":"/objets/tasse-design.webp","visible":true},
        {"id":"guide-paint","number":"02","title":"Peignez en deux couches","body":"Servez-vous en petites quantités, laissez sécher 5 à 10 minutes entre les couches et gardez les zones en contact avec la bouche sans peinture.","imageUrl":"/creations/tasse-feuillage.webp","visible":true},
        {"id":"guide-identify","number":"03","title":"Identifiez votre création","body":"Inscrivez vos initiales sous la pièce avec de la peinture, puis prenez une photo. Sans photo et sans initiales, l'équipe ne pourra pas garantir sa récupération.","imageUrl":"/creations/assiette-tortue.webp","visible":true},
        {"id":"guide-varnish","number":"04","title":"Vernissez selon la peinture choisie","body":"Appliquez deux couches de vernis après séchage, sauf avec les peintures à effets indiquées dans le second nuancier. Lavez et rangez le matériel utilisé.","imageUrl":"/objets/assiettes-empilees.webp","visible":true},
        {"id":"guide-firing","number":"05","title":"Laissez l'équipe cuire votre pièce","body":"La création reste au Kafé pour la finition et la cuisson. Le délai habituel annoncé par l'équipe est de 7 à 10 jours.","imageUrl":"/creations/assiette-bateau.webp","visible":true},
        {"id":"guide-collect","number":"06","title":"Revenez la récupérer","body":"Conservez votre photo et revenez chercher la création au Kafé. Les pièces sont gardées au maximum deux mois avant d'être données.","imageUrl":"/objets/tasses-texturees.webp","visible":true}
      ],
      "resources": [
        {"id":"guide-complet","title":"Guide complet de l'atelier","description":"Toutes les étapes, les délais et les règles à respecter avant de commencer.","category":"guide","attachmentUrl":"/documents/guide-complet.pdf","attachmentName":"Guide complet pdf final.pdf","attachmentType":"application/pdf","previewImageUrls":["/documents/guide-complet.webp"],"visible":true},
        {"id":"nuancier-1","title":"Nuancier - peintures classiques","description":"Deux couches de peinture, puis deux couches de vernis après séchage.","category":"nuancier","attachmentUrl":"/documents/nuancier-1.pdf","attachmentName":"Nuancier 1 pdf.pdf","attachmentType":"application/pdf","previewImageUrls":["/documents/nuancier-1.webp"],"visible":true},
        {"id":"nuancier-2","title":"Nuancier - peintures à effets","description":"Les peintures à effets ne se vernissent pas. Suivez les consignes propres à ces couleurs.","category":"nuancier","attachmentUrl":"/documents/nuancier-2.pdf","attachmentName":"Nuancier 2 pdf.pdf","attachmentType":"application/pdf","previewImageUrls":["/documents/nuancier-2.webp"],"visible":true},
        {"id":"gaspillage-peinture","title":"Bien doser la peinture","description":"Servez-vous en petites quantités et rechargez la palette seulement si nécessaire.","category":"prevention","attachmentUrl":"/documents/gaspillage-peinture.pdf","attachmentName":"Gaspillage peinture pdf.pdf","attachmentType":"application/pdf","previewImageUrls":["/documents/gaspillage-peinture.webp"],"visible":true}
      ]
    }$json$::jsonb,
    1,
    now()
  ),
  (
    'waiver',
    $json${
      "id": "waiver",
      "title": "Décharge de responsabilité",
      "version": "2026-07-officielle",
      "updatedAt": "2026-07-16T12:00:00.000Z",
      "body": "Je reconnais avoir pris connaissance du guide complet de peinture et des consignes d'utilisation du matériel. En cas de non-respect de ces règles, l'établissement ne pourra être tenu responsable du résultat et aucun remboursement ne pourra être demandé.",
      "attachmentUrl": "/documents/decharge-officielle.pdf",
      "attachmentName": "Décharge PDF.pdf",
      "attachmentType": "application/pdf",
      "previewImageUrls": ["/documents/decharge-officielle.webp"],
      "resources": [
        {"id":"casse-ceramique","title":"Prévention casse céramique","description":"Une céramique brute cassée peut être facturée à hauteur de 50 % de son prix.","category":"waiver","attachmentUrl":"/documents/casse-ceramique.pdf","attachmentName":"Casse céramique pdf.pdf","attachmentType":"application/pdf","previewImageUrls":["/documents/casse-ceramique.webp"],"visible":true}
      ]
    }$json$::jsonb,
    2,
    now()
  )
on conflict (id) do update set
  value = excluded.value,
  sort_order = excluded.sort_order,
  updated_at = excluded.updated_at;

create index if not exists kafe_waiver_signatures_signed_at_idx
  on public.kafe_waiver_signatures (signed_at desc);

create index if not exists kafe_waiver_signatures_reservation_ref_idx
  on public.kafe_waiver_signatures (reservation_ref);
