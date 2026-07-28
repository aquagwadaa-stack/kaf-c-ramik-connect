import { createFileRoute } from "@tanstack/react-router";
import { Coffee, Phone, ShoppingBag } from "lucide-react";
import { PdfDocument } from "@/components/pdf-document";
import { PageShell, PageHeader } from "@/components/page-shell";
import { getMenuDocument, useContentDocuments, useKafeSettings } from "@/lib/admin-data";

export const Route = createFileRoute("/carte")({
  head: () => ({
    meta: [
      { title: "Carte - Kafé Céramik" },
      {
        name: "description",
        content:
          "Découvre la carte officielle, les cafés, le brunch et les créations gourmandes du Kafé Céramik.",
      },
    ],
  }),
  component: CartePage,
});

const foodPhotos = [
  {
    src: "/photos/brunch-bowl.webp",
    alt: "Brunch gourmand servi au Kafé Céramik",
  },
  {
    src: "/photos/comptoir-gourmand.webp",
    alt: "Comptoir gourmand du Kafé Céramik",
  },
  {
    src: "/photos/atelier-mains.webp",
    alt: "Moment créatif autour d'une consommation au Kafé",
  },
] as const;

function CartePage() {
  const [settings] = useKafeSettings();
  const [documents] = useContentDocuments();
  const menu = getMenuDocument(documents);
  const resource = (menu.resources ?? []).find((item) => item.category === "menu" && item.visible);
  const previews = resource?.previewImageDataUrls?.length
    ? resource.previewImageDataUrls
    : (resource?.previewImageUrls ?? []);
  const phoneHref = settings.contactPhone.replace(/[^+\d]/g, "");

  return (
    <PageShell>
      <PageHeader
        eyebrow="Carte officielle"
        title="Kafé ou déjeunette"
        description="Réserve ta venue pour profiter sereinement du Kafé. Sans réservation, l'accueil reste possible selon les places, sans garantie."
      />

      <section className="mx-auto max-w-6xl px-4 py-10">
        <PdfDocument
          title={resource?.title || menu.title}
          description={resource?.description || menu.body}
          href={
            resource?.attachmentDataUrl ||
            resource?.attachmentUrl ||
            menu.attachmentDataUrl ||
            menu.attachmentUrl
          }
          fileName={resource?.attachmentName || menu.attachmentName}
          previewUrls={
            previews.length
              ? previews
              : menu.previewImageDataUrls?.length
                ? menu.previewImageDataUrls
                : (menu.previewImageUrls ?? [])
          }
          priority
        />

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <InfoCard
            icon={Coffee}
            title="Sur place"
            body="La réservation est recommandée pour le café, le brunch comme pour l'atelier."
          />
          <InfoCard
            icon={ShoppingBag}
            title="À emporter"
            body="Passe ta commande directement par téléphone auprès de l'équipe."
          />
          <a
            href={`tel:${phoneHref}`}
            className="flex items-start gap-3 rounded-2xl border border-border bg-primary p-4 text-primary-foreground"
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/15">
              <Phone className="h-5 w-5" />
            </span>
            <span>
              <span className="block font-medium">Appeler le Kafé</span>
              <span className="mt-1 block text-sm opacity-85">{settings.contactPhone}</span>
            </span>
          </a>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
        <div className="mb-5 max-w-2xl">
          <div className="text-sm font-semibold text-primary">Un aperçu du Kafé</div>
          <h2 className="mt-2 font-display text-3xl sm:text-4xl">
            À savourer entre deux coups de pinceau.
          </h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {foodPhotos.map((photo, index) => (
            <img
              key={photo.src}
              src={photo.src}
              alt={photo.alt}
              loading={index === 0 ? "eager" : "lazy"}
              className="aspect-[4/3] w-full rounded-2xl object-cover"
            />
          ))}
        </div>
      </section>
    </PageShell>
  );
}

function InfoCard({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof Coffee;
  title: string;
  body: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-secondary">
        <Icon className="h-5 w-5" />
      </span>
      <span>
        <span className="block font-medium">{title}</span>
        <span className="mt-1 block text-sm leading-6 text-muted-foreground">{body}</span>
      </span>
    </div>
  );
}
