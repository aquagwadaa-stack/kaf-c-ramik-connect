import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ExternalLink, Gift, Heart, Paintbrush, Phone, Sparkles } from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { useKafeSettings } from "@/lib/admin-data";

export const Route = createFileRoute("/cadeau")({
  head: () => ({
    meta: [
      { title: "Carte cadeau — Kafé Céramik" },
      {
        name: "description",
        content: "Offrir un moment créatif et gourmand au Kafé Céramik de Saint-François.",
      },
    ],
  }),
  component: CadeauPage,
});

function CadeauPage() {
  const [settings] = useKafeSettings();
  const paymentUrl = settings.giftCardPaymentUrl.trim();
  const phoneUrl = `tel:${settings.contactPhone.replace(/[^+\d]/g, "")}`;

  return (
    <PageShell>
      <section className="relative isolate min-h-[660px] overflow-hidden sm:min-h-[700px]">
        <img
          src="/photos/atelier-mains.webp"
          alt="Peinture d'une tasse en céramique au Kafé"
          className="absolute inset-0 h-full w-full object-cover object-center sm:object-[center_62%]"
        />
        <div className="absolute inset-0 bg-[#301c1a]/55" />
        <div className="relative mx-auto flex min-h-[660px] max-w-6xl items-end px-4 pb-16 pt-32 text-white sm:min-h-[700px] sm:pb-20">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#f4b6cd] px-4 py-2 text-sm font-semibold text-[#401f1c]">
              <Gift className="h-4 w-4" /> À offrir, à peindre, à savourer
            </div>
            <h1 className="mt-6 max-w-3xl font-display text-5xl leading-[0.95] sm:text-7xl lg:text-8xl">
              La carte cadeau Kafé Céramik
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/90 sm:text-xl">
              Offre une parenthèse créative à Saint-François. La personne choisira son moment, sa
              céramique et les couleurs qui lui ressemblent.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {paymentUrl ? (
                <a
                  href={paymentUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-full bg-[#e90061] px-6 py-3.5 font-semibold text-white shadow-lg shadow-black/15 hover:bg-[#cf0057]"
                >
                  <Gift className="h-5 w-5" /> Acheter la carte cadeau
                  <ExternalLink className="h-4 w-4" />
                </a>
              ) : (
                <a
                  href={phoneUrl}
                  className="inline-flex items-center gap-2 rounded-full bg-[#e90061] px-6 py-3.5 font-semibold text-white shadow-lg shadow-black/15 hover:bg-[#cf0057]"
                >
                  <Phone className="h-5 w-5" /> Commander auprès du Kafé
                </a>
              )}
              <Link
                to="/creations"
                className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/10 px-6 py-3.5 font-semibold text-white backdrop-blur-sm hover:bg-white/20"
              >
                Voir les créations <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#fff8ef] px-4 py-16 sm:py-20">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 text-sm font-semibold uppercase text-[#e90061]">
              <Sparkles className="h-4 w-4" /> Une attention vraiment personnelle
            </div>
            <h2 className="mt-4 font-display text-4xl leading-tight text-[#301c1a] sm:text-5xl">
              Pas un objet tout fait. Un moment à créer.
            </h2>
            <p className="mt-5 text-base leading-7 text-[#5e4a46] sm:text-lg">
              Assiette, tasse, bol ou figurine : chacun vient avec son idée et repart, après
              cuisson, avec une pièce unique. Le café, le brunch et l’ambiance du Kafé font partie
              du souvenir.
            </p>
            <div className="mt-7 flex flex-wrap gap-x-6 gap-y-3 text-sm font-medium text-[#5e4a46]">
              <span className="inline-flex items-center gap-2">
                <Paintbrush className="h-4 w-4 text-[#315d39]" /> Créatif
              </span>
              <span className="inline-flex items-center gap-2">
                <Heart className="h-4 w-4 text-[#e90061]" /> À partager
              </span>
              <span className="inline-flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[#f0ad19]" /> Unique
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <img
              src="/creations/assiette-tortue.webp"
              alt="Assiette peinte avec une tortue et des fleurs tropicales"
              className="aspect-[4/5] w-full rounded-[2rem] object-cover"
            />
            <img
              src="/creations/tasse-feuillage.webp"
              alt="Tasse peinte avec un feuillage bleu"
              className="mt-8 aspect-[4/5] w-full rounded-[2rem] object-cover sm:mt-12"
            />
            <img
              src="/creations/bol-vache.webp"
              alt="Bol en céramique peint avec un visage de vache"
              className="-mt-8 aspect-[4/5] w-full rounded-[2rem] object-cover sm:-mt-12"
            />
            <img
              src="/creations/assiette-bateau.webp"
              alt="Grande assiette peinte avec un bateau sur la mer"
              className="aspect-[4/5] w-full rounded-[2rem] object-cover"
            />
          </div>
        </div>
      </section>

      <section className="bg-[#cfe6a5] px-4 py-14 text-[#301c1a]">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-3xl sm:text-4xl">Prêt à faire plaisir ?</h2>
            <p className="mt-2 max-w-2xl leading-7 text-[#4e5f42]">
              Le paiement s’effectue sur la page sécurisée SumUp du Kafé. Pour une question ou une
              demande particulière, l’équipe reste joignable au {settings.contactPhone}.
            </p>
          </div>
          {paymentUrl ? (
            <a
              href={paymentUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-[#e90061] px-6 py-3.5 font-semibold text-white hover:bg-[#cf0057]"
            >
              Choisir la carte <ExternalLink className="h-4 w-4" />
            </a>
          ) : (
            <a
              href={phoneUrl}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-[#301c1a] px-6 py-3.5 font-semibold text-white"
            >
              <Phone className="h-4 w-4" /> Appeler le Kafé
            </a>
          )}
        </div>
      </section>
    </PageShell>
  );
}
