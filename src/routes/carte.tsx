import { createFileRoute } from "@tanstack/react-router";
import { PageShell, PageHeader } from "@/components/page-shell";

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

const sections: { title: string; items: Item[]; tone: string }[] = [
  {
    title: "Cafés & compagnie",
    tone: "bg-cream",
    items: [
      { name: "Espresso, Allongé", price: "3 €" },
      { name: "Double Espresso", price: "4 €" },
      { name: "Café Bombon", desc: "Espresso, lait concentré sucré, chantilly", price: "4 €" },
      { name: "Cappuccino / Iced Cappuccino", desc: "Lait amande ou coco +0,50 €", price: "4,50 €" },
      { name: "Chocolat Chaud", desc: "Chocolat local, onctueux et parfumé", price: "4 €" },
      { name: "Chaï Latte Amande (chaud ou froid)", price: "5 €" },
      { name: "Matcha Latte Coco (chaud ou froid)", price: "5 €" },
      { name: "Golden Latte", desc: "Curcuma, gingembre, cannelle", price: "6 €" },
      { name: "Infusion / thé", price: "3,50 €" },
    ],
  },
  {
    title: "Fresh juices baby !",
    tone: "bg-rose/70",
    items: [
      { name: "Le Very Skinny", desc: "Pomme, ananas, concombre, citron vert, menthe, épinard", price: "8 €" },
      { name: "Le Vitamine Sea", desc: "Carotte, ananas, orange, gingembre", price: "8 €" },
      { name: "Le Ti Bo Doudou", desc: "Symbiose éphémère, à découvrir au comptoir", price: "8 €" },
      { name: "La Piña Coco Lada", desc: "Ananas, lait de coco, sucre de canne, citron vert", price: "8 €" },
      { name: "Ginger Beer maison", desc: "Boisson probiotique sans alcool, bien épicée", price: "6 €", tag: "Spicy" },
      { name: "Orange Pressée", price: "6,50 €" },
      { name: "Citron Pressé", price: "3 €" },
      { name: "Limonade Mamounia", desc: "Limonade, menthe, fleur d'oranger, citron", price: "3,50 €" },
    ],
  },
  {
    title: "À table !",
    tone: "bg-sage/30",
    items: [
      { name: "Le Ronchon", desc: "Croissant rond, œuf au plat, reblochon, jambon, sauce hollandaise", price: "16 €", tag: "New" },
      { name: "Le Mec Muffin", desc: "Pain brioché, œufs brouillés, cheddar, bacon, paprika fumé", price: "16 €" },
      { name: "Le Morning Bagel", desc: "Bagel, œuf, bacon crispy, philadelphia, cheddar", price: "11 €" },
      { name: "Le Summer Body", desc: "Wrap, houmous, chèvre frais, légumes confits, pickles", price: "16 €" },
      { name: "Le Summer Bowl", desc: "Bowl quinoa, œuf au plat, légumes — sans gluten", price: "16 €" },
      { name: "La Sirène des Caraïbes", desc: "Bagel, fromage frais, avocat, thazard fumé, roquette", price: "16 €" },
      { name: "Nutty Banana Bowl", desc: "Yaourt, granola, noix, coco, banane, sirop d'érable", price: "12 €", tag: "New" },
    ],
  },
  {
    title: "Pour les gourmands",
    tone: "bg-mustard/40",
    items: [
      { name: "Le Big Macchiato", desc: "500 ml de café glacé, chantilly, topping au choix", price: "8 €" },
      { name: "La Gaufre Liégeoise", desc: "Topping au choix : nutella, miel, dulce de leche…", price: "5,50 €" },
      { name: "Pâtisseries maison du jour", desc: "À découvrir dans la vitrine du Kafé", price: "—" },
    ],
  },
  {
    title: "Menu Kids",
    tone: "bg-rose/50",
    items: [
      { name: "Formule Kids", desc: "Jus tropical ou chocolat chaud · 1/2 gaufre, œuf, bacon, potatoes · cookie", price: "12 €" },
    ],
  },
];

function CartePage() {
  return (
    <PageShell>
      <PageHeader
        eyebrow="Carte"
        title="Carte café & déjeunette"
        description="Service en continu de 9h30 à 18h, du mardi au dimanche."
      />
      <section className="mx-auto max-w-5xl px-4 py-10 space-y-8">
        {sections.map((s) => (
          <div key={s.title} className={`rounded-3xl border border-border p-5 sm:p-8 ${s.tone}`}>
            <h2 className="text-2xl">{s.title}</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {s.items.map((it) => (
                <div key={it.name} className="rounded-2xl bg-background/80 p-4 backdrop-blur">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="font-medium truncate">{it.name}</div>
                        {it.tag && (
                          <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-medium uppercase text-primary">
                            {it.tag}
                          </span>
                        )}
                      </div>
                      {it.desc && <div className="mt-0.5 text-sm text-muted-foreground">{it.desc}</div>}
                    </div>
                    <div className="shrink-0 font-display text-lg">{it.price}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>
    </PageShell>
  );
}
