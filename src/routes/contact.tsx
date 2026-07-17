import { createFileRoute } from "@tanstack/react-router";
import { ArrowUpRight, Clock3, Coffee, Instagram, Mail, MapPin, Phone } from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { useKafeSettings } from "@/lib/admin-data";
import { formatPublicTime, getPublicSchedule } from "@/lib/opening-hours";

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
  const schedule = getPublicSchedule(settings);
  const phoneHref = settings.contactPhone.replace(/[^+\d]/g, "");

  return (
    <PageShell>
      <section className="border-b border-border bg-secondary/65">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 lg:grid-cols-[1fr_0.85fr] lg:items-end lg:py-16">
          <div>
            <div className="inline-flex items-center gap-2 text-sm font-medium text-primary">
              <Coffee className="h-4 w-4" /> Saint-François, Guadeloupe
            </div>
            <h1 className="mt-4 max-w-3xl text-4xl leading-[1.05] sm:text-6xl">
              Une question avant de venir ?
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
              Pour une demande particulière, un grand groupe ou une organisation hors du parcours
              habituel, l'équipe vous répond directement.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 lg:justify-end">
            <a
              href={`tel:${phoneHref}`}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 font-medium text-primary-foreground shadow-sm"
            >
              <Phone className="h-4 w-4" /> Appeler le Kafé
            </a>
            <a
              href={settings.contactMapUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-5 py-3 font-medium"
            >
              <MapPin className="h-4 w-4" /> Itinéraire
            </a>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-0 px-4 py-10 lg:grid-cols-[0.9fr_1.1fr] lg:py-14">
        <div className="border border-border bg-card p-5 sm:p-7 lg:border-r-0">
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
                <p className="mt-1 text-sm leading-6 text-muted-foreground">{schedule.inline}</p>
                <p className="text-sm leading-6 text-muted-foreground">
                  Cuisine jusqu'à {formatPublicTime(settings.kitchenClosingTime)}.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative min-h-[360px] overflow-hidden border border-border bg-[#c8d3bd]">
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
            className="absolute bottom-4 left-4 inline-flex items-center gap-2 rounded-full bg-card px-4 py-2 text-sm font-medium shadow-lg"
          >
            Voir dans Google Maps <ArrowUpRight className="h-4 w-4" />
          </a>
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
      <span className="grid h-10 w-10 place-items-center bg-secondary text-primary">
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
