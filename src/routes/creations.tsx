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

      <section className="mx-auto max-w-6xl px-4 py-10">
        {creations.length > 0 ? (
          <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 sm:mx-0 sm:px-0">
            {creations.map((creation, index) => (
              <article
                key={creation.id}
                className="group w-[82vw] max-w-[340px] shrink-0 snap-center overflow-hidden rounded-3xl border border-border bg-card shadow-sm shadow-ink/5"
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
                  <div className="font-display text-2xl leading-none">{creation.title}</div>
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

      {settings.pinterestUrl && (
        <section className="mx-auto max-w-6xl px-4 py-6">
          <a
            href={settings.pinterestUrl}
            target="_blank"
            rel="noreferrer"
            className="flex flex-col gap-4 rounded-3xl border border-border bg-[#f5cdd7] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"
          >
            <div>
              <div className="text-sm font-semibold text-primary">Encore plus d'idées</div>
              <h2 className="mt-2 font-display text-3xl">
                Explore le Pinterest du Kafé avant de te lancer.
              </h2>
            </div>
            <span className="inline-flex w-fit shrink-0 items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground">
              Voir Pinterest <ExternalLink className="h-4 w-4" />
            </span>
          </a>
        </section>
      )}

      <section className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex flex-col gap-4 rounded-3xl border border-border bg-ink p-6 text-cream sm:flex-row sm:items-center sm:justify-between">
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
