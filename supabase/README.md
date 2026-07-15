# Kafe Ceramik - Supabase

## Variables Lovable / Vite

Ajouter ces variables dans Lovable quand le projet Supabase est cree :

```text
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=ey...
```

Sans ces variables, le site reste en mode demo local avec `localStorage`.

## Mise en place

1. Creer un projet Supabase au nom du client ou dans l'espace convenu.
2. Executer `supabase/migrations/202607150001_kafe_core.sql` dans l'editeur SQL Supabase.
3. Creer au moins un utilisateur dans Supabase Auth pour l'equipe.
4. Ajouter les variables dans Lovable.
5. Tester `/admin` : la page doit demander une connexion.

## Securite

- Les visiteurs peuvent lire les reglages publics, les objets et les documents publies.
- Les visiteurs peuvent creer une reservation, mais ne peuvent pas lire les reservations.
- La disponibilite des creneaux passe par la fonction `get_kafe_slot_capacity`, qui renvoie seulement des totaux par date/creneau.
- Les reservations completes, signatures et modifications admin demandent une session Supabase Auth.

## A faire avant livraison

- Creer les comptes reels de l'equipe.
- Remplacer les contenus demo par le guide et la decharge valides par Mala Madre.
- Verifier les durees de conservation des donnees client avec le client.
- Tester les emails de confirmation quand le fournisseur mail sera choisi.
