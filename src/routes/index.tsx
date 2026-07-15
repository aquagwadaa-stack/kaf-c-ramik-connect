import { createFileRoute, Link } from "@tanstack/react-router";
import {
  CalendarHeart,
  CroissantIcon,
  Coffee,
  Gift,
  MapPin,
  Phone,
  Clock,
  ArrowRight,
  Sparkles,
  Brush,
} from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { OrganicShapes } from "@/components/organic-shapes";
import { CeramicPiece, type CeramicKind } from "@/components/ceramic-piece";
import { creationInspirationsSeed, useKafeSettings } from "@/lib/admin-data";

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

const experiences = [
  {
    to: "/reserver",
    title: "Kafé + atelier",
    eyebrow: "Peinture & conso sur place",
    body: "Réservez votre créneau peinture, choisissez votre pièce, puis prévoyez une consommation sur place : café, bagel ou déjeunette.",
    icon: Coffee,
    visual: "plate",
    cta: "Réserver un créneau",
    tone: "bg-sage/20",
  },
  {
    to: "/brunch",
    title: "Déroulement atelier",
    eyebrow: "Avant, pendant, après",
    body: "Comprenez comment se passe l'atelier : réservation prioritaire, consommation sur place, peinture, cuisson et récupération.",
    icon: CroissantIcon,
    visual: "mug",
    cta: "Voir le déroulement",
    tone: "bg-rose/30",
  },
] as const;

const quickLinks = [
  {
    to: "/carte",
    label: "Carte café",
    desc: "Café, bagels, brunch sans réservation",
    icon: Coffee,
  },
  { to: "/objets", label: "Objets à peindre", desc: "Tasses, bols, vases", icon: Sparkles },
  { to: "/guide", label: "Guide atelier", desc: "Consignes et récupération", icon: Brush },
] as const;

const pieces: { name: string; detail: string; kind: CeramicKind; tone: string }[] = [
  { name: "Tasses", detail: "dès 18 €", kind: "mug", tone: "bg-cream" },
  { name: "Assiettes", detail: "dès 20 €", kind: "plate", tone: "bg-rose/35" },
  { name: "Vases", detail: "dès 28 €", kind: "vase", tone: "bg-sage/25" },
  { name: "Bols", detail: "dès 15 €", kind: "bowl", tone: "bg-mustard/25" },
];

const moodCards = [
  {
    icon: Coffee,
    title: "Pause café & pinceaux",
    body: "Un café glacé, une table tranquille, une pièce qui prend forme sans pression.",
    tone: "bg-cream",
  },
  {
    icon: Sparkles,
    title: "Moment entre proches",
    body: "Copines, couple, famille ou petit groupe : chacun choisit sa pièce et son univers.",
    tone: "bg-rose/30",
  },
  {
    icon: Gift,
    title: "Idée cadeau simple",
    body: "Une carte cadeau ou un atelier à offrir pour partager autre chose qu'un objet déjà tout fait.",
    tone: "bg-sage/20",
  },
] as const;

function HomePage() {
  const [settings] = useKafeSettings();
  const featuredCreations = (
    settings.creationInspirations?.length ? settings.creationInspirations : creationInspirationsSeed
  )
    .filter((creation) => creation.visible)
    .slice(0, 4);

  return (
    <PageShell>
      <section className="relative overflow-hidden">
        <OrganicShapes />
        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 pt-12 pb-14 sm:pt-20 sm:pb-20 lg:grid-cols-[1fr_420px]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-ink/15 bg-cream/85 px-3 py-1.5 text-xs font-medium text-ink/70 backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-sage" /> Ouvert mardi → dimanche · 9h30 –
              18h
            </div>
            <h1 className="mt-6 max-w-3xl text-5xl leading-[0.95] text-ink sm:text-7xl">
              Kafé Céramik.
              <br />
              <span className="text-brick">Déjeunette</span> &amp;{" "}
              <span className="text-sage">Création</span>.
            </h1>
            <p className="mt-6 max-w-xl text-base text-ink/75 sm:text-lg">
              {settings.walkInNoticeText}
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/reserver"
                className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3.5 text-sm font-medium text-primary-foreground shadow-lg shadow-ink/10 transition hover:bg-sage/90"
              >
                <CalendarHeart className="h-4 w-4" /> Réserver un atelier
              </Link>
              <Link
                to="/carte"
                className="inline-flex items-center gap-2 rounded-full border border-ink/20 bg-cream/85 px-6 py-3.5 text-sm font-medium backdrop-blur hover:bg-cream"
              >
                <Coffee className="h-4 w-4" /> Voir la carte café
              </Link>
            </div>
          </div>

          <CeramicHero />
        </div>
      </section>

      <section className="mx-auto -mt-4 max-w-6xl px-4 pb-6">
        <div className="grid gap-3 rounded-3xl border border-border bg-card/85 p-4 shadow-sm shadow-ink/5 sm:grid-cols-3 sm:p-5">
          <VisitNote
            icon={Coffee}
            title="Kafé sans réservation"
            body="Passez pour un café, un jus, un bagel ou une déjeunette selon les places du moment."
          />
          <VisitNote
            icon={CalendarHeart}
            title="Atelier prioritaire sur réservation"
            body="Pour peindre, réservez votre table et prévoyez une consommation sur place."
          />
          <VisitNote
            icon={Sparkles}
            title="Places du jour possibles"
            body="Sans réservation, l'atelier reste possible s'il reste de la place à votre arrivée."
          />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-6 sm:py-10">
        <div className="grid gap-5 lg:grid-cols-[1.25fr_0.75fr]">
          <div className="grid gap-5 sm:grid-cols-2">
            {experiences.map((item) => (
              <ExperienceCard key={item.to} item={item} />
            ))}
          </div>

          <div className="grid gap-3">
            {quickLinks.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className="group flex items-center justify-between gap-3 rounded-2xl border border-border bg-card/90 p-4 transition hover:-translate-y-0.5 hover:border-primary/40 hover:bg-cream"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-secondary text-secondary-foreground">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="min-w-0">
                      <span className="block font-medium">{item.label}</span>
                      <span className="block text-sm text-muted-foreground">{item.desc}</span>
                    </span>
                  </span>
                  <ArrowRight className="h-5 w-5 shrink-0 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-primary" />
                </Link>
              );
            })}

            <a
              href="https://www.google.com/maps?q=16.286364%2C-61.288357"
              target="_blank"
              rel="noreferrer"
              className="group flex items-center justify-between gap-3 rounded-2xl border border-border bg-ink p-4 text-cream transition hover:-translate-y-0.5"
            >
              <span className="flex min-w-0 items-center gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-cream/12">
                  <MapPin className="h-5 w-5" />
                </span>
                <span className="min-w-0">
                  <span className="block font-medium">Itinéraire</span>
                  <span className="block text-sm text-cream/70">Lieu dit Loyette</span>
                </span>
              </span>
              <ArrowRight className="h-5 w-5 shrink-0 text-cream/70 transition group-hover:translate-x-1" />
            </a>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8">
        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-rose/35 px-3 py-1 text-xs font-medium text-ink/70">
              <Brush className="h-3.5 w-3.5" /> Atelier céramique
            </div>
            <h2 className="mt-4 max-w-xl text-3xl leading-tight text-ink sm:text-4xl">
              Des pièces à choisir sur place, puis à personnaliser autour d'une table.
            </h2>
            <p className="mt-4 max-w-lg text-sm leading-6 text-foreground/70 sm:text-base">
              Choisissez une formule, trouvez un créneau disponible, confirmez votre venue, puis
              venez profiter d'un moment créatif sans aller-retour interminable.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {pieces.map((piece) => (
              <Link
                key={piece.name}
                to="/objets"
                className={`group rounded-2xl border border-border p-3 transition hover:-translate-y-0.5 hover:border-primary/40 ${piece.tone}`}
              >
                <div className="mx-auto h-24 w-24 transition group-hover:rotate-[-3deg]">
                  <CeramicPiece kind={piece.kind} label={piece.name} />
                </div>
                <div className="mt-2 text-center">
                  <div className="font-medium">{piece.name}</div>
                  <div className="text-xs text-muted-foreground">{piece.detail}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-cream/80 px-3 py-1 text-xs font-medium text-ink/70">
              <Sparkles className="h-3.5 w-3.5" /> Créations
            </div>
            <h2 className="mt-4 max-w-2xl text-3xl leading-tight text-ink sm:text-4xl">
              Quelques idées avant de choisir sa pièce.
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-6 text-foreground/70 sm:text-base">
              Un aperçu de pièces déjà peintes au Kafé : motifs tropicaux, dessins fins, aplats
              colorés et idées simples à reprendre pendant l'atelier.
            </p>
          </div>
          <Link
            to="/creations"
            className="inline-flex w-fit items-center gap-2 rounded-full border border-ink/20 bg-cream/85 px-5 py-3 text-sm font-medium transition hover:bg-cream"
          >
            Voir les créations <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {featuredCreations.map((photo) => (
            <Link
              key={photo.id}
              to="/creations"
              className="group overflow-hidden rounded-2xl border border-border bg-card/90 shadow-sm shadow-ink/5 transition hover:-translate-y-0.5 hover:border-primary/40"
            >
              <div className="aspect-[4/5] overflow-hidden bg-cream">
                <img
                  src={photo.imageDataUrl || photo.imageSrc || "/creations/assiette-tortue.webp"}
                  alt={photo.title}
                  loading="lazy"
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
                />
              </div>
              <div className="p-4">
                <div className="font-medium">{photo.title}</div>
                <p className="mt-2 text-sm leading-5 text-muted-foreground">{photo.body}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8">
        <div className="rounded-3xl border border-border bg-card/80 p-5 shadow-sm shadow-ink/5 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-rose/35 px-3 py-1 text-xs font-medium text-ink/70">
                <Sparkles className="h-3.5 w-3.5" /> À vivre au Kafé
              </div>
              <h2 className="mt-4 max-w-2xl text-3xl leading-tight text-ink sm:text-4xl">
                Des moments qui ressemblent à l'endroit : simples, gourmands, créatifs.
              </h2>
            </div>
            <Link
              to="/reserver"
              className="inline-flex w-fit items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground"
            >
              Voir les créneaux <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {moodCards.map((item) => (
              <MoodTile key={item.title} item={item} />
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto mt-4 max-w-6xl px-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <InfoTile icon={MapPin} title="Adresse" body="Lieu dit Loyette, 97118 Saint-François" />
          <InfoTile icon={Clock} title="Horaires" body="Mardi – Dimanche · 9h30 → 18h" />
          <InfoTile icon={Phone} title="Téléphone" body="0690 28 47 88" />
        </div>
      </section>
    </PageShell>
  );
}

function CeramicHero() {
  return (
    <div className="relative mx-auto hidden min-h-[360px] w-full max-w-sm lg:block">
      <div className="absolute left-8 top-8 h-60 w-60 rotate-[-7deg] rounded-[2rem] border border-border bg-cream/80 p-4 shadow-xl shadow-ink/10">
        <CeramicPiece kind="plate" label="Assiette peinte" />
      </div>
      <div className="absolute right-0 top-2 h-36 w-36 rotate-[10deg] rounded-3xl border border-border bg-rose/35 p-3 shadow-lg shadow-ink/10">
        <CeramicPiece kind="mug" label="Tasse peinte" />
      </div>
      <div className="absolute bottom-3 right-12 h-40 w-40 rotate-[-5deg] rounded-3xl border border-border bg-sage/25 p-3 shadow-lg shadow-ink/10">
        <CeramicPiece kind="vase" label="Vase à peindre" />
      </div>
    </div>
  );
}

function ExperienceCard({ item }: { item: (typeof experiences)[number] }) {
  const Icon = item.icon;
  return (
    <Link
      to={item.to}
      className={`group relative min-h-[320px] overflow-hidden rounded-2xl border border-border p-5 transition hover:-translate-y-0.5 hover:border-primary/40 ${item.tone}`}
    >
      <div className="relative z-10 flex h-full flex-col">
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2 rounded-full bg-cream/80 px-3 py-1 text-xs font-medium text-ink/70">
            <Icon className="h-3.5 w-3.5" /> {item.eyebrow}
          </span>
          <ArrowRight className="h-5 w-5 text-foreground/45 transition group-hover:translate-x-1 group-hover:text-primary" />
        </div>
        <div className="mt-6 h-36 w-36 transition group-hover:rotate-[-3deg]">
          <CeramicPiece kind={item.visual} label={item.title} />
        </div>
        <div className="mt-auto pt-6">
          <h2 className="text-3xl leading-none">{item.title}</h2>
          <p className="mt-3 text-sm leading-6 text-foreground/70">{item.body}</p>
          <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
            {item.cta}
          </div>
        </div>
      </div>
    </Link>
  );
}

function MoodTile({ item }: { item: (typeof moodCards)[number] }) {
  const Icon = item.icon;
  return (
    <div className={`rounded-2xl border border-border p-5 ${item.tone}`}>
      <div className="grid h-11 w-11 place-items-center rounded-xl bg-card/80 text-ink">
        <Icon className="h-5 w-5" />
      </div>
      <div className="mt-5 font-medium">{item.title}</div>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.body}</p>
    </div>
  );
}

function VisitNote({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof Coffee;
  title: string;
  body: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-secondary text-secondary-foreground">
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0">
        <span className="block font-medium">{title}</span>
        <span className="mt-1 block text-sm leading-5 text-muted-foreground">{body}</span>
      </span>
    </div>
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
        <div className="text-xs uppercase text-muted-foreground">{title}</div>
        <div className="text-sm font-medium">{body}</div>
      </div>
    </div>
  );
}
