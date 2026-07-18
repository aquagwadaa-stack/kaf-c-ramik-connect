import { createFileRoute, Link } from "@tanstack/react-router";
import brunchAtelier from "@/assets/brunch-atelier.png.asset.json";
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
    icon: Coffee,
    title: "Venir au Kafé",
    body: "Pour un café, un jus, un bagel ou une déjeunette, tu peux passer sans réserver selon les places disponibles.",
  },
  {
    icon: CalendarHeart,
    title: "Réserver pour peindre",
    body: "La réservation te donne la priorité sur les places atelier. Sans réservation, c'est possible uniquement s'il reste de la place.",
  },
  {
    icon: Utensils,
    title: "Prévoir une consommation",
    body: "L'atelier céramique se fait avec une consommation sur place : café, boisson, bagel, douceur ou brunch selon ton envie.",
  },
  {
    icon: Palette,
    title: "Choisir et peindre",
    body: "Sur place, tu choisis ta pièce et tes couleurs, puis tu suis les consignes pour un rendu propre après cuisson.",
  },
  {
    icon: Flame,
    title: "Cuisson par l'équipe",
    body: "La pièce reste au Kafé pour séchage, émaillage et cuisson. Elle ne repart pas avec toi le jour même.",
  },
  {
    icon: PackageCheck,
    title: "Récupération",
    body: "Une fois prête, tu récupères ta création au Kafé selon le délai indiqué par l'équipe.",
  },
] as const;

function BrunchPage() {
  const [settings] = useKafeSettings();

  return (
    <PageShell>
      <PageHeader
        eyebrow="Déroulement"
        title="Comment se passe un atelier ?"
        description="L’idée est simple : profite du Kafé, réserve si tu veux peindre, crée ta pièce, puis récupère-la après cuisson."
      />

      <section className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
        <figure className="overflow-hidden rounded-[2rem] border border-border bg-cream">
          <img
            src={brunchAtelier.url}
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
                className={`rounded-[1.75rem] border border-border p-5 ${
                  index % 3 === 0
                    ? "bg-[#fff7e7]"
                    : index % 3 === 1
                      ? "bg-[#f5cdd7]"
                      : "bg-[#dce6ca]"
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-card/80">
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
      </section>

      <section className="mx-auto max-w-6xl px-4 py-6">
        <div className="grid gap-4 rounded-[2rem] border border-border bg-card p-5 sm:grid-cols-[1fr_auto] sm:items-center sm:p-6">
          <div>
            <div className="font-display text-3xl leading-none">
              Les consignes détaillées sont dans le guide.
            </div>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Il sert à responsabiliser les participants et à éviter les erreurs qui peuvent abîmer
              le rendu final.
            </p>
          </div>
          <Link
            to="/guide"
            className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-background px-5 py-3 text-sm font-medium hover:bg-secondary"
          >
            Lire le guide <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </PageShell>
  );
}
