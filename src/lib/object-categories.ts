/*
 * Catégories du catalogue « Objets à peindre ».
 * Module sans React ni accès réseau : modèle, palette, valeurs par défaut et règles
 * (filtre, ordre, validation, suppression). Utilisé par la page publique et par l'admin.
 */

export type CategoryDecoration =
  | "none"
  | "noel"
  | "carnaval"
  | "saint-valentin"
  | "paques"
  | "fete-des-meres"
  | "halloween";

export type CategoryColorKey =
  | "creme"
  | "rose"
  | "corail"
  | "moutarde"
  | "sauge"
  | "aqua"
  | "ciel"
  | "lavande"
  | "lilas"
  | "vert-paques"
  | "orange-halloween"
  | "rouge-noel"
  | "rose-valentin"
  | "violet-carnaval"
  | "vert-sapin"
  | "ocean";

export interface ObjectCategory {
  /** Stable, jamais modifié après création. */
  id: string;
  /** Nom affiché, 1 à 24 caractères, unique sans tenir compte de la casse. */
  label: string;
  color: CategoryColorKey;
  decoration: CategoryDecoration;
  /** false = l'onglet ET ses objets disparaissent du site. */
  visible: boolean;
}

/** Forme minimale d'un objet du catalogue dont ces règles ont besoin. */
export type CategorizedObject = { category: string; visible?: boolean };

export const CATEGORY_INK = "#3e2a31";
export const CATEGORY_CREAM = "#fffaf0";
export const CATEGORY_LABEL_MAX = 24;
export const OBJECT_CATEGORIES_VERSION = 1;

/** Palette fermée : le texte est fixé par couleur pour garder un contraste d'au moins 4,5:1. */
export const CATEGORY_COLORS: Record<
  CategoryColorKey,
  { label: string; bg: string; text: string }
> = {
  creme: { label: "Crème (style actuel)", bg: "#fffaf0", text: CATEGORY_INK },
  rose: { label: "Rose", bg: "#e7b4c5", text: CATEGORY_INK },
  corail: { label: "Corail", bg: "#ffc1b6", text: CATEGORY_INK },
  moutarde: { label: "Moutarde", bg: "#e5cf78", text: CATEGORY_INK },
  sauge: { label: "Sauge", bg: "#8faa93", text: CATEGORY_INK },
  aqua: { label: "Aqua", bg: "#d0f0ed", text: CATEGORY_INK },
  ciel: { label: "Ciel", bg: "#dce6f7", text: CATEGORY_INK },
  lavande: { label: "Lavande", bg: "#e6d6f7", text: CATEGORY_INK },
  lilas: { label: "Lilas", bg: "#c6adef", text: CATEGORY_INK },
  "vert-paques": { label: "Vert tendre", bg: "#a9d89b", text: CATEGORY_INK },
  "orange-halloween": { label: "Orange", bg: "#f08a35", text: CATEGORY_INK },
  "rouge-noel": { label: "Rouge Noël", bg: "#c8413b", text: CATEGORY_CREAM },
  "rose-valentin": { label: "Framboise", bg: "#c4405f", text: CATEGORY_CREAM },
  "violet-carnaval": { label: "Violet", bg: "#7d4fc9", text: CATEGORY_CREAM },
  "vert-sapin": { label: "Vert sapin", bg: "#3f7d4e", text: CATEGORY_CREAM },
  ocean: { label: "Océan", bg: "#294f60", text: CATEGORY_CREAM },
};

export const CATEGORY_COLOR_KEYS = Object.keys(CATEGORY_COLORS) as CategoryColorKey[];

/** Petits dessins proposés, avec la couleur conseillée pour chacun. */
export const CATEGORY_DECORATIONS: {
  key: CategoryDecoration;
  label: string;
  color: CategoryColorKey;
}[] = [
  { key: "none", label: "Aucun", color: "creme" },
  { key: "noel", label: "Noël", color: "rouge-noel" },
  { key: "carnaval", label: "Carnaval", color: "violet-carnaval" },
  { key: "saint-valentin", label: "Saint-Valentin", color: "rose-valentin" },
  { key: "paques", label: "Pâques", color: "vert-paques" },
  { key: "fete-des-meres", label: "Fête des mères", color: "lilas" },
  { key: "halloween", label: "Halloween", color: "orange-halloween" },
];

const DECORATION_KEYS = CATEGORY_DECORATIONS.map((item) => item.key);

/**
 * Valeurs par défaut, utilisées tant que l'admin n'a jamais enregistré.
 * Les 7 catégories historiques gardent comme id la valeur déjà stockée dans les objets
 * ("Deco", "Petites pieces"…) : aucun objet existant n'a besoin d'être réécrit.
 */
export const objectCategoriesSeed: ObjectCategory[] = [
  { id: "noel", label: "Noël", color: "rouge-noel", decoration: "noel", visible: true },
  { id: "Tasses", label: "Tasses", color: "creme", decoration: "none", visible: true },
  { id: "Bols", label: "Bols", color: "creme", decoration: "none", visible: true },
  { id: "Assiettes", label: "Assiettes", color: "creme", decoration: "none", visible: true },
  { id: "Figurines", label: "Figurines", color: "creme", decoration: "none", visible: true },
  { id: "Vases", label: "Vases", color: "creme", decoration: "none", visible: true },
  {
    id: "Petites pieces",
    label: "Petites pièces",
    color: "creme",
    decoration: "none",
    visible: true,
  },
  { id: "Deco", label: "Décorations", color: "creme", decoration: "none", visible: true },
  {
    id: "carnaval",
    label: "Carnaval",
    color: "violet-carnaval",
    decoration: "carnaval",
    visible: true,
  },
  {
    id: "saint-valentin",
    label: "Saint-Valentin",
    color: "rose-valentin",
    decoration: "saint-valentin",
    visible: true,
  },
  { id: "paques", label: "Pâques", color: "vert-paques", decoration: "paques", visible: true },
  {
    id: "fete-des-meres",
    label: "Fête des mères",
    color: "lilas",
    decoration: "fete-des-meres",
    visible: true,
  },
  {
    id: "halloween",
    label: "Halloween",
    color: "orange-halloween",
    decoration: "halloween",
    visible: true,
  },
];

function cloneSeed(): ObjectCategory[] {
  return objectCategoriesSeed.map((category) => ({ ...category }));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Clé de comparaison des noms : sans casse ni espaces superflus. */
export function categoryLabelKey(label: string) {
  return label.trim().replace(/\s+/g, " ").toLocaleLowerCase("fr");
}

/**
 * Remet au propre ce qui vient du stockage (localStorage ou base).
 * Accepte `{ version, categories }` ou directement un tableau.
 * Structure invalide ou liste vide → valeurs par défaut ; couleur inconnue → crème ;
 * décoration inconnue → aucune ; entrées sans id ou sans nom, et doublons d'id, ignorés.
 */
export function normalizeObjectCategories(input: unknown): ObjectCategory[] {
  const rawList = Array.isArray(input) ? input : isRecord(input) ? input.categories : null;
  if (!Array.isArray(rawList)) return cloneSeed();

  const seenIds = new Set<string>();
  const result: ObjectCategory[] = [];
  for (const raw of rawList) {
    if (!isRecord(raw)) continue;
    const id = typeof raw.id === "string" ? raw.id : "";
    const label =
      typeof raw.label === "string"
        ? raw.label.trim().replace(/\s+/g, " ").slice(0, CATEGORY_LABEL_MAX).trim()
        : "";
    if (!id || !label || seenIds.has(id)) continue;
    seenIds.add(id);
    result.push({
      id,
      label,
      color: CATEGORY_COLOR_KEYS.includes(raw.color as CategoryColorKey)
        ? (raw.color as CategoryColorKey)
        : "creme",
      decoration: DECORATION_KEYS.includes(raw.decoration as CategoryDecoration)
        ? (raw.decoration as CategoryDecoration)
        : "none",
      visible: raw.visible !== false,
    });
  }
  return result.length > 0 ? result : cloneSeed();
}

export function findCategory(categories: ObjectCategory[], id: string) {
  return categories.find((category) => category.id === id);
}

/**
 * Ce que le site affiche.
 * - objets : visibles ET dont la catégorie n'est pas masquée. Un objet dont la catégorie
 *   est inconnue (orpheline) reste affiché dans « Tous », sans étiquette.
 * - onglets : catégories visibles qui contiennent au moins un objet visible,
 *   dans l'ordre exact de la liste (aucun tri automatique).
 */
export function getPublicCatalog<T extends CategorizedObject>(
  objects: T[],
  categories: ObjectCategory[],
): { objects: T[]; tabs: ObjectCategory[] } {
  const byId = new Map(categories.map((category) => [category.id, category]));
  const visibleObjects = objects.filter((item) => {
    if (item.visible === false) return false;
    const category = byId.get(item.category);
    return category ? category.visible : true;
  });
  const usedIds = new Set(visibleObjects.map((item) => item.category));
  const tabs = categories.filter((category) => category.visible && usedIds.has(category.id));
  return { objects: visibleObjects, tabs };
}

/** Filtre exact par identifiant. `null` = onglet « Tous ». */
export function filterObjectsByCategory<T extends CategorizedObject>(
  objects: T[],
  categoryId: string | null,
): T[] {
  if (categoryId === null) return objects;
  return objects.filter((item) => item.category === categoryId);
}

/** Si l'onglet sélectionné n'existe plus (masqué, vidé, supprimé), retour à « Tous ». */
export function resolveSelectedCategory(selectedId: string | null, tabs: ObjectCategory[]) {
  if (selectedId === null) return null;
  return tabs.some((category) => category.id === selectedId) ? selectedId : null;
}

export function countCategoryObjects(objects: CategorizedObject[], categoryId: string) {
  let total = 0;
  let visible = 0;
  for (const item of objects) {
    if (item.category !== categoryId) continue;
    total += 1;
    if (item.visible !== false) visible += 1;
  }
  return { total, visible };
}

/** Renvoie un message d'erreur en français, ou `null` si le nom est valide. */
export function validateCategoryLabel(
  label: string,
  categories: ObjectCategory[],
  selfId?: string,
): string | null {
  const clean = label.trim().replace(/\s+/g, " ");
  if (!clean) return "Donne un nom à cette catégorie.";
  if (clean.length > CATEGORY_LABEL_MAX) {
    return `Le nom ne peut pas dépasser ${CATEGORY_LABEL_MAX} caractères.`;
  }
  if (categoryLabelKey(clean) === "tous") {
    return "« Tous » est déjà le nom du premier onglet.";
  }
  const key = categoryLabelKey(clean);
  const duplicate = categories.some(
    (category) => category.id !== selfId && categoryLabelKey(category.label) === key,
  );
  if (duplicate) return "Une autre catégorie porte déjà ce nom.";
  return null;
}

/** Première erreur de la liste entière (pour bloquer l'enregistrement), ou `null`. */
export function validateCategories(categories: ObjectCategory[]): string | null {
  if (categories.length === 0) return "Il faut au moins une catégorie.";
  for (const category of categories) {
    const error = validateCategoryLabel(category.label, categories, category.id);
    if (error) return error;
  }
  return null;
}

function slugify(label: string) {
  return (
    label
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 32) || "categorie"
  );
}

/** Identifiant d'une nouvelle catégorie : `cat-<slug>-<horodatage>`, garanti unique. */
export function createCategoryId(label: string, existingIds: Iterable<string>, now: number) {
  const taken = new Set(existingIds);
  const base = `cat-${slugify(label)}-${now}`;
  let id = base;
  let suffix = 2;
  while (taken.has(id)) {
    id = `${base}-${suffix}`;
    suffix += 1;
  }
  return id;
}

/** Monte (-1) ou descend (+1) une catégorie d'un cran. Sans effet aux extrémités. */
export function moveCategory(
  categories: ObjectCategory[],
  id: string,
  direction: -1 | 1,
): ObjectCategory[] {
  const index = categories.findIndex((category) => category.id === id);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= categories.length) return categories;
  const next = [...categories];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

export type RemoveCategoryResult<T> =
  | { ok: true; categories: ObjectCategory[]; objects: T[]; moved: number }
  | { ok: false; error: string };

/**
 * Supprime une catégorie. Si elle contient des objets, une catégorie de destination
 * est obligatoire : les objets y sont déplacés. La dernière catégorie ne se supprime pas.
 */
export function removeCategory<T extends CategorizedObject>(
  categories: ObjectCategory[],
  objects: T[],
  id: string,
  destinationId?: string,
): RemoveCategoryResult<T> {
  if (!categories.some((category) => category.id === id)) {
    return { ok: false, error: "Cette catégorie n'existe plus." };
  }
  if (categories.length <= 1) {
    return { ok: false, error: "Impossible de supprimer la dernière catégorie." };
  }
  const moved = objects.filter((item) => item.category === id).length;
  if (moved > 0) {
    if (!destinationId || destinationId === id) {
      return { ok: false, error: "Choisis la catégorie où déplacer les objets." };
    }
    if (!categories.some((category) => category.id === destinationId)) {
      return { ok: false, error: "La catégorie de destination n'existe plus." };
    }
  }
  return {
    ok: true,
    categories: categories.filter((category) => category.id !== id),
    objects:
      moved > 0 && destinationId
        ? objects.map((item) =>
            item.category === id ? { ...item, category: destinationId } : item,
          )
        : objects,
    moved,
  };
}

/** Vrai si les deux listes sont identiques, ordre compris. */
export function sameCategories(a: ObjectCategory[], b: ObjectCategory[]) {
  return (
    a.length === b.length &&
    a.every((category, index) => {
      const other = b[index];
      return (
        category.id === other.id &&
        category.label === other.label &&
        category.color === other.color &&
        category.decoration === other.decoration &&
        category.visible === other.visible
      );
    })
  );
}

function channelLuminance(value: number) {
  const channel = value / 255;
  return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance(hex: string) {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return 0.2126 * channelLuminance(r) + 0.7152 * channelLuminance(g) + 0.0722 * channelLuminance(b);
}

/** Rapport de contraste WCAG entre deux couleurs hexadécimales (#rrggbb). */
export function contrastRatio(first: string, second: string) {
  const a = relativeLuminance(first);
  const b = relativeLuminance(second);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}
