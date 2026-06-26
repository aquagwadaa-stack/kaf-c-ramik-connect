## Supprimer les trois traits colorés du héros

### Contexte
Le composant `src/components/organic-shapes.tsx` contient trois petits traits (rose, vert, jaune) qui apparaissent en haut et en bas de la section héros. L'utilisateur souhaite les supprimer.

### Changement
Dans `src/components/organic-shapes.tsx`, retirer les trois lignes de `<span>` suivantes :

- Ligne 18 : `<span className="absolute left-[18%] top-16 h-2 w-14 rotate-[-18deg] rounded-full bg-rose/70" />`
- Ligne 19 : `<span className="absolute right-[30%] top-12 h-2 w-12 rotate-[24deg] rounded-full bg-sage/70" />`
- Ligne 20 : `<span className="absolute bottom-12 left-[45%] h-2 w-16 rotate-[8deg] rounded-full bg-mustard/70" />`

Les formes de céramique (assiette, vase, bol, tasse) restent inchangées.

### Fichier concerné
- `src/components/organic-shapes.tsx`