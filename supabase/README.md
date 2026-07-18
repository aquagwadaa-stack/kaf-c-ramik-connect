# Kafe Ceramik - Supabase

## Variables Lovable / Vite

Ajouter ces variables dans Lovable quand le projet Supabase est cree :

```text
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx
```

Sans ces variables, le site reste en mode demo local avec `localStorage`.

## Mise en place

1. Creer un projet Supabase au nom du client ou dans l'espace convenu.
2. Executer toutes les migrations de `supabase/migrations` dans l'ordre.
3. Creer le premier utilisateur administrateur dans Supabase Auth et l'autoriser dans `kafe_admin_profiles`.
4. Les comptes suivants peuvent demander leur acces depuis `/admin`; un administrateur deja autorise valide ensuite la demande dans l'onglet Equipe.
5. Ajouter les variables dans Lovable.
6. Tester `/admin` : la page doit demander une connexion.

## Compte administrateur

Le plus simple et le plus propre pour le lancement : email + mot de passe via Supabase Auth.

Une fois le compte cree dans `Authentication > Users`, copier son `User UID`, puis executer :

```sql
insert into public.kafe_admin_profiles (user_id, email, role)
values (
  'USER_UID_ICI',
  'anouk@example.com',
  'owner'
)
on conflict (user_id)
do update set
  email = excluded.email,
  role = excluded.role,
  updated_at = now();
```

Roles prevus :

- `owner` : acces complet et gestion future des comptes.
- `manager` : gestion quotidienne.
- `team` : operations limitees a definir si besoin.
- `readonly` : consultation seule a definir si besoin.

Chaque membre utilise son propre email et son propre mot de passe. Les comptes autorises ont actuellement le meme niveau fonctionnel, tandis que le compte `owner` reste protege contre une suppression accidentelle.

## Securite

- Les visiteurs peuvent lire les reglages publics, les objets et les documents publies.
- Les visiteurs peuvent creer une reservation, mais ne peuvent pas lire les reservations.
- La disponibilite publique passe par `get_kafe_slot_occupancy`, sans exposer les coordonnees des clients. La creation atomique avec `create_kafe_reservation` attribue une vraie table et refuse un groupe lorsqu'aucun espace unique ne peut l'accueillir.
- Les reservations du lendemain ferment a l'heure configuree dans `bookingCutoffTime` (18 h par defaut, heure de Guadeloupe).
- Les groupes peuvent etre repartis sur plusieurs tables. Leurs montants de devis sont controles en base et le PDF estimatif est joint automatiquement a l'email de demande.
- Les reservations completes, signatures et modifications admin demandent une session Supabase Auth autorisee dans `kafe_admin_profiles`.

## A faire avant livraison

- Creer les comptes reels de l'equipe.
- Remplacer les contenus demo par le guide et la decharge valides par Mala Madre.
- Verifier les durees de conservation des donnees client avec le client.
- Configurer les secrets de la fonction `kafe-emails` :
  - `RESEND_API_KEY` : cle API du compte email du client.
  - `KAFE_EMAIL_FROM` : expediteur verifie, par exemple `Kafe Ceramik <reservations@domaine.fr>`.
  - `KAFE_REPLY_TO` : adresse a laquelle l'equipe souhaite recevoir les reponses.
  - `KAFE_CRON_SECRET` : secret long utilise uniquement par la tache de rappel.
- Configurer les notifications de l'equipe :
  - `KAFE_VAPID_PUBLIC_KEY` et `KAFE_VAPID_PRIVATE_KEY` : paire VAPID Web Push.
  - `KAFE_VAPID_SUBJECT` : contact technique, par exemple `mailto:gwada.web.studio@gmail.com`.
  - deployer `kafe-push`, puis redeployer `kafe-emails` avec les memes cles VAPID.
  - chaque membre de l'equipe active ensuite les notifications sur son propre telephone depuis
    la vue d'ensemble de l'administration.
- Programmer l'appel horaire de l'action `process-reminders` sur la fonction `kafe-emails`
  avec l'en-tete `x-cron-secret`. La fonction envoie le rappel des qu'une reservation entre
  dans la fenetre des 24 heures et marque chaque reservation pour eviter les doublons.
- Tester en conditions reelles les quatre emails : confirmation simple, demande de groupe,
  decision de l'equipe et rappel 24 heures avant.
- Configurer les secrets de la fonction `sumup-checkout` avec le compte SumUp de Mala Madre :
  - `SUMUP_API_KEY` : cle d'API creee dans le compte SumUp du client.
  - `SUMUP_MERCHANT_CODE` : code marchand du compte qui encaisse les acomptes.
  - declarer l'URL de la fonction `sumup-checkout` comme webhook SumUp.
  - activer ensuite `sumupPaymentsEnabled` dans les reglages uniquement apres un paiement test reussi.
- Le manifeste, le service worker et `kafe-push` permettent d'installer le site comme une application
  et d'abonner individuellement les telephones de l'equipe aux notifications de reservations.
