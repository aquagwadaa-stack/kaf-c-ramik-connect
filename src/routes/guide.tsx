import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BookOpenText, CheckCircle2, ClipboardSignature, Coffee } from "lucide-react";
import { PageShell, PageHeader } from "@/components/page-shell";
import { getGuideDocument, useContentDocuments, type GuideSection } from "@/lib/admin-data";

export const Route = createFileRoute("/guide")({
  head: () => ({
    meta: [
      { title: "Guide atelier — Kafé Céramik" },
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

      <section className="mx-auto grid max-w-6xl gap-6 px-4 py-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
        <aside className="rounded-3xl border border-border bg-card p-5 lg:sticky lg:top-24">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary text-primary-foreground">
            <BookOpenText className="h-5 w-5" />
          </div>
          <h2 className="mt-5 font-display text-3xl leading-none">Avant de peindre</h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">{guide.body}</p>
          <div className="mt-5 space-y-3 text-sm">
            <GuidePill icon={Coffee} text="Une consommation est prévue pour l'atelier." />
            <GuidePill
              icon={ClipboardSignature}
              text="La décharge se signe à l'arrivée sur tablette."
            />
            <GuidePill icon={CheckCircle2} text="Les consignes évitent les soucis après cuisson." />
          </div>
          <Link
            to="/reserver"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground"
          >
            Réserver un atelier <ArrowRight className="h-4 w-4" />
          </Link>
        </aside>

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

function GuidePill({ icon: Icon, text }: { icon: typeof Coffee; text: string }) {
  return (
    <div className="flex items-start gap-2 rounded-2xl border border-border bg-background p-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      <span className="text-muted-foreground">{text}</span>
    </div>
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
