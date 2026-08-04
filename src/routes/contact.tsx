import { createFileRoute } from "@tanstack/react-router";
import { ArrowUpRight, Clock3, Instagram, Mail, MapPin, Phone } from "lucide-react";
import { PageShell, PageHeader } from "@/components/page-shell";
import { useKafeSettings } from "@/lib/admin-data";
import { formatPublicTime } from "@/lib/opening-hours";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact - Kafé Céramik" },
      {
        name: "description",
        content: "Contactez le Kafé Céramik et retrouvez facilement le lieu à Saint-François.",
      },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  const [settings] = useKafeSettings();
  const phoneHref = settings.contactPhone.replace(/[^+\d]/g, "");

  return (
    <PageShell>
      <PageHeader
        eyebrow="Saint-François, Guadeloupe"
        title="Une question avant de venir ?"
        description="Pour une demande particulière, un grand groupe ou une organisation hors du parcours habituel, l'équipe te répond directement."
      >
        <div className="flex flex-wrap gap-3">
          <a
            href={`tel:${phoneHref}`}
            className="kafe-block-link inline-flex items-center gap-2 bg-[#f4da45] px-5 py-3 font-bold text-ink"
          >
            <Phone className="h-4 w-4" /> Appeler le Kafé
          </a>
          <a
            href={settings.contactMapUrl}
            target="_blank"
            rel="noreferrer"
            className="kafe-block-link inline-flex items-center gap-2 bg-[#fffbd6] px-5 py-3 font-bold text-ink"
          >
            <MapPin className="h-4 w-4" /> Itinéraire
          </a>
        </div>
      </PageHeader>

      <section className="border-b-2 border-ink bg-[#eea83a] px-4 py-10 lg:py-14">
        <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="kafe-block-link bg-card p-5 sm:p-7">
            <h2 className="font-display text-2xl">Nous contacter</h2>
            <div className="mt-6 divide-y divide-border">
              <ContactRow
                icon={Phone}
                label="Téléphone"
                value={settings.contactPhone}
                href={`tel:${phoneHref}`}
              />
              {settings.contactEmail && (
                <ContactRow
                  icon={Mail}
                  label="Email"
                  value={settings.contactEmail}
                  href={`mailto:${settings.contactEmail}`}
                />
              )}
              {settings.instagramUrl && (
                <ContactRow
                  icon={Instagram}
                  label="Instagram"
                  value="@kafeceramik_guadeloupe"
                  href={settings.instagramUrl}
                  external
                />
              )}
              <ContactRow
                icon={MapPin}
                label="Adresse"
                value={settings.contactAddress}
                href={settings.contactMapUrl}
                external
              />
            </div>

            <div className="mt-7 border-t border-border pt-6">
              <div className="flex items-start gap-3">
                <Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <div>
                  <div className="font-medium">Horaires de l'atelier</div>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    Du mardi au dimanche · 9h30–16h30
                  </p>
                  <p className="text-sm leading-6 text-muted-foreground">
                    Cuisine jusqu'à {formatPublicTime(settings.kitchenClosingTime)}.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="kafe-photo-frame relative min-h-[360px] bg-[#c8d3bd]">
            <iframe
              title="Localisation du Kafé Céramik"
              src="https://www.google.com/maps?q=16.286364,-61.288357&z=15&output=embed"
              loading="lazy"
              className="absolute inset-0 h-full w-full border-0"
            />
            <a
              href={settings.contactMapUrl}
              target="_blank"
              rel="noreferrer"
              className="kafe-block-link absolute bottom-4 left-4 inline-flex items-center gap-2 bg-[#fffbd6] px-4 py-2 text-sm font-bold"
            >
              Voir dans Google Maps <ArrowUpRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </section>
    </PageShell>
  );
}

function ContactRow({
  icon: Icon,
  label,
  value,
  href,
  external,
}: {
  icon: typeof Phone;
  label: string;
  value: string;
  href: string;
  external?: boolean;
}) {
  return (
    <a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noreferrer" : undefined}
      className="group grid grid-cols-[2.5rem_1fr_auto] items-start gap-3 py-4 first:pt-0 last:pb-0"
    >
      <span className="grid h-10 w-10 place-items-center rounded-lg border-2 border-ink bg-[#f4b6cd] text-[#8d194a]">
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0">
        <span className="block text-xs text-muted-foreground">{label}</span>
        <span className="mt-0.5 block break-words text-sm font-medium">{value}</span>
      </span>
      <ArrowUpRight className="mt-2 h-4 w-4 text-muted-foreground transition group-hover:text-primary" />
    </a>
  );
}
