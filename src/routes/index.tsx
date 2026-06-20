import { createFileRoute, Link } from "@tanstack/react-router";
import {
  CalendarHeart,
  CroissantIcon,
  Coffee,
  Palette,
  Users,
  Gift,
  MapPin,
  Phone,
  Clock,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { OrganicShapes } from "@/components/organic-shapes";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Kafé Céramik — Café-atelier à Saint-François, Guadeloupe" },
      {
        name: "description",
        content:
          "Réservez votre moment créatif chez Kafé Céramik : peinture sur céramique, café, brunch et douceurs maison à Saint-François.",
      },
    ],
  }),
  component: HomePage,
});

const actions = [
  { to: "/reserver", label: "Réserver un atelier", icon: Palette, color: "bg-brick text-cream", desc: "Choisissez votre créneau" },
  { to: "/brunch", label: "Brunch + atelier", icon: CroissantIcon, color: "bg-sage text-cream", desc: "La formule gourmande" },
  { to: "/carte", label: "Voir la carte café", icon: Coffee, color: "bg-cream text-ink", desc: "Boissons & douceurs" },
  { to: "/objets", label: "Objets à peindre", icon: Sparkles, color: "bg-mustard text-ink", desc: "Tasses, bols, vases…" },
  { to: "/groupes", label: "Réservation de groupe", icon: Users, color: "bg-lavender text-cream", desc: "Anniversaire, EVJF…" },
  { to: "/cadeau", label: "Offrir une carte cadeau", icon: Gift, color: "bg-rose text-ink", desc: "À partir de 25 €" },
] as const;

function HomePage() {
  return (
    <PageShell>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <OrganicShapes />
        <div className="relative mx-auto max-w-6xl px-4 pt-12 pb-14 sm:pt-20 sm:pb-20">
          <div className="inline-flex items-center gap-2 rounded-full border border-ink/15 bg-cream/80 px-3 py-1.5 text-xs font-medium text-ink/70 backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-sage" /> Ouvert mardi → dimanche · 9h30 – 18h
          </div>
          <h1 className="mt-6 text-5xl sm:text-7xl text-ink leading-[0.95] max-w-3xl">
            Kafé Céramik.
            <br />
            <span className="text-brick">Déjeunette</span> &amp; <span className="text-sage">Création</span>.
          </h1>
          <p className="mt-6 max-w-xl text-base sm:text-lg text-ink/75">
            Réservez votre moment créatif chez Kafé Céramik, entre peinture sur céramique,
            café, brunch et douceurs maison. Saint-François, Guadeloupe.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/reserver"
              className="inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3.5 text-sm font-medium text-cream shadow-lg shadow-ink/10 hover:bg-brick transition"
            >
              <CalendarHeart className="h-4 w-4" /> Réserver un atelier
            </Link>
            <a
              href="tel:+590690284788"
              className="inline-flex items-center gap-2 rounded-full border border-ink/20 bg-cream/80 px-6 py-3.5 text-sm font-medium backdrop-blur hover:bg-cream"
            >
              <Phone className="h-4 w-4" /> 0690 28 47 88
            </a>
          </div>
        </div>
      </section>

      {/* ACTION GRID */}
      <section className="mx-auto max-w-6xl px-4 pb-4">
        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {actions.map((a) => {
            const Icon = a.icon;
            return (
              <Link
                key={a.to}
                to={a.to}
                className="group relative overflow-hidden rounded-3xl border border-border bg-card p-5 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/5"
              >
                <div className={`grid h-11 w-11 place-items-center rounded-2xl ${a.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="mt-4 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-display text-lg">{a.label}</div>
                    <div className="text-sm text-muted-foreground">{a.desc}</div>
                  </div>
                  <ArrowRight className="h-5 w-5 shrink-0 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-primary" />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* INFO STRIP */}
      <section className="mx-auto mt-10 max-w-6xl px-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <InfoTile icon={MapPin} title="Adresse" body="Lieu dit Loyette, 97118 Saint-François" />
          <InfoTile icon={Clock} title="Horaires" body="Mardi – Dimanche · 9h30 → 18h" />
          <InfoTile icon={Phone} title="Téléphone" body="0690 28 47 88" />
        </div>
      </section>

      {/* WHY */}
      <section className="mx-auto mt-14 max-w-6xl px-4">
        <div className="rounded-3xl border border-border bg-card p-6 sm:p-10">
          <h2 className="text-2xl sm:text-3xl">Une nouvelle façon de réserver</h2>
          <p className="mt-3 max-w-2xl text-foreground/70">
            Plus besoin de DM Instagram à rallonge : choisissez votre créneau, validez avec un petit
            acompte, et recevez votre confirmation. On garde Insta pour les jolies photos.
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {[
              ["Créneaux en temps réel", "Voyez ce qui est libre, réservez en 1 min."],
              ["Acompte sécurisé", "10 € / personne pour confirmer votre venue."],
              ["Groupes & événements", "Demandez votre anniversaire ou EVJF en ligne."],
            ].map(([t, d]) => (
              <div key={t} className="rounded-2xl bg-secondary/50 p-4">
                <div className="font-medium">{t}</div>
                <div className="mt-1 text-sm text-muted-foreground">{d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </PageShell>
  );
}

function InfoTile({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof MapPin;
  title: string;
  body: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-secondary text-secondary-foreground">
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">{title}</div>
        <div className="text-sm font-medium">{body}</div>
      </div>
    </div>
  );
}
