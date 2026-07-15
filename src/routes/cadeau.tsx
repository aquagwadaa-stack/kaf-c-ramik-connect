import { createFileRoute, Link } from "@tanstack/react-router";
import { Gift, Phone } from "lucide-react";
import { PageShell, PageHeader } from "@/components/page-shell";

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
  return (
    <PageShell>
      <PageHeader
        eyebrow="Offrir"
        title="Carte cadeau"
        description="La carte cadeau en ligne n'est pas encore active. Pour offrir un moment au Kafe Ceramik, contactez directement l'equipe."
      />
      <section className="mx-auto max-w-3xl px-4 py-10">
        <div className="rounded-3xl border border-border bg-card p-6 sm:p-8">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-secondary text-secondary-foreground">
            <Gift className="h-6 w-6" />
          </div>
          <h2 className="mt-5 font-display text-2xl">Offrir un atelier</h2>
          <p className="mt-2 text-muted-foreground">
            Cette partie sera active uniquement si Mala Madre confirme le fonctionnement des cartes
            cadeaux et le paiement associe. Pour le moment, aucune commande ni aucun paiement n'est
            simule depuis le site.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href="tel:+590690284788"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground"
            >
              <Phone className="h-4 w-4" /> Appeler le Kafe
            </a>
            <Link to="/reserver" className="rounded-full border border-border px-5 py-3 text-sm">
              Voir les ateliers
            </Link>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
