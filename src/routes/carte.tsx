import { createFileRoute } from "@tanstack/react-router";
import { Coffee, Phone, ShoppingBag } from "lucide-react";
import { PdfDocument } from "@/components/pdf-document";
import { PageShell, PageHeader } from "@/components/page-shell";
import {
  getMenuDocument,
  getPageImage,
  useContentDocuments,
  useKafeSettings,
  type PageImageKey,
} from "@/lib/admin-data";

export const Route = createFileRoute("/carte")({
  head: () => ({
    meta: [
      { title: "Carte - Kafé Céramik" },
      {
        name: "description",
        content:
          "Découvre la carte, les cafés, le brunch et les créations gourmandes du Kafé Céramik.",
      },
    ],
  }),
  component: CartePage,
});

const foodPhotoKeys: PageImageKey[] = [
  "menu-food-1",
  "menu-food-2",
  "menu-food-3",
  "menu-food-4",
  "menu-food-5",
  "menu-food-6",
];

function CartePage() {
  const [settings] = useKafeSettings();
  const foodPhotos = foodPhotoKeys.map((key) => getPageImage(settings, key));
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
        eyebrow="Café, brunch & douceurs"
        title="La carte du Kafé"
        description={`Le Kafé t'accueille du mardi au dimanche. Service continu jusqu'à ${settings.kitchenClosingTime.replace(":", "h")}. Réserve ta table pour garantir ta place.`}
      />

      <section className="border-b-2 border-ink bg-[#eea83a] px-4 py-10">
        <div className="mx-auto max-w-6xl">
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
            plain
          />

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <InfoCard
              icon={Coffee}
              title="Sur place"
              body="Café, bagel, pâtisseries et brunch nécessitent une réservation en période scolaire et le week-end. Sans réservation, tu peux tenter ta chance selon les tables disponibles."
            />
            <InfoCard
              icon={ShoppingBag}
              title="À emporter"
              body="Passe ta commande directement par téléphone auprès de l'équipe."
            />
            <a
              href={`tel:${phoneHref}`}
              className="kafe-block-link flex items-start gap-3 bg-[#8d194a] p-4 text-[#fffbd6]"
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
        </div>
      </section>

      <section className="checker-strong border-b-2 border-ink px-4 py-10 sm:py-14">
        <div className="mx-auto max-w-6xl">
          <div className="mb-5 max-w-2xl">
            <div className="kafe-poster-label bg-[#dbea4c] text-ink">Un aperçu du Kafé</div>
            <h2 className="mt-2 font-display text-3xl sm:text-4xl">
              À savourer entre deux coups de pinceau.
            </h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {foodPhotos.map((photo, index) => (
              <img
                key={photo.id}
                src={photo.imageUrl}
                alt={photo.alt}
                loading={index === 0 ? "eager" : "lazy"}
                className={`kafe-photo-frame aspect-[4/3] w-full object-cover ${index % 2 ? "rotate-[0.6deg]" : "rotate-[-0.6deg]"}`}
              />
            ))}
          </div>
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
    <div className="kafe-block-link flex items-start gap-3 bg-[#fffbd6] p-4">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border-2 border-ink bg-[#79c6e8]">
        <Icon className="h-5 w-5" />
      </span>
      <span>
        <span className="block font-medium">{title}</span>
        <span className="mt-1 block text-sm leading-6 text-muted-foreground">{body}</span>
      </span>
    </div>
  );
}
