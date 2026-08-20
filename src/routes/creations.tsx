import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Brush, Camera, ExternalLink, Palette, Sparkles } from "lucide-react";
import { PageShell, PageHeader } from "@/components/page-shell";
import { creationInspirationsSeed, useKafeSettings } from "@/lib/admin-data";

export const Route = createFileRoute("/creations")({
  head: () => ({
    meta: [
      { title: "Créations & inspirations - Kafé Céramik" },
      {
        name: "description",
        content:
          "Quelques inspirations de pièces peintes au Kafé Céramik pour imaginer son atelier avant de réserver.",
      },
    ],
  }),
  component: CreationsPage,
});

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
    body: "Tu peux venir avec une idée, ou choisir au feeling une fois sur place.",
  },
] as const;

function CreationsPage() {
  const [settings] = useKafeSettings();
  const pinterestUrl =
    settings.pinterestUrl?.trim() ||
    "https://www.pinterest.fr/search/pins/?q=peinture%20sur%20ceramique";
  const creations = (
    settings.creationInspirations?.length ? settings.creationInspirations : creationInspirationsSeed
  ).filter((creation) => creation.visible);

  return (
    <PageShell>
      <PageHeader
        eyebrow="Inspirations"
        title="Des créations pour imaginer la vôtre."
        description="Quelques exemples de pièces peintes au Kafé. Chaque atelier reste libre dans l'esprit : l'idée est surtout de donner envie, pas d'imposer un modèle."
      />

      <section className="border-b-2 border-ink bg-[#ffd6a5] px-4 py-10">
        <div className="mx-auto max-w-6xl">
          {creations.length > 0 ? (
            <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 sm:mx-0 sm:px-0">
              {creations.map((creation, index) => (
                <article
                  key={creation.id}
                  className={`kafe-photo-frame group w-[82vw] max-w-[340px] shrink-0 snap-center bg-card ${index % 2 ? "rotate-[0.8deg]" : "rotate-[-0.8deg]"}`}
                >
                  <div className="aspect-[4/5] overflow-hidden bg-cream">
                    <img
                      src={
                        creation.imageDataUrl ||
                        creation.imageSrc ||
                        "/creations/assiette-tortue.webp"
                      }
                      alt={creation.title}
                      loading={index === 0 ? "eager" : "lazy"}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
                    />
                  </div>
                  <div className="p-4">
                    <div className="font-display text-2xl leading-[1.16]">{creation.title}</div>
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">{creation.body}</p>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
              Les inspirations seront ajoutées prochainement.
            </div>
          )}
        </div>
      </section>

      <section className="border-b-2 border-ink bg-[#fffaf0] px-4 py-8 sm:py-10">
        <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-[1fr_auto] md:items-center">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border-2 border-ink bg-[#f7e1e6] px-3 py-1 text-xs font-bold uppercase">
              <Palette className="h-3.5 w-3.5" /> Le plein d'idées
            </div>
            <h2 className="mt-4 font-display text-3xl leading-tight sm:text-4xl">
              Besoin d'un petit déclic avant de prendre les pinceaux ?
            </h2>
            <p className="mt-3 max-w-2xl leading-7 text-muted-foreground">
              Couleurs, motifs, lettrages ou techniques : pioche quelques inspirations sur
              Pinterest, puis imagine une création qui te ressemble.
            </p>
          </div>

          <a
            href={pinterestUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex w-fit items-center gap-2 rounded-full border-2 border-ink bg-[#a85f73] px-6 py-3 font-bold text-white shadow-[4px_4px_0_#2f1620] transition hover:-translate-y-0.5 hover:shadow-[6px_6px_0_#2f1620]"
          >
            Voir les inspirations <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-6">
        <div className="kafe-block-link grid gap-4 bg-[#d6ead4] p-5 sm:grid-cols-3 sm:p-6">
          {ideas.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="flex items-start gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border-2 border-ink bg-[#fffaf0]">
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
        <div className="kafe-block-link flex flex-col gap-4 bg-ink p-6 text-cream sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-cream/12 px-3 py-1 text-xs font-medium">
              <Sparkles className="h-3.5 w-3.5" /> À toi de jouer
            </div>
            <h2 className="mt-4 text-3xl leading-tight">Choisis une pièce, puis crée la tienne.</h2>
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
