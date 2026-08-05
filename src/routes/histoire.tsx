import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  CalendarHeart,
  Coffee,
  Flame,
  MapPin,
  PackageCheck,
  Palette,
  Utensils,
} from "lucide-react";
import { PageShell, PageHeader } from "@/components/page-shell";

export const Route = createFileRoute("/histoire")({
  head: () => ({
    meta: [
      { title: "Le Kafé - Kafé Céramik" },
      {
        name: "description",
        content:
          "Découvre Kafé Céramik et le déroulement d'un atelier de peinture sur céramique à Saint-François.",
      },
    ],
  }),
  component: HistoirePage,
});

const flow = [
  {
    icon: CalendarHeart,
    title: "Réserve ta table",
    body: "Réserve pour garantir ta place. Sans réservation, tu peux tenter ta chance, mais l'accueil dépendra des places disponibles.",
  },
  {
    icon: Coffee,
    title: "Installe-toi au Kafé",
    body: "Commence ton atelier autour d'une douceur salée ou sucrée. Une consommation sur place accompagne chaque atelier.",
  },
  {
    icon: Utensils,
    title: "Prends le temps",
    body: "Prévois au minimum 2 heures et jusqu'à 4 heures selon ton projet. Les grandes tables peuvent être partagées avec d'autres artistes.",
  },
  {
    icon: Palette,
    title: "Choisis ta céramique",
    body: "Choisis ta pièce et tes couleurs, puis suis les consignes du guide pour obtenir le meilleur résultat après cuisson.",
  },
  {
    icon: Flame,
    title: "Laisse-nous la cuisson",
    body: "Ta création reste au Kafé environ 5 à 10 jours. Tu ne repars pas avec le jour même.",
  },
  {
    icon: PackageCheck,
    title: "Récupère ta création",
    body: "Une fois prête, ta céramique est conservée pendant 2 mois. Si tu ne peux pas venir avant, préviens la team du Kafé.",
  },
] as const;

function HistoirePage() {
  return (
    <PageShell>
      <PageHeader
        eyebrow="Le Kafé"
        title="Un lieu pour créer, se régaler et partager."
        description="À Saint-François, on vient peindre une pièce autour d'une douceur salée ou sucrée, puis on revient récupérer sa création après cuisson."
      />

      <section className="border-b-2 border-ink bg-[#eea83a] px-4 py-12">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <figure className="kafe-photo-frame rotate-[-1deg]">
            <img
              src="/photos/manika/interieur-comptoir.jpg"
              alt="L'intérieur du Kafé Céramik à Saint-François"
              className="aspect-[4/3] h-full w-full object-cover"
            />
          </figure>
          <div className="max-w-xl">
            <div className="kafe-poster-label inline-flex items-center gap-2 bg-[#dbea4c] text-ink">
              <MapPin className="h-4 w-4" /> Saint-François, Guadeloupe
            </div>
            <h2 className="mt-5 font-display text-4xl leading-tight sm:text-5xl">
              Création, gourmandise et vraie vie de quartier.
            </h2>
            <p className="mt-5 leading-7 text-muted-foreground">
              Kafé Céramik réunit l'atelier de peinture sur céramique et la table de Mala Madre.
              L'expérience a été imaginée pour créer à son rythme, autour d'un café, d'un bagel,
              d'une pâtisserie ou d'un brunch.
            </p>
            <p className="mt-4 leading-7 text-muted-foreground">
              Ici, les grandes tables se partagent, les idées circulent et chaque pièce raconte
              quelque chose de différent. Le lieu vit grâce aux créations, à l'équipe et aux
              personnes qui reviennent découvrir leur céramique après cuisson.
            </p>
          </div>
        </div>
      </section>

      <section
        id="deroulement"
        className="scroll-mt-24 border-b-2 border-ink bg-[#fff8dd] px-4 py-12 sm:py-16"
      >
        <div className="mx-auto max-w-6xl">
          <div className="max-w-3xl">
            <div className="kafe-poster-label bg-[#f4b6cd] text-ink">Ton atelier</div>
            <h2 className="mt-3 font-display text-4xl leading-tight sm:text-5xl">
              De la réservation à la récupération.
            </h2>
            <p className="mt-4 leading-7 text-muted-foreground">
              Réserve ta table, peins ta pièce autour d'une douceur, puis laisse l'équipe s'occuper
              de la cuisson.
            </p>
          </div>

          <figure className="kafe-photo-frame mt-8">
            <img
              src="/photos/manika/atelier-table.jpg"
              alt="Atelier de peinture sur céramique au Kafé Céramik"
              className="h-[250px] w-full object-cover sm:h-[360px]"
            />
          </figure>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {flow.map((item, index) => {
              const Icon = item.icon;
              const tone =
                index % 3 === 0
                  ? "bg-[#f4b6cd]"
                  : index % 3 === 1
                    ? "bg-[#79c6e8]"
                    : "bg-[#dbea4c]";
              return (
                <article key={item.title} className={`kafe-block-link p-5 ${tone}`}>
                  <div className="flex items-start gap-3">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border-2 border-ink bg-[#fff8dd]">
                      <Icon className="h-5 w-5" />
                    </span>
                    <div>
                      <div className="text-xs font-medium text-ink/60">
                        Étape {String(index + 1).padStart(2, "0")}
                      </div>
                      <h3 className="mt-1 font-display text-2xl leading-none">{item.title}</h3>
                      <p className="mt-3 text-sm leading-6 text-ink/70">{item.body}</p>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/guide"
              className="kafe-block-link inline-flex items-center gap-2 bg-[#fffbd6] px-5 py-3 text-sm font-bold"
            >
              Lire le guide <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/reserver"
              className="kafe-block-link inline-flex items-center gap-2 bg-primary px-5 py-3 text-sm font-bold text-primary-foreground"
            >
              Réserver sa venue <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-5 px-4 py-12 sm:grid-cols-3">
        <img
          src="/photos/manika/equipe-service.jpg"
          alt="L'équipe du Kafé"
          className="kafe-photo-frame aspect-[4/5] w-full rotate-[-1deg] object-cover"
        />
        <img
          src="/photos/manika/artiste-peinture.jpg"
          alt="Une artiste en train de peindre"
          className="kafe-photo-frame aspect-[4/5] w-full rotate-[1deg] object-cover sm:translate-y-7"
        />
        <img
          src="/photos/manika/brunch-plateau.jpg"
          alt="Un brunch servi au Kafé"
          className="kafe-photo-frame aspect-[4/5] w-full rotate-[-0.5deg] object-cover"
        />
      </section>
    </PageShell>
  );
}
