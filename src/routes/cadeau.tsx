import { createFileRoute, Link } from "@tanstack/react-router";
import { ExternalLink, Gift, Phone } from "lucide-react";
import { PageShell, PageHeader } from "@/components/page-shell";
import { useKafeSettings } from "@/lib/admin-data";

export const Route = createFileRoute("/cadeau")({
  head: () => ({
    meta: [
      { title: "Carte cadeau - Kafe Ceramik" },
      {
        name: "description",
        content: "Informations pratiques pour offrir un moment au Kafe Ceramik.",
      },
    ],
  }),
  component: CadeauPage,
});

function CadeauPage() {
  const [settings] = useKafeSettings();
  const paymentUrl = settings.giftCardPaymentUrl.trim();

  return (
    <PageShell>
      <PageHeader
        eyebrow="Offrir"
        title="Carte cadeau"
        description="Offre un moment créatif et gourmand au Kafé Céramik."
      />
      <section className="mx-auto max-w-3xl px-4 py-10">
        <div className="rounded-3xl border border-border bg-card p-6 sm:p-8">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-secondary text-secondary-foreground">
            <Gift className="h-6 w-6" />
          </div>
          <h2 className="mt-5 font-display text-2xl">Offrir un atelier</h2>
          <p className="mt-2 text-muted-foreground">
            La carte cadeau permet de laisser la personne choisir son moment et sa pièce à peindre.
            Le paiement est réalisé sur la page sécurisée SumUp du Kafé.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            {paymentUrl ? (
              <a
                href={paymentUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground"
              >
                <Gift className="h-4 w-4" /> Acheter une carte cadeau
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            ) : (
              <a
                href={`tel:${settings.contactPhone.replace(/[^+\d]/g, "")}`}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground"
              >
                <Phone className="h-4 w-4" /> Contacter le Kafé
              </a>
            )}
            <Link to="/reserver" className="rounded-full border border-border px-5 py-3 text-sm">
              Voir les ateliers
            </Link>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
