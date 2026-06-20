import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { PageShell, PageHeader } from "@/components/page-shell";
import { Filter } from "lucide-react";

export const Route = createFileRoute("/objets")({
  head: () => ({
    meta: [
      { title: "Objets à peindre — Kafé Céramik" },
      { name: "description", content: "Catalogue des céramiques disponibles à peindre : tasses, bols, vases, figurines et plus." },
    ],
  }),
  component: ObjetsPage,
});

type Obj = { name: string; cat: string; price: string; emoji: string; bg: string };

const items: Obj[] = [
  { name: "Tasse classique", cat: "Tasses", price: "18 €", emoji: "☕", bg: "bg-rose/70" },
  { name: "Mug XL", cat: "Tasses", price: "22 €", emoji: "🍵", bg: "bg-mustard/60" },
  { name: "Bol breton", cat: "Bols", price: "20 €", emoji: "🥣", bg: "bg-sage/40" },
  { name: "Bol mini", cat: "Bols", price: "15 €", emoji: "🍜", bg: "bg-cream" },
  { name: "Assiette plate", cat: "Assiettes", price: "25 €", emoji: "🍽️", bg: "bg-rose/50" },
  { name: "Assiette à dessert", cat: "Assiettes", price: "20 €", emoji: "🍰", bg: "bg-mustard/50" },
  { name: "Vase soliflore", cat: "Vases", price: "28 €", emoji: "🌸", bg: "bg-sage/30" },
  { name: "Vase rond", cat: "Vases", price: "35 €", emoji: "🌿", bg: "bg-rose/60" },
  { name: "Chat porte-bonheur", cat: "Figurines", price: "18 €", emoji: "🐱", bg: "bg-cream" },
  { name: "Tortue déco", cat: "Figurines", price: "22 €", emoji: "🐢", bg: "bg-sage/40" },
  { name: "Licorne enfant", cat: "Enfants", price: "16 €", emoji: "🦄", bg: "bg-rose/70" },
  { name: "Dinosaure", cat: "Enfants", price: "16 €", emoji: "🦖", bg: "bg-mustard/60" },
  { name: "Photophore étoile", cat: "Décorations", price: "20 €", emoji: "✨", bg: "bg-cream" },
  { name: "Suspension cœur", cat: "Décorations", price: "12 €", emoji: "💗", bg: "bg-rose/60" },
];

const cats = ["Tous", "Tasses", "Bols", "Assiettes", "Vases", "Figurines", "Enfants", "Décorations"];

function ObjetsPage() {
  const [cat, setCat] = useState("Tous");
  const list = cat === "Tous" ? items : items.filter((i) => i.cat === cat);
  return (
    <PageShell>
      <PageHeader
        eyebrow="Catalogue"
        title="Objets à peindre"
        description="Choisissez votre pièce le jour de votre venue. Voici un aperçu de ce qui est généralement disponible — la sélection évolue chaque semaine."
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

        <div className="mt-6 grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
          {list.map((it) => (
            <div key={it.name} className="overflow-hidden rounded-3xl border border-border bg-card">
              <div className={`flex aspect-square items-center justify-center text-6xl ${it.bg}`}>
                <span>{it.emoji}</span>
              </div>
              <div className="p-4">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">{it.cat}</div>
                <div className="mt-0.5 font-medium">{it.name}</div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">à partir de</span>
                  <span className="font-display text-lg">{it.price}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-3xl bg-sage/20 p-6 text-center sm:p-10">
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
