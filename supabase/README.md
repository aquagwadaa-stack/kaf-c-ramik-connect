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
2. Executer `supabase/migrations/202607150001_kafe_core.sql` dans l'editeur SQL Supabase.
3. Creer au moins un utilisateur dans Supabase Auth pour l'equipe.
4. Autoriser cet utilisateur dans `kafe_admin_profiles`.
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

Pour l'instant, creer un seul compte `owner` suffit. Les niveaux plus fins pourront etre actives si l'equipe en a vraiment besoin.

## Securite

- Les visiteurs peuvent lire les reglages publics, les objets et les documents publies.
- Les visiteurs peuvent creer une reservation, mais ne peuvent pas lire les reservations.
- La disponibilite des creneaux passe par la fonction `get_kafe_slot_capacity`, qui renvoie seulement des totaux par date/creneau.
- Les reservations completes, signatures et modifications admin demandent une session Supabase Auth autorisee dans `kafe_admin_profiles`.

## A faire avant livraison

- Creer les comptes reels de l'equipe.
- Remplacer les contenus demo par le guide et la decharge valides par Mala Madre.
- Verifier les durees de conservation des donnees client avec le client.
- Tester les emails de confirmation quand le fournisseur mail sera choisi.
