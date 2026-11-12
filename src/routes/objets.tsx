import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Filter } from "lucide-react";
import { PageShell, PageHeader } from "@/components/page-shell";
import { CeramicPiece, type CeramicKind } from "@/components/ceramic-piece";
import { CategoryChip } from "@/components/category-chip";
import { useCeramicObjects, useObjectCategories, type CeramicObject } from "@/lib/admin-data";
import {
  CATEGORY_COLORS,
  filterObjectsByCategory,
  findCategory,
  getPublicCatalog,
  resolveSelectedCategory,
  type ObjectCategory,
} from "@/lib/object-categories";

export const Route = createFileRoute("/objets")({
  head: () => ({
    meta: [
      { title: "Objets à peindre — Kafé Céramik" },
      {
        name: "description",
        content:
          "Catalogue des céramiques disponibles à peindre : tasses, bols, vases, assiettes et plus.",
      },
    ],
  }),
  component: ObjetsPage,
});

// Correspondance historique des 7 premières catégories (fond et dessin quand il n'y a pas de photo).
const legacyKinds: Record<string, CeramicKind> = {
  Tasses: "mug",
  Bols: "bowl",
  Assiettes: "plate",
  Figurines: "vase",
  Deco: "tile",
  Vases: "vase",
  "Petites pieces": "tile",
};

const legacyTones: Record<string, string> = {
  Tasses: "bg-rose/35",
  Bols: "bg-sage/25",
  Assiettes: "bg-cream",
  Figurines: "bg-mustard/25",
  Deco: "bg-lavender/25",
  Vases: "bg-sage/20",
  "Petites pieces": "bg-rose/25",
};

function ObjetsPage() {
  const [allObjects] = useCeramicObjects();
  const [categories] = useObjectCategories();
  const catalog = useMemo(() => getPublicCatalog(allObjects, categories), [allObjects, categories]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Si l'onglet choisi disparaît (catégorie masquée, vidée ou supprimée), retour à « Tous ».
  const activeId = resolveSelectedCategory(selectedId, catalog.tabs);
  const list = filterObjectsByCategory(catalog.objects, activeId);

  return (
    <PageShell>
      <PageHeader
        eyebrow="Catalogue"
        title="Objets à peindre"
        description="Découvre les formes et les tarifs proposés au Kafé. Tu choisis ta pièce sur place avant de passer aux couleurs."
      />
      <section className="border-b-2 border-ink bg-[#ffd6a5] px-4 py-10">
        <div className="mx-auto max-w-6xl">
          <div className="no-scrollbar flex items-center gap-2 overflow-x-auto pb-2">
            <Filter className="h-4 w-4 shrink-0 text-muted-foreground" />
            <CategoryChip
              label="Tous"
              active={activeId === null}
              onClick={() => setSelectedId(null)}
            />
            {catalog.tabs.map((category) => (
              <CategoryChip
                key={category.id}
                label={category.label}
                color={category.color}
                decoration={category.decoration}
                active={activeId === category.id}
                onClick={() => setSelectedId(category.id)}
              />
            ))}
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {list.map((item) => (
              <ObjectCard
                key={item.id}
                item={item}
                category={findCategory(categories, item.category)}
              />
            ))}
          </div>

          <div className="kafe-block-link mt-10 bg-[#d6ead4] p-6 text-center sm:p-10">
            <h2 className="text-2xl">Prêt·e à passer aux pinceaux ?</h2>
            <p className="mt-2 text-foreground/70">
              Réserve un créneau et choisis ta pièce sur place.
            </p>
            <Link
              to="/reserver"
              className="kafe-block-link mt-5 inline-flex items-center gap-2 bg-primary px-5 py-3 text-sm font-bold text-primary-foreground"
            >
              Réserver un atelier
            </Link>
          </div>
        </div>
      </section>
    </PageShell>
  );
}

function ObjectCard({ item, category }: { item: CeramicObject; category?: ObjectCategory }) {
  const legacyTone = legacyTones[item.category];
  // Nouvelle catégorie : une teinte claire de sa couleur. Catégorie inconnue : crème.
  const toneStyle =
    !legacyTone && category
      ? {
          backgroundColor: `color-mix(in oklab, ${CATEGORY_COLORS[category.color].bg} 25%, #fffaf0)`,
        }
      : undefined;
  return (
    <div className="kafe-block-link overflow-hidden bg-card">
      <div
        className={`flex aspect-square items-center justify-center overflow-hidden p-5 ${legacyTone ?? (category ? "" : "bg-cream")}`}
        style={toneStyle}
      >
        {item.imageDataUrl ? (
          <img
            src={item.imageDataUrl}
            alt={item.name}
            className="h-full w-full rounded-lg border-2 border-ink object-cover"
          />
        ) : (
          <CeramicPiece kind={legacyKinds[item.category] ?? "tile"} label={item.name} />
        )}
      </div>
      <div className="p-4">
        {category && (
          <div className="text-xs uppercase text-muted-foreground">{category.label}</div>
        )}
        <div className="mt-0.5 font-medium">{item.name}</div>
        {item.note && <div className="mt-1 text-xs text-muted-foreground">{item.note}</div>}
        <div className="mt-3 flex items-end justify-between gap-2 border-t border-border/60 pt-3">
          <span className="text-xs text-muted-foreground">Prix de la pièce</span>
          <span className="whitespace-nowrap font-display text-xl">{`${item.price}\u00a0€`}</span>
        </div>
      </div>
    </div>
  );
}
