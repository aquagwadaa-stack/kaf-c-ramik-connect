import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Filter } from "lucide-react";
import { PageShell, PageHeader } from "@/components/page-shell";
import { CeramicPiece, type CeramicKind } from "@/components/ceramic-piece";
import { useCeramicObjects, type CeramicObject } from "@/lib/admin-data";

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

const categoryLabels: Record<CeramicObject["category"], string> = {
  Tasses: "Tasses",
  Bols: "Bols",
  Assiettes: "Assiettes",
  Figurines: "Figurines",
  Deco: "Décorations",
  Vases: "Vases",
  "Petites pieces": "Petites pièces",
};

const categoryKinds: Record<CeramicObject["category"], CeramicKind> = {
  Tasses: "mug",
  Bols: "bowl",
  Assiettes: "plate",
  Figurines: "vase",
  Deco: "tile",
  Vases: "vase",
  "Petites pieces": "tile",
};

const categoryTones: Record<CeramicObject["category"], string> = {
  Tasses: "bg-rose/35",
  Bols: "bg-sage/25",
  Assiettes: "bg-cream",
  Figurines: "bg-mustard/25",
  Deco: "bg-lavender/25",
  Vases: "bg-sage/20",
  "Petites pieces": "bg-rose/25",
};

function ObjetsPage() {
  const [objects] = useCeramicObjects();
  const [cat, setCat] = useState("Tous");
  const cats = useMemo(
    () => ["Tous", ...Array.from(new Set(objects.map((item) => categoryLabels[item.category])))],
    [objects],
  );
  const list =
    cat === "Tous" ? objects : objects.filter((item) => categoryLabels[item.category] === cat);

  return (
    <PageShell>
      <PageHeader
        eyebrow="Catalogue"
        title="Objets à peindre"
        description="Découvre les formes et les tarifs proposés au Kafé. Tu choisis ta pièce sur place avant de passer aux couleurs."
      />
      <section className="mx-auto max-w-6xl px-4 py-10">
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          <Filter className="h-4 w-4 shrink-0 text-muted-foreground" />
          {cats.map((category) => (
            <button
              key={category}
              onClick={() => setCat(category)}
              className={`shrink-0 rounded-full border px-4 py-1.5 text-sm ${
                cat === category
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border hover:bg-secondary"
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {list.map((item) => (
            <ObjectCard key={item.id} item={item} />
          ))}
        </div>

        <div className="mt-10 rounded-2xl bg-sage/20 p-6 text-center sm:p-10">
          <h2 className="text-2xl">Prêt·e à passer aux pinceaux ?</h2>
          <p className="mt-2 text-foreground/70">
            Réserve un créneau et choisis ta pièce sur place.
          </p>
          <Link
            to="/reserver"
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground"
          >
            Réserver un atelier
          </Link>
        </div>
      </section>
    </PageShell>
  );
}

function ObjectCard({ item }: { item: CeramicObject }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div
        className={`flex aspect-square items-center justify-center overflow-hidden p-5 ${categoryTones[item.category]}`}
      >
        {item.imageDataUrl ? (
          <img
            src={item.imageDataUrl}
            alt={item.name}
            className="h-full w-full rounded-xl object-cover"
          />
        ) : (
          <CeramicPiece kind={categoryKinds[item.category]} label={item.name} />
        )}
      </div>
      <div className="p-4">
        <div className="text-xs uppercase text-muted-foreground">
          {categoryLabels[item.category]}
        </div>
        <div className="mt-0.5 font-medium">{item.name}</div>
        {item.note && <div className="mt-1 text-xs text-muted-foreground">{item.note}</div>}
        <div className="mt-3 flex items-end justify-between gap-2 border-t border-border/60 pt-3">
          <span className="text-xs text-muted-foreground">Prix de la pièce</span>
          <span className="font-display text-xl">{item.price} €</span>
        </div>
      </div>
    </div>
  );
}
