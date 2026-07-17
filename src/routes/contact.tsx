import { createFileRoute } from "@tanstack/react-router";
import { Clock3, Instagram, Mail, MapPin, Phone } from "lucide-react";
import { PageHeader, PageShell } from "@/components/page-shell";
import { useKafeSettings } from "@/lib/admin-data";
import { formatPublicTime, getPublicSchedule } from "@/lib/opening-hours";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — Kafé Céramik" },
      {
        name: "description",
        content: "Coordonnées, adresse et horaires du Kafé Céramik à Saint-François.",
      },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  const [settings] = useKafeSettings();
  const schedule = getPublicSchedule(settings);
  const phoneHref = settings.contactPhone.replace(/[^+\d]/g, "");

  const contacts = [
    {
      label: "Téléphone",
      value: settings.contactPhone,
      href: `tel:${phoneHref}`,
      icon: Phone,
    },
    settings.contactEmail
      ? {
          label: "Email",
          value: settings.contactEmail,
          href: `mailto:${settings.contactEmail}`,
          icon: Mail,
        }
      : null,
    settings.instagramUrl
      ? {
          label: "Instagram",
          value: "@kafeceramik_guadeloupe",
          href: settings.instagramUrl,
          icon: Instagram,
        }
      : null,
    {
      label: "Nous trouver",
      value: settings.contactAddress,
      href: settings.contactMapUrl,
      icon: MapPin,
    },
  ].filter(Boolean) as { label: string; value: string; href: string; icon: typeof Phone }[];

  return (
    <PageShell>
      <PageHeader
        eyebrow="Contact"
        title="Une demande particulière ?"
        description="Pour une organisation hors du parcours habituel, une grande demande ou une question avant de venir, contactez directement l'équipe."
      />
      <section className="mx-auto max-w-5xl px-4 py-10">
        <div className="grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-2">
          {contacts.map(({ label, value, href, icon: Icon }) => (
            <a
              key={label}
              href={href}
              target={href.startsWith("http") ? "_blank" : undefined}
              rel={href.startsWith("http") ? "noreferrer" : undefined}
              className="flex min-h-32 items-start gap-4 bg-card p-5 transition hover:bg-secondary/50"
            >
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-secondary text-primary">
                <Icon className="h-5 w-5" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm text-muted-foreground">{label}</span>
                <span className="mt-1 block font-medium">{value}</span>
              </span>
            </a>
          ))}
        </div>

        <div className="mt-5 flex items-start gap-3 rounded-2xl border border-border bg-cream/75 p-5">
          <Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div>
            <div className="font-medium">Horaires atelier</div>
            <p className="mt-1 text-sm text-muted-foreground">{schedule.inline}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              La cuisine ferme à {formatPublicTime(settings.kitchenClosingTime)}.
            </p>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
