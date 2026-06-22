# Rendre la navigation et les interactions plus vivantes

Objectif : donner du peps aux clics, survols, et changements de page sans casser l'esthétique actuelle (café-atelier doux, organique).

## 1. Transitions entre pages

- Wrapper le `<Outlet />` du `__root.tsx` (ou du `PageShell`) avec `motion` + `AnimatePresence` pour un fondu + léger slide-up à chaque changement de route.
- Durée courte (~250ms), easing doux, pour rester fluide.

## 2. Header / Navigation

- `src/components/site-header.tsx` :
  - Liens avec underline animé (effet `story-link` déjà dispo dans le design system) qui se déploie au survol.
  - Indicateur de page active (petit dot ou underline persistant sous le lien actif via `activeProps`).
  - Header qui se condense légèrement au scroll (shadow + fond plus opaque) — listener `scroll` simple.
  - Logo qui a un micro-effet au hover (scale 1.03 + légère rotation).

## 3. Boutons CTA (Réserver, Voir la carte, etc.)

- Ajouter une transition plus marquée : `hover:-translate-y-0.5`, `active:translate-y-0`, `transition-all duration-200`.
- Sur le bouton primaire "Réserver", ajouter un léger shimmer/glow au hover et l'icône qui glisse à droite.
- Effet `active:scale-[0.98]` pour un retour tactile au clic.

## 4. Cartes (Experiences, Quick links, Mood, Créations, Pieces)

- Harmoniser les hovers : translateY + ombre qui s'intensifie + bordure qui prend la couleur primaire.
- Sur les `ExperienceCard` et `creationPhotos` : ajouter une apparition au scroll (fade + slide-up) via `motion` + `whileInView`, déclenchée une seule fois, avec stagger entre les enfants.
- Les images `creationPhotos` zooment déjà — ajouter un léger tilt (rotation 1-2°) pour plus de vie.

## 5. Pièces céramiques (hero + grille)

- Le `CeramicHero` : ajouter une légère animation de flottement infinie (translateY ±4px, durées différentes par pièce) pour donner de la vie au hero.
- Au hover des cartes pièces, la rotation passe de `-3deg` à un petit "wobble" (rotation aller-retour).

## 6. Micro-détails

- Badges ("Ouvert mardi → dimanche") : le petit dot vert pulse doucement.
- Icônes des `VisitNote` / `InfoTile` : légère bascule au hover de la ligne.
- Liens du footer / footer CTA : effet underline cohérent.

## Détails techniques

- Dépendance déjà voulue : `motion/react` (Motion for React). Vérifier sa présence dans `package.json`; sinon `bun add motion`.
- Réutiliser les utilitaires d'animation Tailwind déjà fournis (`animate-fade-in`, `hover-scale`, `story-link`) quand possible pour éviter de surcharger en JS.
- Respecter `prefers-reduced-motion` : encapsuler les animations Motion avec `useReducedMotion()` et désactiver les effets non essentiels.
- Pas de changement de structure de routes, pas de logique métier modifiée — uniquement présentation.

## Fichiers à éditer

- `src/routes/__root.tsx` (transition page)
- `src/components/page-shell.tsx` (option si transitions y vivent mieux)
- `src/components/site-header.tsx` (nav animée + scroll)
- `src/routes/index.tsx` (apparitions au scroll, hovers cartes, hero flottant)
- éventuellement `src/styles.css` pour 1-2 keyframes (pulse, float)

## Hors scope

- Pas de refonte visuelle, pas de nouveaux composants UI, pas de changement de couleurs/typo.
- Pas de modification des autres routes (brunch, carte, etc.) sauf si tu veux que j'étende l'effet — à confirmer.

Veux-tu que j'étende aussi ces effets aux autres pages (brunch, carte, objets, réserver) ou on garde ça concentré sur la home + nav globale dans un premier temps ? oui étend a toutes les pages. et fais aussi ce que je t'ai dit par rapport au bloc apres le hero (descend encore)