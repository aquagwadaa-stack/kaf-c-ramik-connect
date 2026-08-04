import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  CalendarHeart,
  Coffee,
  Flame,
  PackageCheck,
  Palette,
  Utensils,
} from "lucide-react";
import { PageShell, PageHeader } from "@/components/page-shell";

export const Route = createFileRoute("/brunch")({
  head: () => ({
    meta: [
      { title: "Déroulement atelier — Kafé Céramik" },
      {
        name: "description",
        content:
          "Comprendre comment se passe un atelier au Kafé Céramik : réservation, consommation, peinture, cuisson et récupération.",
      },
    ],
  }),
  component: BrunchPage,
});

const flow = [
  {
    icon: CalendarHeart,
    title: "Réserver pour peindre",
    body: "Réserve ta table pour garantir ta place. Sans réservation, tu peux tenter ta chance, mais l'accueil dépendra des places réellement disponibles.",
  },
  {
    icon: Coffee,
    title: "Arriver au Kafé",
    body: "Installe-toi pour peindre autour d'une douceur salée ou sucrée. Une consommation sur place accompagne chaque atelier.",
  },
  {
    icon: Utensils,
    title: "Prendre le temps",
    body: "Prévois au minimum 2 heures et jusqu'à 4 heures selon ton projet. Le Kafé est convivial : une grande table peut être partagée avec d'autres artistes.",
  },
  {
    icon: Palette,
    title: "Choisir ta céramique",
    body: "Tu choisis TA CÉRAMIQUE et tes couleurs, puis tu suis toutes les consignes DU GUIDE pour obtenir le meilleur résultat après cuisson.",
  },
  {
    icon: Flame,
    title: "Cuisson par l'équipe",
    body: "Ta création reste au Kafé environ 5 à 10 jours pour la cuisson. Tu ne repartiras pas avec le jour même.",
  },
  {
    icon: PackageCheck,
    title: "Récupération",
    body: "Une fois prête, nous gardons ta céramique maximum 2 mois avant d'en faire profiter des associations. Si tu ne peux pas la récupérer avant, préviens la team du Kafé.",
  },
] as const;

function BrunchPage() {
  return (
    <PageShell>
      <PageHeader
        eyebrow="Déroulement"
        title="Comment se passe un atelier ?"
        description="Réserve ta table au Kafé, peins ta pièce autour d'une douceur salée ou sucrée, puis récupère ta création après cuisson."
      />

      <section className="border-b-2 border-ink bg-[#eea83a] px-4 py-12 sm:py-16">
        <div className="mx-auto max-w-6xl">
          <figure className="kafe-photo-frame">
            <img
              src="/photos/manika/atelier-table.jpg"
              alt="Atelier de peinture sur céramique au Kafé Céramik"
              className="h-[260px] w-full object-cover sm:h-[380px]"
            />
          </figure>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {flow.map((item, index) => {
              const Icon = item.icon;
              return (
                <article
                  key={item.title}
                  className={`kafe-block-link p-5 ${
                    index % 3 === 0
                      ? "bg-[#fffbd6]"
                      : index % 3 === 1
                        ? "bg-[#f4b6cd]"
                        : "bg-[#79c6e8]"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border-2 border-ink bg-card/90">
                      <Icon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-muted-foreground">
                        Étape {String(index + 1).padStart(2, "0")}
                      </div>
                      <h3 className="mt-1 font-display text-2xl leading-none">{item.title}</h3>
                      <p className="mt-3 text-sm leading-6 text-muted-foreground">{item.body}</p>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-6">
        <div className="kafe-block-link grid gap-4 bg-[#dbea4c] p-5 sm:grid-cols-[1fr_auto] sm:items-center sm:p-6">
          <div>
            <div className="font-display text-3xl leading-none">Chaque étape du guide compte.</div>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Lis-le avant de venir et garde-le sous la main pendant l'atelier : ses consignes
              protègent ta pièce à chaque étape.
            </p>
          </div>
          <Link
            to="/guide"
            className="kafe-block-link inline-flex w-fit items-center gap-2 bg-[#fffbd6] px-5 py-3 text-sm font-bold"
          >
            Lire le guide <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </PageShell>
  );
}
