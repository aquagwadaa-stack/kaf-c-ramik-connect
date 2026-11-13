/*
 * Vérifie les règles des catégories du catalogue (sans navigateur ni base de données).
 * Lancer avec : bun scripts/check-object-categories.ts
 */
import assert from "node:assert/strict";
import {
  CATEGORY_COLORS,
  CATEGORY_COLOR_KEYS,
  CATEGORY_DECORATIONS,
  CATEGORY_LABEL_MAX,
  contrastRatio,
  countCategoryObjects,
  createCategoryId,
  filterObjectsByCategory,
  findCategory,
  getPublicCatalog,
  moveCategory,
  normalizeObjectCategories,
  objectCategoriesSeed,
  removeCategory,
  resolveSelectedCategory,
  sameCategories,
  selectableCategories,
  validateCategories,
  validateCategoryLabel,
  type ObjectCategory,
} from "../src/lib/object-categories";

type Item = { id: string; category: string; visible?: boolean };

let passed = 0;
function check(name: string, run: () => void) {
  run();
  passed += 1;
  console.log(`ok - ${name}`);
}

const categories: ObjectCategory[] = [
  { id: "noel", label: "Noël", color: "rouge-noel", decoration: "noel", visible: true },
  { id: "Tasses", label: "Tasses", color: "creme", decoration: "none", visible: true },
  { id: "Deco", label: "Décorations", color: "creme", decoration: "none", visible: true },
  {
    id: "Petites pieces",
    label: "Petites pièces",
    color: "creme",
    decoration: "none",
    visible: true,
  },
  {
    id: "carnaval",
    label: "Carnaval",
    color: "violet-carnaval",
    decoration: "carnaval",
    visible: true,
  },
  {
    id: "halloween",
    label: "Halloween",
    color: "orange-halloween",
    decoration: "halloween",
    visible: false,
  },
];

const objects: Item[] = [
  { id: "t1", category: "Tasses" },
  { id: "t2", category: "Tasses", visible: false },
  { id: "d1", category: "Deco" },
  { id: "p1", category: "Petites pieces", visible: true },
  { id: "n1", category: "noel" },
  { id: "n2", category: "noel" },
  { id: "h1", category: "halloween" },
  { id: "x1", category: "categorie-supprimee" },
];

const ids = (list: { id: string }[]) => list.map((item) => item.id);

check(
  "les onglets suivent l'ordre exact de la liste, sans les catégories vides ou masquées",
  () => {
    const { tabs } = getPublicCatalog(objects, categories);
    assert.deepEqual(ids(tabs), ["noel", "Tasses", "Deco", "Petites pieces"]);
    const reordered = moveCategory(categories, "noel", 1);
    assert.deepEqual(ids(getPublicCatalog(objects, reordered).tabs), [
      "Tasses",
      "noel",
      "Deco",
      "Petites pieces",
    ]);
  },
);

check("« Tous » montre tous les objets visibles, y compris l'objet orphelin", () => {
  const { objects: visible } = getPublicCatalog(objects, categories);
  assert.deepEqual(ids(visible), ["t1", "d1", "p1", "n1", "n2", "x1"]);
  assert.deepEqual(ids(filterObjectsByCategory(visible, null)), ids(visible));
});

check("chaque onglet montre exactement ses objets, par identifiant", () => {
  const { objects: visible, tabs } = getPublicCatalog(objects, categories);
  for (const tab of tabs) {
    const expected = objects.filter((item) => item.category === tab.id && item.visible !== false);
    assert.deepEqual(ids(filterObjectsByCategory(visible, tab.id)), ids(expected));
  }
  assert.deepEqual(ids(filterObjectsByCategory(visible, "noel")), ["n1", "n2"]);
  assert.deepEqual(ids(filterObjectsByCategory(visible, "Tasses")), ["t1"]);
});

check("le filtre ne dépend pas du nom : deux catégories renommées restent distinctes", () => {
  const renamed = categories.map((category) =>
    category.id === "Deco" ? { ...category, label: "Cadeaux" } : category,
  );
  const { objects: visible, tabs } = getPublicCatalog(objects, renamed);
  assert.equal(findCategory(tabs, "Deco")?.label, "Cadeaux");
  assert.deepEqual(ids(filterObjectsByCategory(visible, "Deco")), ["d1"]);
});

check("catégorie masquée : ni onglet ni objets, même dans « Tous »", () => {
  const { objects: visible, tabs } = getPublicCatalog(objects, categories);
  assert.equal(
    tabs.some((tab) => tab.id === "halloween"),
    false,
  );
  assert.equal(
    visible.some((item) => item.id === "h1"),
    false,
  );
  const hidden = categories.map((category) =>
    category.id === "noel" ? { ...category, visible: false } : category,
  );
  const next = getPublicCatalog(objects, hidden);
  assert.equal(
    next.tabs.some((tab) => tab.id === "noel"),
    false,
  );
  assert.deepEqual(ids(next.objects), ["t1", "d1", "p1", "x1"]);
});

check("catégorie vide ou sans objet visible : pas d'onglet", () => {
  const { tabs } = getPublicCatalog(objects, categories);
  assert.equal(
    tabs.some((tab) => tab.id === "carnaval"),
    false,
  );
  const onlyHidden = getPublicCatalog(
    [{ id: "a", category: "Tasses", visible: false }],
    categories,
  );
  assert.deepEqual(onlyHidden.tabs, []);
  assert.deepEqual(onlyHidden.objects, []);
});

check("objet orphelin : visible dans « Tous », aucun onglet, aucune erreur", () => {
  const { objects: visible, tabs } = getPublicCatalog(objects, categories);
  assert.equal(
    visible.some((item) => item.id === "x1"),
    true,
  );
  assert.equal(
    tabs.some((tab) => tab.id === "categorie-supprimee"),
    false,
  );
  assert.equal(findCategory(categories, "categorie-supprimee"), undefined);
  assert.deepEqual(getPublicCatalog([], categories), { objects: [], tabs: [] });
});

check("retour à « Tous » si l'onglet sélectionné disparaît", () => {
  const { tabs } = getPublicCatalog(objects, categories);
  assert.equal(resolveSelectedCategory("noel", tabs), "noel");
  assert.equal(resolveSelectedCategory(null, tabs), null);
  assert.equal(resolveSelectedCategory("halloween", tabs), null);
  assert.equal(resolveSelectedCategory("carnaval", tabs), null);
  assert.equal(resolveSelectedCategory("inconnue", tabs), null);
});

check("rétrocompatibilité : les ids historiques s'affichent sous leur nom, sans réécriture", () => {
  const legacy: Item[] = [
    { id: "a", category: "Deco" },
    { id: "b", category: "Petites pieces" },
    { id: "c", category: "Tasses" },
    { id: "d", category: "Bols" },
    { id: "e", category: "Assiettes" },
    { id: "f", category: "Figurines" },
    { id: "g", category: "Vases" },
  ];
  const { objects: visible, tabs } = getPublicCatalog(legacy, objectCategoriesSeed);
  assert.equal(visible.length, 7);
  assert.equal(findCategory(tabs, "Deco")?.label, "Décorations");
  assert.equal(findCategory(tabs, "Petites pieces")?.label, "Petites pièces");
  assert.deepEqual(ids(tabs), [
    "Tasses",
    "Bols",
    "Assiettes",
    "Figurines",
    "Vases",
    "Petites pieces",
    "Deco",
  ]);
});

check(
  "valeurs par défaut : Noël en premier, 13 catégories valides, fêtes avec leur décoration",
  () => {
    assert.equal(objectCategoriesSeed.length, 13);
    assert.equal(objectCategoriesSeed[0].id, "noel");
    assert.equal(validateCategories(objectCategoriesSeed), null);
    assert.equal(new Set(ids(objectCategoriesSeed)).size, 13);
    for (const key of [
      "noel",
      "carnaval",
      "saint-valentin",
      "paques",
      "fete-des-meres",
      "halloween",
    ]) {
      const category = findCategory(objectCategoriesSeed, key);
      assert.ok(category, key);
      assert.equal(category.decoration, key);
      const advised = CATEGORY_DECORATIONS.find((item) => item.key === key);
      assert.equal(category.color, advised?.color);
    }
  },
);

check("ordre : monter, descendre, sans effet aux extrémités", () => {
  assert.deepEqual(ids(moveCategory(categories, "Tasses", -1)).slice(0, 2), ["Tasses", "noel"]);
  assert.deepEqual(ids(moveCategory(categories, "Tasses", 1)).slice(1, 3), ["Deco", "Tasses"]);
  assert.equal(moveCategory(categories, "noel", -1), categories);
  assert.equal(moveCategory(categories, "halloween", 1), categories);
  assert.equal(moveCategory(categories, "inconnue", 1), categories);
  assert.equal(moveCategory(categories, "noel", 1).length, categories.length);
});

check(
  "noms : obligatoire, 24 caractères max, doublons refusés sans tenir compte de la casse",
  () => {
    assert.ok(validateCategoryLabel("", categories));
    assert.ok(validateCategoryLabel("   ", categories));
    assert.ok(validateCategoryLabel("x".repeat(CATEGORY_LABEL_MAX + 1), categories));
    assert.equal(validateCategoryLabel("x".repeat(CATEGORY_LABEL_MAX), categories), null);
    assert.ok(validateCategoryLabel("tasses", categories));
    assert.ok(validateCategoryLabel("  NOËL ", categories));
    assert.ok(validateCategoryLabel("Tous", categories));
    assert.equal(validateCategoryLabel("Tasses", categories, "Tasses"), null);
    assert.equal(validateCategoryLabel("Fête des pères", categories), null);
    assert.ok(validateCategories([]));
    assert.ok(validateCategories([...categories, { ...categories[0], id: "autre" }]));
  },
);

check("identifiants des nouvelles catégories : cat-<slug>-<horodatage>, uniques", () => {
  const first = createCategoryId("Fête des pères", ids(categories), 1794500000000);
  assert.equal(first, "cat-fete-des-peres-1794500000000");
  const second = createCategoryId("Fête des pères", [...ids(categories), first], 1794500000000);
  assert.notEqual(second, first);
  assert.ok(createCategoryId("???", [], 1).startsWith("cat-categorie-"));
});

check("suppression : vide = directe ; avec objets = destination obligatoire et déplacement", () => {
  const empty = removeCategory(categories, objects, "carnaval");
  assert.ok(empty.ok);
  if (empty.ok) {
    assert.equal(empty.moved, 0);
    assert.equal(empty.objects, objects);
    assert.equal(
      empty.categories.some((category) => category.id === "carnaval"),
      false,
    );
  }
  assert.equal(removeCategory(categories, objects, "noel").ok, false);
  assert.equal(removeCategory(categories, objects, "noel", "noel").ok, false);
  assert.equal(removeCategory(categories, objects, "noel", "inconnue").ok, false);
  assert.equal(removeCategory(categories, objects, "inconnue").ok, false);
  const moved = removeCategory(categories, objects, "noel", "Deco");
  assert.ok(moved.ok);
  if (moved.ok) {
    assert.equal(moved.moved, 2);
    assert.equal(countCategoryObjects(moved.objects, "noel").total, 0);
    assert.equal(countCategoryObjects(moved.objects, "Deco").total, 3);
    assert.equal(moved.objects.length, objects.length);
    assert.equal(objects.filter((item) => item.category === "noel").length, 2);
  }
});

check("impossible de supprimer la dernière catégorie", () => {
  assert.equal(removeCategory([categories[0]], [], "noel").ok, false);
});

check("menu Catégorie de l'admin : sans les catégories masquées, sauf celle de l'objet", () => {
  assert.deepEqual(ids(selectableCategories(categories)), [
    "noel",
    "Tasses",
    "Deco",
    "Petites pieces",
    "carnaval",
  ]);
  assert.deepEqual(ids(selectableCategories(categories, "Tasses")), [
    "noel",
    "Tasses",
    "Deco",
    "Petites pieces",
    "carnaval",
  ]);
  // Un objet déjà rangé dans une catégorie masquée la garde dans son menu, à sa place.
  assert.deepEqual(ids(selectableCategories(categories, "halloween")), [
    "noel",
    "Tasses",
    "Deco",
    "Petites pieces",
    "carnaval",
    "halloween",
  ]);
  assert.deepEqual(
    ids(selectableCategories(categories, "inconnue")),
    ids(selectableCategories(categories)),
  );
  // Masquer ne supprime rien : la catégorie et ses objets restent dans les données.
  assert.equal(countCategoryObjects(objects, "halloween").total, 1);
  assert.ok(findCategory(categories, "halloween"));
});

check("comptage des objets par catégorie", () => {
  assert.deepEqual(countCategoryObjects(objects, "Tasses"), { total: 2, visible: 1 });
  assert.deepEqual(countCategoryObjects(objects, "carnaval"), { total: 0, visible: 0 });
});

check("normalisation : données invalides → valeurs par défaut ou valeurs sûres", () => {
  for (const bad of [
    null,
    undefined,
    42,
    "x",
    {},
    { categories: "x" },
    [],
    { categories: [] },
    [null, 3],
  ]) {
    assert.ok(sameCategories(normalizeObjectCategories(bad), objectCategoriesSeed));
  }
  const cleaned = normalizeObjectCategories({
    version: 1,
    categories: [
      { id: "a", label: "  Fête   des pères  ", color: "fluo", decoration: "licorne" },
      { id: "a", label: "Doublon d'id" },
      { id: "", label: "Sans id" },
      { id: "b", label: "   " },
      { id: "c", label: "x".repeat(40), color: "ocean", decoration: "noel", visible: false },
      "texte",
    ],
  });
  assert.deepEqual(cleaned, [
    { id: "a", label: "Fête des pères", color: "creme", decoration: "none", visible: true },
    {
      id: "c",
      label: "x".repeat(CATEGORY_LABEL_MAX),
      color: "ocean",
      decoration: "noel",
      visible: false,
    },
  ]);
  assert.ok(sameCategories(normalizeObjectCategories(categories), categories));
  assert.ok(sameCategories(normalizeObjectCategories({ version: 1, categories }), categories));
  assert.notEqual(normalizeObjectCategories(null), objectCategoriesSeed);
});

check("palette : 16 couleurs, contraste texte/fond d'au moins 4,5:1", () => {
  assert.equal(CATEGORY_COLOR_KEYS.length, 16);
  for (const key of CATEGORY_COLOR_KEYS) {
    const { bg, text } = CATEGORY_COLORS[key];
    const ratio = contrastRatio(bg, text);
    assert.ok(ratio >= 4.5, `${key} : ${ratio.toFixed(2)}`);
  }
  assert.equal(CATEGORY_COLORS.creme.bg, "#fffaf0");
  for (const item of CATEGORY_DECORATIONS) assert.ok(CATEGORY_COLORS[item.color], item.key);
});

console.log(`\n${passed} vérifications réussies.`);
