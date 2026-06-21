import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { PageShell, PageHeader } from "@/components/page-shell";
import { Filter } from "lucide-react";
import { CeramicPiece, type CeramicKind } from "@/components/ceramic-piece";

export const Route = createFileRoute("/objets")({
  head: () => ({
    meta: [
      { title: "Objets à peindre — Kafé Céramik" },
      { name: "description", content: "Catalogue des céramiques disponibles à peindre : tasses, bols, vases, assiettes et plus." },
    ],
  }),
  component: ObjetsPage,
});

type Obj = { name: string; cat: string; price: string; kind: CeramicKind; bg: string; note?: string };

const items: Obj[] = [
  { name: "Tasse classique", cat: "Tasses", price: "18 €", kind: "mug", bg: "bg-rose/35", note: "format café" },
  { name: "Mug XL", cat: "Tasses", price: "22 €", kind: "mug", bg: "bg-mustard/30", note: "grand format" },
  { name: "Tasse design", cat: "Tasses", price: "36 €", kind: "mug", bg: "bg-lavender/25", note: "anse travaillée" },
  { name: "Tasse texturée", cat: "Tasses", price: "30 €", kind: "mug", bg: "bg-sage/20", note: "reliefs ou bulles" },
  { name: "Bol du matin", cat: "Bols", price: "20 €", kind: "bowl", bg: "bg-sage/25" },
  { name: "Bol mini", cat: "Bols", price: "15 €", kind: "bowl", bg: "bg-cream" },
  { name: "Bol vague", cat: "Bols", price: "34 €", kind: "bowl", bg: "bg-rose/25" },
  { name: "Bol matcha", cat: "Bols", price: "38 €", kind: "bowl", bg: "bg-mustard/20" },
  { name: "Assiette plate", cat: "Assiettes", price: "25 €", kind: "plate", bg: "bg-rose/25" },
  { name: "Assiette dessert", cat: "Assiettes", price: "20 €", kind: "plate", bg: "bg-mustard/25" },
  { name: "Assiette coquillage", cat: "Assiettes", price: "38 €", kind: "plate", bg: "bg-sage/20", note: "forme décorative" },
  { name: "Plateau apéro", cat: "Assiettes", price: "42 €", kind: "plate", bg: "bg-cream" },
  { name: "Vase soliflore", cat: "Vases", price: "28 €", kind: "vase", bg: "bg-sage/25" },
  { name: "Vase rond", cat: "Vases", price: "35 €", kind: "vase", bg: "bg-rose/30" },
  { name: "Gros pot", cat: "Vases", price: "44 €", kind: "vase", bg: "bg-mustard/25" },
  { name: "Pichet décoratif", cat: "Décorations", price: "32 €", kind: "pitcher", bg: "bg-cream" },
  { name: "Carreau à motif", cat: "Décorations", price: "16 €", kind: "tile", bg: "bg-sage/20" },
  { name: "Suspension murale", cat: "Décorations", price: "12 €", kind: "tile", bg: "bg-rose/35" },
  { name: "Porte-savon", cat: "Décorations", price: "24 €", kind: "tile", bg: "bg-lavender/25" },
  { name: "Cuillère déco", cat: "Décorations", price: "12 €", kind: "tile", bg: "bg-cream" },
  { name: "Petite pièce enfant", cat: "Enfants", price: "16 €", kind: "tile", bg: "bg-mustard/25" },
  { name: "Petit dragon", cat: "Figurines", price: "32 €", kind: "vase", bg: "bg-sage/25", note: "figurine à peindre" },
  { name: "Licorne", cat: "Figurines", price: "28 €", kind: "vase", bg: "bg-rose/30", note: "format enfant" },
  { name: "Grenouille", cat: "Figurines", price: "36 €", kind: "bowl", bg: "bg-mustard/25" },
  { name: "Boîte lapin", cat: "Figurines", price: "44 €", kind: "bowl", bg: "bg-cream" },
  { name: "Mini champignon", cat: "Mini décos", price: "10 €", kind: "tile", bg: "bg-rose/25" },
  { name: "Coquillage mini", cat: "Mini décos", price: "10 €", kind: "tile", bg: "bg-sage/20" },
  { name: "Petit fruit", cat: "Mini décos", price: "10 €", kind: "tile", bg: "bg-lavender/25" },
  { name: "Mini tasse", cat: "Mini décos", price: "16 €", kind: "mug", bg: "bg-mustard/20" },
];

const cats = ["Tous", "Tasses", "Bols", "Assiettes", "Vases", "Figurines", "Mini décos", "Enfants", "Décorations"];

function ObjetsPage() {
  const [cat, setCat] = useState("Tous");
  const list = cat === "Tous" ? items : items.filter((i) => i.cat === cat);
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
          {cats.map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={`shrink-0 rounded-full border px-4 py-1.5 text-sm ${
                cat === c ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-secondary"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {list.map((it) => (
            <div key={it.name} className="overflow-hidden rounded-2xl border border-border bg-card">
              <div className={`flex aspect-square items-center justify-center p-5 ${it.bg}`}>
                <CeramicPiece kind={it.kind} label={it.name} />
              </div>
              <div className="p-4">
                <div className="text-xs uppercase text-muted-foreground">{it.cat}</div>
                <div className="mt-0.5 font-medium">{it.name}</div>
                {it.note && <div className="mt-1 text-xs text-muted-foreground">{it.note}</div>}
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">à partir de</span>
                  <span className="font-display text-lg">{it.price}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-2xl bg-sage/20 p-6 text-center sm:p-10">
          <h2 className="text-2xl">Prêt·e à passer aux pinceaux ?</h2>
          <p className="mt-2 text-foreground/70">Réservez un créneau et choisissez votre pièce sur place.</p>
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
