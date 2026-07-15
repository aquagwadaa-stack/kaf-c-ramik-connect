import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  CalendarHeart,
  CheckCircle2,
  Coffee,
  Flame,
  PackageCheck,
  Palette,
  Utensils,
} from "lucide-react";
import { PageShell, PageHeader } from "@/components/page-shell";
import { useKafeSettings } from "@/lib/admin-data";

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
    body: "Pour un café, un jus, un bagel ou une déjeunette, vous pouvez passer sans réserver selon les places disponibles.",
  },
  {
    icon: CalendarHeart,
    title: "Réserver pour peindre",
    body: "La réservation donne la priorité sur les places atelier. Sans réservation, c'est possible uniquement s'il reste de la place.",
  },
  {
    icon: Utensils,
    title: "Prévoir une consommation",
    body: "L'atelier céramique se fait avec une consommation sur place : café, boisson, bagel, douceur ou brunch selon l'envie.",
  },
  {
    icon: Palette,
    title: "Choisir et peindre",
    body: "Sur place, vous choisissez une pièce disponible, vos couleurs, puis vous suivez les consignes pour un rendu propre après cuisson.",
  },
  {
    icon: Flame,
    title: "Cuisson par l'équipe",
    body: "La pièce reste au Kafé pour séchage, émaillage et cuisson. Elle ne repart pas avec vous le jour même.",
  },
  {
    icon: PackageCheck,
    title: "Récupération",
    body: "Une fois prête, la création est récupérée au Kafé selon le délai indiqué par l'équipe.",
  },
] as const;

function BrunchPage() {
  const [settings] = useKafeSettings();

  return (
    <PageShell>
      <PageHeader
        eyebrow="Déroulement"
        title="Comment se passe un atelier ?"
        description="L'objectif est simple : venir profiter du Kafé, réserver si vous voulez peindre, créer votre pièce, puis la récupérer après cuisson."
      />

      <section className="mx-auto max-w-6xl px-4 py-10">
        <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <aside className="rounded-3xl border border-border bg-cream p-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
              <CheckCircle2 className="h-3.5 w-3.5 text-sage" /> À retenir
            </div>
            <h2 className="mt-5 font-display text-4xl leading-none">
              Pas besoin de réserver pour manger.
            </h2>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              {settings.walkInNoticeText}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to="/reserver"
                className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground"
              >
                Réserver un atelier <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/carte"
                className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-5 py-3 text-sm font-medium"
              >
                Voir la carte
              </Link>
            </div>
          </aside>

          <div className="grid gap-3 sm:grid-cols-2">
            {flow.map((item, index) => {
              const Icon = item.icon;
              return (
                <article key={item.title} className="rounded-2xl border border-border bg-card p-5">
                  <div className="flex items-start gap-3">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-secondary">
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
        <div className="grid gap-4 rounded-3xl border border-border bg-card p-5 sm:grid-cols-[1fr_auto] sm:items-center sm:p-6">
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
