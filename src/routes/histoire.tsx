import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Heart, MapPin, Palette } from "lucide-react";
import { PageShell, PageHeader } from "@/components/page-shell";

export const Route = createFileRoute("/histoire")({
  head: () => ({
    meta: [
      { title: "L'histoire du Kafé - Kafé Céramik" },
      {
        name: "description",
        content:
          "Découvre l'univers de Kafé Céramik, un lieu de création et de gourmandise à Saint-François.",
      },
    ],
  }),
  component: HistoirePage,
});

function HistoirePage() {
  return (
    <PageShell>
      <PageHeader
        eyebrow="Notre histoire"
        title="Un Kafé pas tout à fait comme les autres."
        description="À Saint-François, on vient partager une table, peindre une pièce, manger un morceau et repartir avec un souvenir créé de ses propres mains."
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

      <section className="checker-strong border-y border-ink/20 px-4 py-12">
        <div className="mx-auto grid max-w-6xl gap-4 sm:grid-cols-3">
          {[
            {
              icon: Palette,
              title: "Créer",
              body: "Choisir une céramique, ses couleurs et suivre le guide pour donner vie à son idée.",
            },
            {
              icon: Heart,
              title: "Partager",
              body: "Profiter d'un lieu convivial où les tables et les inspirations peuvent se rencontrer.",
            },
            {
              icon: MapPin,
              title: "Revenir",
              body: "Retrouver sa création après la cuisson et emporter un objet vraiment personnel.",
            },
          ].map(({ icon: Icon, title, body }) => (
            <article
              key={title}
              className={`kafe-block-link p-5 ${title === "Créer" ? "bg-[#f4b6cd]" : title === "Partager" ? "bg-[#79c6e8]" : "bg-[#dbea4c]"}`}
            >
              <Icon className="h-5 w-5 text-primary" />
              <h2 className="mt-4 font-display text-3xl">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{body}</p>
            </article>
          ))}
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
        <Link
          to="/reserver"
          className="kafe-block-link mt-6 inline-flex w-fit items-center gap-2 bg-primary px-5 py-3 font-semibold text-primary-foreground sm:col-span-3 sm:justify-self-center"
        >
          Réserver sa venue <ArrowRight className="h-4 w-4" />
        </Link>
      </section>
    </PageShell>
  );
}
