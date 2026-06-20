import { createFileRoute } from "@tanstack/react-router";
import { Coffee, CroissantIcon, CupSoda, Sparkles } from "lucide-react";
import { PageShell, PageHeader } from "@/components/page-shell";
import { CeramicPiece } from "@/components/ceramic-piece";

export const Route = createFileRoute("/carte")({
  head: () => ({
    meta: [
      { title: "Carte café — Kafé Céramik" },
      { name: "description", content: "Cafés, jus frais, boissons gourmandes, brunch et pâtisseries maison du Kafé Céramik." },
    ],
  }),
  component: CartePage,
});

type Item = { name: string; desc?: string; price: string; tag?: string };

const sections: { title: string; subtitle: string; items: Item[]; accent: string }[] = [
  {
    title: "Cafés et compagnie",
    subtitle: "chaud ou glacé selon l'humeur",
    accent: "text-brick",
    items: [
      { name: "Espresso / allongé", price: "3 €" },
      { name: "Double espresso", price: "4 €" },
      { name: "Café bombon", desc: "espresso, lait concentré sucré, chantilly", price: "4 €" },
      { name: "Cappuccino ou iced cappuccino", desc: "lait amande ou coco +0,50 €", price: "4,50 €" },
      { name: "Chocolat chaud", desc: "chocolat local de communion, onctueux et parfumé", price: "4 €" },
      { name: "Chaï latte amande", desc: "chaud ou froid", price: "5 €" },
      { name: "Matcha latte coco", desc: "chaud ou froid", price: "5 €" },
      { name: "Golden latte", desc: "curcuma, gingembre, cannelle", price: "6 €" },
      { name: "Infusion / thé du moment", price: "3,50 €" },
    ],
  },
  {
    title: "Fresh juices baby",
    subtitle: "pressés, frais, colorés",
    accent: "text-sage",
    items: [
      { name: "Le Very Skinny", desc: "pomme, ananas, concombre, citron vert, menthe, épinard", price: "8 €" },
      { name: "Le Vitamine Sea", desc: "carotte, ananas, orange, gingembre", price: "8 €" },
      { name: "Le Ti Bo Doudou", desc: "symbiose éphémère à découvrir au comptoir", price: "8 €" },
      { name: "La Piña Coco Lada", desc: "ananas, lait de coco, sucre de canne, citron vert", price: "8 €" },
      { name: "Ginger beer maison", desc: "boisson probiotique sans alcool, bien épicée", price: "6 €", tag: "spicy" },
      { name: "Orange pressée", price: "6,50 €" },
      { name: "Citron pressé", price: "3 €" },
    ],
  },
  {
    title: "Déjeunette",
    subtitle: "service en continu",
    accent: "text-rose",
    items: [
      { name: "Le Ronchon", desc: "croissant rond, œuf au plat, reblochon, jambon, sauce hollandaise", price: "16 €" },
      { name: "Le Morning Bagel", desc: "bagel, œuf, bacon crispy, philadelphia, cheddar", price: "11 €" },
      { name: "Le Summer Body", desc: "wrap, houmous, chèvre frais, légumes confits, pickles", price: "16 €" },
      { name: "Le Summer Bowl", desc: "bowl quinoa, œuf au plat, légumes, option sans gluten", price: "16 €" },
      { name: "La Sirène des Caraïbes", desc: "bagel, fromage frais, avocat, thazard fumé, roquette", price: "16 €" },
      { name: "Nutty banana bowl", desc: "yaourt, granola, noix, coco, banane, sirop d'érable", price: "12 €" },
    ],
  },
  {
    title: "Pour les gourmands",
    subtitle: "sucré, glacé, maison",
    accent: "text-mustard",
    items: [
      { name: "Le Big Macchiato", desc: "500 ml de café glacé, chantilly et topping préféré", price: "8 €" },
      { name: "Gaufre liégeoise", desc: "topping au choix : pâte à tartiner, miel, dulce de leche", price: "5,50 €" },
      { name: "Pâtisserie maison du jour", desc: "à découvrir dans la vitrine du Kafé", price: "—" },
      { name: "Petit jus d'ananas ou tropical", price: "3,50 €" },
      { name: "Eau plate / gazeuse", desc: "petite ou grande", price: "2 €" },
    ],
  },
];

function CartePage() {
  return (
    <PageShell>
      <PageHeader
        eyebrow="Carte"
        title="Kafé ou déjeunette"
        description="Service en continu de 9h30 à 18h, du mardi au dimanche."
      />
      <section className="mx-auto max-w-6xl px-4 py-10">
        <div className="checker-pink rounded-[1.75rem] border border-border p-3 sm:p-5">
          <div className="relative overflow-hidden rounded-[1.35rem] border border-cream/70 bg-cream/95 px-4 py-6 shadow-xl shadow-ink/10 sm:px-8 sm:py-8">
            <div className="absolute -right-8 -top-8 h-36 w-36 rotate-12 opacity-70">
              <CeramicPiece kind="mug" />
            </div>
            <div className="absolute -bottom-10 -left-8 h-40 w-40 rotate-[-10deg] opacity-60">
              <CeramicPiece kind="plate" />
            </div>

            <div className="relative flex flex-wrap items-end justify-between gap-5 border-b border-dashed border-ink/20 pb-6">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-sage/20 px-3 py-1 text-xs font-medium text-ink/70">
                  <Coffee className="h-3.5 w-3.5" /> by Mala Madre
                </div>
                <h2 className="mt-3 text-4xl leading-none sm:text-5xl">Kafé ou déjeunette</h2>
                <p className="mt-2 max-w-xl text-sm text-foreground/70">
                  Des classiques réconfortants, des jus frais, des petites douceurs et de quoi tenir entre deux coups de pinceau.
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-card/90 px-4 py-3 text-sm">
                <div className="font-medium">Mardi → dimanche</div>
                <div className="text-muted-foreground">9h30 – 18h</div>
              </div>
            </div>

            <div className="relative mt-7 grid gap-6 lg:grid-cols-2">
              {sections.map((section) => (
                <MenuSection key={section.title} section={section} />
              ))}
            </div>

            <div className="relative mt-8 grid gap-3 border-t border-dashed border-ink/20 pt-6 sm:grid-cols-3">
              <MiniNote icon={CroissantIcon} title="Brunch + atelier" body="Une formule pensée pour prendre le temps." />
              <MiniNote icon={CupSoda} title="Jus frais" body="Recettes du moment, à confirmer au comptoir." />
              <MiniNote icon={Sparkles} title="Atelier" body="La céramique se choisit sur place selon stock." />
            </div>
          </div>
        </div>
      </section>
    </PageShell>
  );
}

function MenuSection({ section }: { section: (typeof sections)[number] }) {
  return (
    <div className="rounded-2xl bg-background/80 p-4 ring-1 ring-border/70">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h3 className={`text-2xl leading-none ${section.accent}`}>{section.title}</h3>
          <p className="mt-1 text-xs uppercase text-muted-foreground">{section.subtitle}</p>
        </div>
      </div>
      <div className="divide-y divide-border/70">
        {section.items.map((it) => (
          <div key={it.name} className="grid grid-cols-[1fr_auto] gap-4 py-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{it.name}</span>
                {it.tag && (
                  <span className="rounded-full bg-rose/30 px-2 py-0.5 text-[10px] font-medium uppercase text-brick">
                    {it.tag}
                  </span>
                )}
              </div>
              {it.desc && <p className="mt-1 text-sm leading-5 text-muted-foreground">{it.desc}</p>}
            </div>
            <div className="font-display text-lg">{it.price}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MiniNote({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof Coffee;
  title: string;
  body: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl bg-card/90 p-4 ring-1 ring-border/70">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-secondary">
        <Icon className="h-5 w-5" />
      </span>
      <span>
        <span className="block font-medium">{title}</span>
        <span className="mt-1 block text-sm text-muted-foreground">{body}</span>
      </span>
    </div>
  );
}
