import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Brush, Camera, Palette, Sparkles } from "lucide-react";
import { PageShell, PageHeader } from "@/components/page-shell";

export const Route = createFileRoute("/creations")({
  head: () => ({
    meta: [
      { title: "Créations & inspirations — Kafé Céramik" },
      {
        name: "description",
        content:
          "Quelques inspirations de pièces peintes au Kafé Céramik pour imaginer son atelier avant de réserver.",
      },
    ],
  }),
  component: CreationsPage,
});

const creations = [
  {
    src: "/creations/assiette-tortue.webp",
    title: "Assiette tortue tropicale",
    body: "Motifs fins, fleurs, feuillages et esprit Guadeloupe.",
    tone: "bg-sage/20",
  },
  {
    src: "/creations/bol-vache.webp",
    title: "Bol vache",
    body: "Une idée drôle et simple, parfaite pour un atelier sans pression.",
    tone: "bg-rose/30",
  },
  {
    src: "/creations/tasse-feuillage.webp",
    title: "Tasse feuillage bleu",
    body: "Un rendu végétal plus délicat, avec un motif qui fait vite son effet.",
    tone: "bg-cream",
  },
  {
    src: "/creations/assiette-bateau.webp",
    title: "Assiette bateau",
    body: "Une pièce plus travaillée pour celles et ceux qui veulent prendre leur temps.",
    tone: "bg-mustard/25",
  },
] as const;

const ideas = [
  {
    icon: Palette,
    title: "Couleurs",
    body: "Aplats, petits points, contours fins ou zones laissées blanches.",
  },
  {
    icon: Brush,
    title: "Motifs",
    body: "Feuillages, animaux, formes libres, prénoms, dessins simples.",
  },
  {
    icon: Camera,
    title: "Inspiration",
    body: "Vous pouvez venir avec une idée, ou choisir au feeling une fois sur place.",
  },
] as const;

function CreationsPage() {
  return (
    <PageShell>
      <PageHeader
        eyebrow="Inspirations"
        title="Des créations pour imaginer la vôtre."
        description="Quelques exemples de pièces peintes au Kafé. Chaque atelier reste libre : l'idée est surtout de donner envie, pas d'imposer un modèle."
      />

      <section className="mx-auto max-w-6xl px-4 py-10">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {creations.map((creation, index) => (
            <article
              key={creation.src}
              className={`group overflow-hidden rounded-2xl border border-border shadow-sm shadow-ink/5 ${creation.tone}`}
            >
              <div className="aspect-[4/5] overflow-hidden bg-cream">
                <img
                  src={creation.src}
                  alt={creation.title}
                  loading={index === 0 ? "eager" : "lazy"}
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
                />
              </div>
              <div className="p-4">
                <div className="font-display text-2xl leading-none">{creation.title}</div>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{creation.body}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-6">
        <div className="grid gap-4 rounded-3xl border border-border bg-card p-5 sm:grid-cols-3 sm:p-6">
          {ideas.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="flex items-start gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-secondary">
                  <Icon className="h-5 w-5" />
                </span>
                <span>
                  <span className="block font-medium">{item.title}</span>
                  <span className="mt-1 block text-sm leading-6 text-muted-foreground">
                    {item.body}
                  </span>
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex flex-col gap-4 rounded-3xl border border-border bg-ink p-6 text-cream sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-cream/12 px-3 py-1 text-xs font-medium">
              <Sparkles className="h-3.5 w-3.5" /> À vous de jouer
            </div>
            <h2 className="mt-4 text-3xl leading-tight">
              Choisissez une pièce, puis créez la vôtre.
            </h2>
          </div>
          <Link
            to="/reserver"
            className="inline-flex w-fit items-center gap-2 rounded-full bg-cream px-5 py-3 text-sm font-medium text-ink"
          >
            Réserver un atelier <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </PageShell>
  );
}
