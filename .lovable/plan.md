## Etat actuel de la configuration Supabase

### Ce que Lovable Cloud a deja injecte
Le fichier `.env` (auto-genere, ne pas modifier a la main) contient deja :

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_PROJECT_ID`
- + les equivalents serveur (`SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_PROJECT_ID`)

Lovable Cloud n'injecte PAS `VITE_SUPABASE_ANON_KEY`. La nouvelle convention utilise `PUBLISHABLE_KEY` (cles nouveau format `sb_publishable_...`, opaques, pas des JWT).

### Le probleme dans le code actuel
`src/lib/supabase-rest.ts` lit :

```ts
export const supabaseConfig = {
  url: import.meta.env.VITE_SUPABASE_URL,
  anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY, // <-- undefined
};
```

Consequence : `isSupabaseConfigured()` renvoie `false`, donc :
- les reservations, capacites, admin, signatures, contenus restent en mode demo `localStorage`,
- `/admin` ne demandera jamais de connexion Supabase,
- les migrations appliquees ne sont pas exploitees par le front.

C'est un simple probleme de nom de variable, pas de secret manquant.

### Ce qu'il faudra faire (en mode build, plus tard)

1. Dans `src/lib/supabase-rest.ts`, remplacer la lecture de `VITE_SUPABASE_ANON_KEY` par `VITE_SUPABASE_PUBLISHABLE_KEY` (avec fallback sur `VITE_SUPABASE_ANON_KEY` pour compat locale si besoin).
2. Verifier que l'en-tete `Authorization: Bearer <publishable_key>` envoye par `supabase-rest.ts` fonctionne. Les cles `sb_publishable_...` sont opaques : PostgREST peut renvoyer `Expected 3 parts in JWT; got 1` si envoyees en Bearer. Le client auto-genere (`src/integrations/supabase/client.ts`) gere deja ce cas en supprimant le header Authorization pour les cles nouveau format. Il faudra reproduire la meme logique dans `request()` de `supabase-rest.ts` (ne mettre `Authorization: Bearer` que quand c'est un token utilisateur issu de `signInAdmin`, sinon envoyer seulement `apikey`).
3. Mettre a jour `.env.example` et `supabase/README.md` pour documenter `VITE_SUPABASE_PUBLISHABLE_KEY` au lieu de `VITE_SUPABASE_ANON_KEY`.
4. Ne rien changer dans `src/integrations/supabase/client.ts` / `client.server.ts` / `auth-*` / `types.ts` (auto-generes).

### Note sur l'admin
Rien a faire cote code aujourd'hui pour creer un compte. Quand tu voudras activer un admin, ca se fera cote base (creation user Auth via l'UI Cloud, puis insertion dans `kafe_admin_profiles`). Je ne le fais pas maintenant.

### Resume
Lovable Cloud a bien tout injecte, mais sous le nom `VITE_SUPABASE_PUBLISHABLE_KEY`. Le code attend l'ancien nom `VITE_SUPABASE_ANON_KEY` : il faut adapter `src/lib/supabase-rest.ts` (et gerer le cas cle opaque dans l'en-tete Authorization). Aucun changement de secret ni de migration necessaire.