import { createFileRoute } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowDown,
  Download,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  Timer,
  Users,
} from "lucide-react";
import { PageShell } from "@/components/page-shell";
import {
  getGuideDocument,
  useContentDocuments,
  type ContentResource,
  type GuideSection,
} from "@/lib/admin-data";

export const Route = createFileRoute("/guide")({
  head: () => ({
    meta: [
      { title: "Guide de l'atelier - Kafé Céramik" },
      {
        name: "description",
        content:
          "Toutes les consignes du Kafé Céramik pour peindre, faire cuire et récupérer sa création.",
      },
    ],
  }),
  component: GuidePage,
});

function GuidePage() {
  const [documents] = useContentDocuments();
  const guide = getGuideDocument(documents);
  const sections = (guide.sections ?? []).filter((section) => section.visible !== false);
  const resources = (guide.resources ?? []).filter((resource) => resource.visible);

  return (
    <PageShell>
      <section className="border-b border-border bg-secondary/70">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 lg:grid-cols-[1fr_auto] lg:items-end lg:py-16">
          <div>
            <div className="inline-flex items-center gap-2 text-sm font-medium text-primary">
              <Sparkles className="h-4 w-4" /> À lire avant de peindre
            </div>
            <h1 className="mt-4 max-w-3xl text-4xl leading-[1.02] sm:text-6xl">{guide.title}</h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
              {guide.intro}
            </p>
          </div>
          <a
            href="#etapes"
            className="inline-flex h-12 items-center gap-2 rounded-full border border-border bg-card px-5 font-medium"
          >
            Commencer le guide <ArrowDown className="h-4 w-4" />
          </a>
        </div>
      </section>

      <section className="border-b border-border bg-card">
        <div className="mx-auto grid max-w-6xl divide-y divide-border px-4 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <KeyFact icon={Timer} title="7 à 10 jours" text="Délai habituel avant récupération" />
          <KeyFact
            icon={ShieldCheck}
            title="2 mois maximum"
            text="Durée de conservation des pièces"
          />
          <KeyFact
            icon={Users}
            title="Surveillance des enfants"
            text="Par l'adulte accompagnateur"
          />
        </div>
      </section>

      <section id="etapes" className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
        <div className="max-w-2xl">
          <div className="text-sm font-medium text-primary">Le bon déroulement</div>
          <h2 className="mt-2 font-display text-3xl sm:text-4xl">
            De la pièce brute à votre création
          </h2>
          {guide.body && <p className="mt-4 leading-7 text-muted-foreground">{guide.body}</p>}
        </div>

        <div className="mt-9 border-y border-border">
          {sections.map((section, index) => (
            <GuideStep key={section.id} section={section} index={index} />
          ))}
        </div>
      </section>

      <section className="border-y border-border bg-primary text-primary-foreground">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 md:grid-cols-[auto_1fr] md:items-start md:py-12">
          <span className="grid h-12 w-12 place-items-center border border-primary-foreground/35">
            <AlertTriangle className="h-6 w-6" />
          </span>
          <div>
            <h2 className="font-display text-2xl">Les points à ne pas manquer</h2>
            <div className="mt-5 grid gap-x-10 gap-y-3 text-sm leading-6 sm:grid-cols-2">
              <Rule text="Servez-vous en petites quantités : la peinture sèche vite dans la palette." />
              <Rule text="Gardez les zones en contact avec la bouche sans peinture." />
              <Rule text="Inscrivez vos initiales sous la pièce et prenez obligatoirement une photo." />
              <Rule text="Les peintures à effets du second nuancier ne se vernissent pas." />
              <Rule text="Un nouvel émaillage ou une seconde cuisson peut être facturé à hauteur de 30 %." />
              <Rule text="Une pièce non récupérée après deux mois peut être donnée." />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
        <div className="max-w-2xl">
          <div className="text-sm font-medium text-primary">Documents officiels</div>
          <h2 className="mt-2 font-display text-3xl sm:text-4xl">
            Le guide et les nuanciers en détail
          </h2>
          <p className="mt-4 leading-7 text-muted-foreground">
            Consultez chaque support avant de commencer. Les couleurs et les étapes diffèrent selon
            la peinture choisie.
          </p>
        </div>
        <div className="mt-8 grid gap-8 lg:grid-cols-2">
          {resources.map((resource) => (
            <ResourcePreview key={resource.id} resource={resource} />
          ))}
        </div>
      </section>
    </PageShell>
  );
}

function KeyFact({ icon: Icon, title, text }: { icon: typeof Timer; title: string; text: string }) {
  return (
    <div className="flex items-start gap-3 py-5 sm:px-5 first:sm:pl-0 last:sm:pr-0">
      <Icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
      <div>
        <div className="font-medium">{title}</div>
        <div className="mt-0.5 text-sm text-muted-foreground">{text}</div>
      </div>
    </div>
  );
}

function GuideStep({ section, index }: { section: GuideSection; index: number }) {
  const image = section.imageDataUrl || section.imageUrl;
  return (
    <article className="grid gap-5 border-b border-border py-6 last:border-0 md:grid-cols-[70px_1fr_210px] md:items-center">
      <div className="font-display text-3xl text-primary/65">{section.number}</div>
      <div>
        <h3 className="font-display text-2xl">{section.title}</h3>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{section.body}</p>
      </div>
      {image && (
        <img
          src={image}
          alt={section.title}
          loading={index > 1 ? "lazy" : undefined}
          className="aspect-[16/10] w-full border border-border object-cover"
        />
      )}
    </article>
  );
}

function Rule({ text }: { text: string }) {
  return (
    <div className="flex gap-3">
      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary-foreground" />
      <span>{text}</span>
    </div>
  );
}

function ResourcePreview({ resource }: { resource: ContentResource }) {
  const previews = resource.previewImageDataUrls?.length
    ? resource.previewImageDataUrls
    : (resource.previewImageUrls ?? []);
  const href = resource.attachmentDataUrl || resource.attachmentUrl;
  return (
    <article className="border-t border-border pt-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-display text-2xl">{resource.title}</h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{resource.description}</p>
        </div>
        {href && (
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="grid h-10 w-10 shrink-0 place-items-center border border-border bg-card"
            aria-label={`Ouvrir ${resource.title}`}
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        )}
      </div>
      <div className="mt-4 grid gap-3">
        {previews.map((preview, index) => (
          <img
            key={`${resource.id}-${index}`}
            src={preview}
            alt={`${resource.title}${previews.length > 1 ? ` - page ${index + 1}` : ""}`}
            loading="lazy"
            className="w-full border border-border bg-white object-contain"
          />
        ))}
      </div>
      {href && (
        <a
          href={href}
          download={resource.attachmentName}
          className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-primary underline underline-offset-4"
        >
          <Download className="h-4 w-4" /> Télécharger le document
        </a>
      )}
    </article>
  );
}
