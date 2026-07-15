import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Filter, Image as ImageIcon } from "lucide-react";
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
        description="Un aperçu des pièces disponibles au Kafé. La sélection évolue selon les arrivages, les réservations et les cuissons."
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
            Réservez un créneau et choisissez votre pièce sur place.
          </p>
          <Link
            to="/reserver"
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground"
          >
            Réserver mon atelier
          </Link>
        </div>
      </section>
    </PageShell>
  );
}

function ObjectCard({ item }: { item: CeramicObject }) {
  const available = item.availability !== "unavailable";
  return (
    <div
      className={`overflow-hidden rounded-2xl border border-border bg-card ${!available ? "opacity-60" : ""}`}
    >
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
          <div className="relative h-full w-full">
            <CeramicPiece kind={categoryKinds[item.category]} label={item.name} />
            {!available && (
              <div className="absolute inset-0 grid place-items-center rounded-xl bg-background/65">
                <ImageIcon className="h-8 w-8 text-muted-foreground" />
              </div>
            )}
          </div>
        )}
      </div>
      <div className="p-4">
        <div className="text-xs uppercase text-muted-foreground">
          {categoryLabels[item.category]}
        </div>
        <div className="mt-0.5 font-medium">{item.name}</div>
        {item.note && <div className="mt-1 text-xs text-muted-foreground">{item.note}</div>}
        <div className="mt-3 flex items-center justify-between gap-2">
          <span
            className={`rounded-full px-2.5 py-1 text-[11px] ${
              item.availability === "available"
                ? "bg-sage/20 text-sage"
                : item.availability === "limited"
                  ? "bg-mustard/25 text-brick"
                  : "bg-muted text-muted-foreground"
            }`}
          >
            {item.availability === "available" && "Disponible"}
            {item.availability === "limited" && "Stock limité"}
            {item.availability === "unavailable" && "Indisponible"}
          </span>
          <span className="font-display text-lg">{item.price} EUR</span>
        </div>
      </div>
    </div>
  );
}
