import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { BookOpenText, ExternalLink, Palette, ShieldCheck, type LucideIcon } from "lucide-react";
import { OfficialGuideContent } from "@/components/official-guide-content";
import { PageShell } from "@/components/page-shell";
import { getGuideDocument, useContentDocuments, type ContentResource } from "@/lib/admin-data";

export const Route = createFileRoute("/guide")({
  head: () => ({
    meta: [
      { title: "Guide de l'atelier - Kafé Céramik" },
      {
        name: "description",
        content:
          "Consultez le guide officiel, les nuanciers et les préventions de l'atelier Kafé Céramik.",
      },
    ],
  }),
  component: GuidePage,
});

type GuideChapter = "guide" | "nuanciers" | "preventions";

const chapters: {
  id: GuideChapter;
  label: string;
  description: string;
  icon: LucideIcon;
}[] = [
  {
    id: "guide",
    label: "Guide complet",
    description: "Toutes les étapes de l'atelier, dans leur ordre officiel.",
    icon: BookOpenText,
  },
  {
    id: "nuanciers",
    label: "Nuanciers",
    description: "Les gestes changent selon la peinture choisie.",
    icon: Palette,
  },
  {
    id: "preventions",
    label: "Préventions",
    description: "Peinture et céramique : les bons réflexes sur place.",
    icon: ShieldCheck,
  },
];

const officialPreviews: Record<string, string> = {
  "guide-complet": "/documents/guide-complet.webp",
  "nuancier-1": "/documents/nuancier-1.webp",
  "nuancier-2": "/documents/nuancier-2.webp",
  "gaspillage-peinture": "/documents/gaspillage-peinture.webp",
  "casse-ceramique": "/documents/casse-ceramique.webp",
};

function hasNativeOfficialLayout(resource: ContentResource) {
  const preview = resource.previewImageDataUrls?.[0] || resource.previewImageUrls?.[0];
  return preview === officialPreviews[resource.id];
}

function GuidePage() {
  const [documents] = useContentDocuments();
  const guide = getGuideDocument(documents);
  const [activeChapter, setActiveChapter] = useState<GuideChapter>("guide");
  const visibleResources = (guide.resources ?? []).filter((resource) => resource.visible);
  const resources = visibleResources.filter((resource) => {
    if (activeChapter === "guide") return resource.category === "guide";
    if (activeChapter === "nuanciers") return resource.category === "nuancier";
    return resource.category === "prevention";
  });
  const active = chapters.find((chapter) => chapter.id === activeChapter)!;

  return (
    <PageShell>
      <section className="border-b border-border bg-secondary/70">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
          <div className="inline-flex items-center gap-2 text-sm font-medium text-primary">
            <BookOpenText className="h-4 w-4" /> À consulter avant de peindre
          </div>
          <h1 className="mt-4 max-w-4xl text-4xl leading-[1.02] sm:text-6xl">{guide.title}</h1>
          <p className="mt-5 max-w-3xl text-base leading-7 text-muted-foreground sm:text-lg">
            {guide.intro}
          </p>
          <div className="mt-7 flex max-w-3xl items-start gap-3 rounded-2xl border border-primary/20 bg-card/75 p-4 text-sm leading-6">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <p>
              Chaque étape a son importance. Pour que votre création puisse être identifiée, cuite
              et récupérée dans les meilleures conditions, le guide et le nuancier correspondant à
              votre peinture doivent être respectés dans leur intégralité.
            </p>
          </div>
        </div>
      </section>

      <section className="sticky top-[65px] z-30 border-b border-border bg-background/95 backdrop-blur">
        <div
          className="mx-auto grid max-w-6xl grid-cols-3 gap-1 overflow-x-auto px-4 py-3"
          role="tablist"
          aria-label="Chapitres du guide"
        >
          {chapters.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={activeChapter === id}
              onClick={() => setActiveChapter(id)}
              className={`flex min-h-12 min-w-0 items-center justify-center gap-2 rounded-full border px-2 py-2 text-sm font-medium sm:px-4 ${
                activeChapter === id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-foreground hover:bg-secondary"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="text-center text-xs leading-4 sm:text-sm">{label}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10 sm:py-14">
        <div className="max-w-3xl">
          <div className="text-sm font-medium text-primary">{active.label}</div>
          <h2 className="mt-2 font-display text-3xl sm:text-4xl">Le document, sans raccourci</h2>
          <p className="mt-3 leading-7 text-muted-foreground">{active.description}</p>
        </div>

        <div
          className={`mt-8 grid items-start gap-10 ${
            activeChapter === "guide" ? "" : "lg:grid-cols-2"
          }`}
        >
          {resources.map((resource, index) =>
            hasNativeOfficialLayout(resource) ? (
              <div
                key={resource.id}
                className={activeChapter === "guide" ? "mx-auto w-full max-w-5xl" : "w-full"}
              >
                <OfficialGuideContent resource={resource} />
              </div>
            ) : (
              <OfficialBoard
                key={resource.id}
                resource={resource}
                priority={activeChapter === "guide" && index === 0}
                wide={activeChapter === "guide"}
              />
            ),
          )}
        </div>
      </section>
    </PageShell>
  );
}

function OfficialBoard({
  resource,
  priority,
  wide,
}: {
  resource: ContentResource;
  priority?: boolean;
  wide?: boolean;
}) {
  const previews = resource.previewImageDataUrls?.length
    ? resource.previewImageDataUrls
    : (resource.previewImageUrls ?? []);
  const href = resource.attachmentDataUrl || resource.attachmentUrl;

  return (
    <article className={wide ? "mx-auto w-full max-w-4xl" : "w-full"}>
      <div className="flex items-start justify-between gap-4 border-b border-border pb-4">
        <div>
          <h3 className="font-display text-2xl">{resource.title}</h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{resource.description}</p>
        </div>
        {href && (
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-border bg-card hover:bg-secondary"
            aria-label={`Ouvrir ${resource.title}`}
            title="Ouvrir le document en grand"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        )}
      </div>

      <div className="mt-5 grid gap-4">
        {previews.map((preview, index) => (
          <a
            key={`${resource.id}-${index}`}
            href={preview}
            target="_blank"
            rel="noreferrer"
            className="block overflow-hidden rounded-3xl border border-border bg-white shadow-sm"
            title="Agrandir cette page"
          >
            <img
              src={preview}
              alt={`${resource.title}${previews.length > 1 ? ` - page ${index + 1}` : ""}`}
              loading={priority && index === 0 ? "eager" : "lazy"}
              className="h-auto w-full object-contain"
            />
          </a>
        ))}
      </div>
    </article>
  );
}
