import { createFileRoute } from "@tanstack/react-router";
import { PageShell, PageHeader } from "@/components/page-shell";
import { getGuideDocument, useContentDocuments, type GuideSection } from "@/lib/admin-data";

export const Route = createFileRoute("/guide")({
  head: () => ({
    meta: [
      { title: "Guide atelier - Kafé Céramik" },
      {
        name: "description",
        content:
          "Guide pratique du Kafé Céramik : choisir sa pièce, peindre, laisser cuire et récupérer sa création.",
      },
    ],
  }),
  component: GuidePage,
});

const fallbackImages = [
  "/objets/tasse-design.webp",
  "/creations/tasse-feuillage.webp",
  "/objets/assiettes-empilees.webp",
  "/creations/assiette-tortue.webp",
] as const;

function GuidePage() {
  const [documents] = useContentDocuments();
  const guide = getGuideDocument(documents);
  const sections = guide.sections ?? [];

  return (
    <PageShell>
      <PageHeader eyebrow="Guide atelier" title={guide.title} description={guide.intro} />

      <section className="mx-auto max-w-6xl px-4 py-10">
        {guide.body && (
          <div className="mb-6 rounded-3xl border border-border bg-card p-5 text-sm leading-7 text-muted-foreground shadow-sm shadow-ink/5 sm:p-6">
            {guide.body}
          </div>
        )}

        <div className="grid gap-5">
          {sections.map((section, index) => (
            <GuideSectionCard
              key={section.id}
              section={section}
              image={section.imageDataUrl || fallbackImages[index % fallbackImages.length]}
            />
          ))}
        </div>
      </section>
    </PageShell>
  );
}

function GuideSectionCard({ section, image }: { section: GuideSection; image: string }) {
  return (
    <article className="grid overflow-hidden rounded-3xl border border-border bg-card shadow-sm shadow-ink/5 md:grid-cols-[0.8fr_1fr]">
      <div className="aspect-[4/3] bg-cream md:aspect-auto">
        <img
          src={image}
          alt={section.title}
          loading="lazy"
          className="h-full w-full object-cover"
        />
      </div>
      <div className="p-5 sm:p-6">
        <div className="inline-flex items-center rounded-full bg-secondary px-3 py-1 text-xs font-medium text-muted-foreground">
          Étape {section.number}
        </div>
        <h2 className="mt-4 font-display text-3xl leading-none">{section.title}</h2>
        <p className="mt-4 text-sm leading-6 text-muted-foreground">{section.body}</p>
      </div>
    </article>
  );
}
