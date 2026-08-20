import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Brush,
  CalendarHeart,
  Clock,
  Coffee,
  MapPin,
  Phone,
  Sparkles,
} from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { CeramicPiece, type CeramicKind } from "@/components/ceramic-piece";
import { getPageImage, useKafeSettings } from "@/lib/admin-data";
import { getPublicSchedule } from "@/lib/opening-hours";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Kafé Céramik — Café-atelier à Saint-François, Guadeloupe" },
      {
        name: "description",
        content:
          "Réserve ton moment créatif chez Kafé Céramik : peinture sur céramique, café, brunch et douceurs maison à Saint-François.",
      },
    ],
  }),
  component: HomePage,
});

const quickLinks = [
  {
    to: "/histoire",
    label: "Déroulement de l’atelier",
    desc: "De la réservation à la récupération",
    icon: Brush,
  },
  {
    to: "/objets",
    label: "Objets à peindre",
    desc: "Formes, catégories et tarifs",
    icon: Sparkles,
  },
  {
    to: "/guide",
    label: "Guide de peinture",
    desc: "Les consignes avant de te lancer",
    icon: CalendarHeart,
  },
] as const;

const pieces: { name: string; detail: string; kind: CeramicKind; tone: string }[] = [
  { name: "Tasses", detail: "à personnaliser", kind: "mug", tone: "bg-[#fff6e7]" },
  { name: "Assiettes", detail: "à personnaliser", kind: "plate", tone: "bg-[#f7cbd6]" },
  { name: "Vases", detail: "à personnaliser", kind: "vase", tone: "bg-[#dce6ca]" },
  { name: "Bols", detail: "à personnaliser", kind: "bowl", tone: "bg-[#fef3b0]" },
];

const homeInspirations = [
  {
    id: "home-inspiration-1" as const,
    title: "Des couleurs qui se répondent",
    body: "Aplats, contours ou petits détails : chaque pièce prend son propre caractère.",
  },
  {
    id: "home-inspiration-2" as const,
    title: "Des motifs à inventer",
    body: "Une idée simple peut devenir une création vraiment personnelle.",
  },
  {
    id: "home-inspiration-3" as const,
    title: "Une pièce du quotidien",
    body: "Tasse, bol ou assiette : choisis un objet que tu auras plaisir à retrouver.",
  },
  {
    id: "home-inspiration-4" as const,
    title: "Ta palette, ton univers",
    body: "Prends le temps de choisir les teintes qui donnent vie à ton idée.",
  },
] as const;

function HomePage() {
  const [settings] = useKafeSettings();
  const heroImage = getPageImage(settings, "home-hero");
  const artistImage = getPageImage(settings, "home-artist");
  const foodImage = getPageImage(settings, "home-food");
  const dessertsImage = getPageImage(settings, "home-desserts");
  const detailImage = getPageImage(settings, "home-detail");
  const schedule = getPublicSchedule(settings);
  const featuredCreations = homeInspirations.map((inspiration) => ({
    ...inspiration,
    image: getPageImage(settings, inspiration.id),
  }));

  return (
    <PageShell>
      <section className="relative min-h-[72svh] overflow-hidden border-b-2 border-ink bg-ink text-cream">
        <img
          src={heroImage.imageUrl}
          alt={heroImage.alt}
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-ink/54" />
        <div className="absolute inset-y-0 left-0 w-3 bg-[#a85f73] sm:w-5" />
        <div className="relative mx-auto flex min-h-[72svh] max-w-6xl items-end px-4 py-12 sm:items-center sm:py-16">
          <div className="max-w-3xl">
            <div className="kafe-poster-label inline-flex rotate-[-1deg] items-center gap-2 bg-[#fef3b0] text-ink">
              <span className="h-2 w-2 rounded-full bg-[#e5cf78]" /> Saint-François ·{" "}
              {schedule.inline}
            </div>
            <h1 className="mt-6 text-4xl leading-[1.12] text-cream sm:text-7xl sm:leading-[1.08] lg:text-8xl">
              Kafé Céramik.
              <br />
              <span className="block text-[#fef3b0] sm:inline">Gourmandise</span>
              <span className="block sm:inline"> &amp; création.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-cream/90 sm:text-lg">
              Viens boire un café, manger un morceau ou peindre ta propre pièce. Réserve ta venue
              pour être certain d’avoir une place adaptée.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/reserver"
                className="kafe-block-link inline-flex items-center gap-2 bg-[#a85f73] px-6 py-3.5 text-sm font-bold text-[#fffaf0] transition hover:-translate-y-0.5"
              >
                <CalendarHeart className="h-4 w-4" /> Réserver un atelier
              </Link>
              <Link
                to="/carte"
                className="kafe-block-link inline-flex items-center gap-2 bg-[#fffaf0] px-6 py-3.5 text-sm font-bold text-ink transition hover:-translate-y-0.5"
              >
                <Coffee className="h-4 w-4" /> Voir la carte
              </Link>
            </div>
          </div>
        </div>
        <div className="checker-strong absolute inset-x-0 bottom-0 h-5 border-t-2 border-ink" />
      </section>

      <section className="border-b-2 border-ink bg-[#fef3b0]">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 sm:grid-cols-3 sm:py-10">
          <VisitNote
            icon={Coffee}
            tone="bg-[#fffaf0]"
            title="Réserve aussi pour le Kafé"
            body="Café, bagel ou brunch : la réservation te garantit une place. Sans elle, l'accueil dépend des disponibilités."
          />
          <VisitNote
            icon={CalendarHeart}
            tone="bg-[#f7e1e6]"
            title="Atelier avec consommation"
            body="Pour peindre, réserve ta table et prévois une consommation obligatoire sur place."
          />
          <VisitNote
            icon={Sparkles}
            tone="bg-[#dce6f7]"
            title="Jusqu’à 4 heures sur place"
            body="Profite de ton moment créatif, puis laisse la place aux artistes suivants."
          />
        </div>
      </section>

      <section className="border-b-2 border-ink bg-[#ffd6a5] py-14 sm:py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
            <div>
              <div className="kafe-poster-label inline-flex items-center gap-2 bg-[#d6ead4] text-ink">
                <Sparkles className="h-3.5 w-3.5 text-[#a85f73]" /> Sur place
              </div>
              <h2 className="mt-5 max-w-xl text-4xl leading-[1.12] text-ink sm:text-5xl">
                Un vrai lieu de vie, pas seulement une table et des pinceaux.
              </h2>
              <p className="mt-5 max-w-xl leading-7 text-ink/75">
                Tu peux venir pour la pause gourmande, pour créer, ou pour les deux. Les photos de
                Manika racontent le Kafé tel qu’il est : vivant, coloré et plein de petits détails.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <figure className="kafe-photo-frame rotate-[-1.5deg]">
                <img
                  src={artistImage.imageUrl}
                  alt={artistImage.alt}
                  loading="lazy"
                  className="aspect-[4/5] h-full w-full object-cover"
                />
              </figure>
              <div className="grid gap-3 sm:gap-4">
                <figure className="kafe-photo-frame rotate-[1deg]">
                  <img
                    src={foodImage.imageUrl}
                    alt={foodImage.alt}
                    loading="lazy"
                    className="aspect-[4/3] h-full w-full object-cover"
                  />
                </figure>
                <figure className="kafe-photo-frame rotate-[-1deg]">
                  <img
                    src={dessertsImage.imageUrl}
                    alt={dessertsImage.alt}
                    loading="lazy"
                    className="aspect-[4/3] h-full w-full object-cover"
                  />
                </figure>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b-2 border-ink bg-[#fffaf1] py-14 sm:py-20">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 lg:grid-cols-[1.2fr_0.8fr]">
          <Link
            to="/histoire"
            hash="deroulement"
            className="kafe-photo-frame group relative min-h-[430px] bg-ink text-cream"
          >
            <img
              src={detailImage.imageUrl}
              alt={detailImage.alt}
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-[1.03]"
            />
            <div className="absolute inset-0 bg-ink/55" />
            <div className="relative flex h-full min-h-[430px] flex-col justify-end p-6 sm:p-8">
              <span className="kafe-poster-label w-fit bg-[#fef3b0] text-ink">
                Avant · pendant · après
              </span>
              <h2 className="mt-4 max-w-xl text-4xl leading-[1.12] sm:text-5xl">
                Comment se passe un atelier ?
              </h2>
              <p className="mt-4 max-w-xl leading-7 text-cream/85">
                Découvre le parcours complet, de la réservation jusqu’à la récupération de ta
                création après cuisson.
              </p>
              <span className="mt-6 inline-flex w-fit items-center gap-2 rounded-full bg-cream px-5 py-3 text-sm font-semibold text-ink">
                Voir le déroulement <ArrowRight className="h-4 w-4" />
              </span>
            </div>
          </Link>

          <div className="grid content-start gap-3">
            <div className="mb-2">
              <div className="text-sm font-semibold text-[#a85f73]">Tout retrouver facilement</div>
              <h2 className="mt-2 text-3xl leading-tight">Prépare ton passage au Kafé.</h2>
            </div>
            {quickLinks.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`kafe-block-link group flex items-center justify-between gap-3 p-4 transition hover:-translate-y-0.5 ${
                    item.to === "/guide"
                      ? "bg-[#f7e1e6]"
                      : item.to === "/objets"
                        ? "bg-[#dce6f7]"
                        : "bg-[#d6ead4]"
                  }`}
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border-2 border-ink bg-[#fffaf0] text-ink">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="min-w-0">
                      <span className="block font-semibold">{item.label}</span>
                      <span className="block text-sm text-muted-foreground">{item.desc}</span>
                    </span>
                  </span>
                  <ArrowRight className="h-5 w-5 shrink-0 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-[#a85f73]" />
                </Link>
              );
            })}
            <a
              href="https://www.google.com/maps?q=16.286364%2C-61.288357"
              target="_blank"
              rel="noreferrer"
              className="kafe-block-link group flex items-center justify-between gap-3 bg-[#8faa93] p-4 text-cream transition hover:-translate-y-0.5"
            >
              <span className="flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-cream/15">
                  <MapPin className="h-5 w-5" />
                </span>
                <span>
                  <span className="block font-semibold">Trouver le Kafé</span>
                  <span className="block text-sm text-cream/75">Lieu dit Loyette</span>
                </span>
              </span>
              <ArrowRight className="h-5 w-5 transition group-hover:translate-x-1" />
            </a>
          </div>
        </div>
      </section>

      <section className="border-b-2 border-ink bg-[#d6ead4] py-14 sm:py-20">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
          <div>
            <div className="kafe-poster-label inline-flex items-center gap-2 bg-[#f7e1e6] text-ink">
              <Brush className="h-3.5 w-3.5" /> Le catalogue
            </div>
            <h2 className="mt-5 text-4xl leading-[1.12] sm:text-5xl">
              Choisis d’abord la forme qui te donne envie.
            </h2>
            <p className="mt-5 max-w-xl leading-7 text-muted-foreground">
              Tasse, bol, assiette, vase ou petite décoration : le catalogue te donne une idée des
              formes et des tarifs. Le choix final se fait sur place.
            </p>
            <Link
              to="/objets"
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
            >
              Découvrir les objets <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {pieces.map((piece) => (
              <Link
                key={piece.name}
                to="/objets"
                className={`kafe-block-link group p-3 transition hover:-translate-y-1 ${piece.tone}`}
              >
                <div className="mx-auto h-24 w-24 transition group-hover:rotate-[-3deg]">
                  <CeramicPiece kind={piece.kind} label={piece.name} />
                </div>
                <div className="mt-2 text-center">
                  <div className="font-semibold">{piece.name}</div>
                  <div className="text-xs text-muted-foreground">{piece.detail}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b-2 border-ink bg-[#f7e1e6] px-4 py-14 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="text-sm font-semibold text-[#a85f73]">Créations</div>
              <h2 className="mt-2 max-w-2xl text-4xl leading-tight sm:text-5xl">
                Des inspirations, jamais des modèles imposés.
              </h2>
              <p className="mt-4 max-w-xl leading-7 text-muted-foreground">
                Motifs tropicaux, aplats colorés ou dessins fins : regarde ce qui a déjà été créé,
                puis invente ta propre pièce.
              </p>
            </div>
            <Link
              to="/creations"
              className="inline-flex w-fit items-center gap-2 rounded-full border border-ink/20 bg-cream px-5 py-3 text-sm font-semibold"
            >
              Toutes les créations <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {featuredCreations.map((photo, index) => (
              <Link key={photo.id} to="/creations" className="group block">
                <div
                  className={`kafe-photo-frame ${index % 2 === 0 ? "rotate-[-1deg]" : "rotate-[1deg]"}`}
                >
                  <img
                    src={photo.image.imageUrl}
                    alt={photo.image.alt}
                    loading="lazy"
                    className="aspect-[4/5] h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
                  />
                </div>
                <div className="mt-4 px-2">
                  <div className="font-semibold">{photo.title}</div>
                  <p className="mt-1 text-sm leading-5 text-muted-foreground">{photo.body}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-6 pt-10">
        <div className="grid gap-3 sm:grid-cols-3">
          <InfoTile icon={MapPin} title="Adresse" body={settings.contactAddress} />
          <InfoTile icon={Clock} title="Horaires atelier" body={schedule.inline} />
          <InfoTile icon={Phone} title="Téléphone" body={settings.contactPhone} />
        </div>
      </section>
    </PageShell>
  );
}

function VisitNote({
  icon: Icon,
  title,
  body,
  tone,
}: {
  icon: typeof Coffee;
  title: string;
  body: string;
  tone: string;
}) {
  return (
    <div className={`kafe-block-link flex items-start gap-3 p-4 ${tone}`}>
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border-2 border-ink bg-[#fffdf8] text-ink">
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0">
        <span className="block font-semibold">{title}</span>
        <span className="mt-1 block text-sm leading-6 text-muted-foreground">{body}</span>
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
    <div className="kafe-block-link flex items-start gap-3 bg-[#fffdf8] p-4">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border-2 border-ink bg-[#fef3b0] text-ink">
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <div className="text-xs uppercase text-muted-foreground">{title}</div>
        <div className="text-sm font-semibold">{body}</div>
      </div>
    </div>
  );
}
