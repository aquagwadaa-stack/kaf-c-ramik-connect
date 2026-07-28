import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { BookOpenText, Palette, ShieldCheck, type LucideIcon } from "lucide-react";
import { PdfDocument } from "@/components/pdf-document";
import { PageShell } from "@/components/page-shell";
import { getGuideDocument, useContentDocuments } from "@/lib/admin-data";

export const Route = createFileRoute("/guide")({
  head: () => ({
    meta: [
      { title: "Guide de l'atelier - Kafé Céramik" },
      {
        name: "description",
        content:
          "Consulte le guide officiel, les nuanciers et les préventions de l'atelier Kafé Céramik.",
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
    description: "Le document officiel du Kafé, présenté sans adaptation.",
    icon: BookOpenText,
  },
  {
    id: "nuanciers",
    label: "Nuanciers",
    description: "Les couleurs et les gestes à respecter selon la peinture choisie.",
    icon: Palette,
  },
  {
    id: "preventions",
    label: "Préventions",
    description: "Les bons réflexes pour la peinture, le matériel et la céramique.",
    icon: ShieldCheck,
  },
];

function GuidePage() {
  const [documents] = useContentDocuments();
  const guide = getGuideDocument(documents);
  const [activeChapter, setActiveChapter] = useState<GuideChapter>("guide");
  const resources = (guide.resources ?? []).filter((resource) => {
    if (!resource.visible) return false;
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
              Chaque consigne compte. Avant de partir, range et sèche le matériel, laisse le lavabo
              propre et remets ton espace en ordre pour les artistes suivants.
            </p>
          </div>
        </div>
      </section>

      <section className="sticky top-[65px] z-30 border-b border-border bg-background/95 backdrop-blur">
        <div
          className="mx-auto grid max-w-6xl grid-cols-3 gap-1 px-4 py-3"
          role="tablist"
          aria-label="Documents du guide"
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
          <h2 className="mt-2 font-display text-3xl sm:text-4xl">Le document officiel</h2>
          <p className="mt-3 leading-7 text-muted-foreground">{active.description}</p>
        </div>

        <div
          className={`mt-8 grid items-start gap-8 ${activeChapter === "guide" ? "" : "lg:grid-cols-2"}`}
        >
          {resources.map((resource, index) => {
            const previews = resource.previewImageDataUrls?.length
              ? resource.previewImageDataUrls
              : (resource.previewImageUrls ?? []);
            return (
              <PdfDocument
                key={resource.id}
                title={resource.title}
                description={resource.description}
                href={resource.attachmentDataUrl || resource.attachmentUrl}
                fileName={resource.attachmentName}
                previewUrls={previews}
                priority={activeChapter === "guide" && index === 0}
              />
            );
          })}
        </div>
      </section>
    </PageShell>
  );
}
