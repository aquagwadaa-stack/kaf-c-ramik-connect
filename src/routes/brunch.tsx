import { createFileRoute, Link } from "@tanstack/react-router";
import { CroissantIcon, Coffee, Palette, Users, Heart } from "lucide-react";
import { PageShell, PageHeader } from "@/components/page-shell";

export const Route = createFileRoute("/brunch")({
  head: () => ({
    meta: [
      { title: "Brunch + Atelier — Kafé Céramik" },
      { name: "description", content: "La formule Brunch + Atelier : un brunch gourmand suivi d'un atelier de peinture sur céramique." },
    ],
  }),
  component: BrunchPage,
});

function BrunchPage() {
  return (
    <PageShell>
      <PageHeader
        eyebrow="Formule signature"
        title="Brunch + Atelier"
        description="Un brunch maison, puis un atelier de peinture sur céramique. Idéal entre amis, en couple ou en famille."
      />

      <section className="mx-auto max-w-5xl px-4 py-12">
        <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          <div className="rounded-3xl border border-border bg-card p-6 sm:p-8">
            <h2 className="text-2xl">Au programme</h2>
            <ol className="mt-6 space-y-5">
              <Step n="1" title="Bienvenue & café" icon={Coffee}>
                Un café signature, jus pressé maison, ou matcha pour démarrer en douceur.
              </Step>
              <Step n="2" title="Brunch gourmand" icon={CroissantIcon}>
                Plat salé au choix (Summer Body, Ronchon, Morning Bagel…) accompagné de p'tites potatoes
                et d'une touche sucrée maison.
              </Step>
              <Step n="3" title="Atelier céramique" icon={Palette}>
                Choisissez votre pièce, vos couleurs, et créez. Cuisson en atelier, retrait sous 7 jours.
              </Step>
            </ol>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                to="/reserver"
                search={{}}
                className="rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground"
              >
                Réserver cette formule
              </Link>
              <Link to="/carte" className="rounded-full border border-border px-5 py-3 text-sm">
                Voir la carte
              </Link>
            </div>
          </div>

          <aside className="space-y-4">
            <div className="rounded-3xl bg-rose/60 p-6">
              <div className="text-sm uppercase tracking-wide text-foreground/60">À partir de</div>
              <div className="font-display text-5xl">38 €<span className="text-lg">/pers</span></div>
              <p className="mt-2 text-sm text-foreground/70">Boisson + brunch + atelier (céramique incluse).</p>
            </div>
            <Tile icon={Users} title="Entre 2 et 8 personnes" body="Tables réservées en intimité." />
            <Tile icon={Heart} title="Sans prise de tête" body="On s'occupe de la cuisson et du verre d'eau citronnée." />
          </aside>
        </div>
      </section>
    </PageShell>
  );
}

function Step({
  n, title, icon: Icon, children,
}: { n: string; title: string; icon: typeof Coffee; children: React.ReactNode }) {
  return (
    <li className="grid grid-cols-[auto_1fr] gap-4">
      <span className="grid h-10 w-10 place-items-center rounded-full bg-primary text-primary-foreground font-display">{n}</span>
      <div>
        <div className="flex items-center gap-2 font-medium">
          <Icon className="h-4 w-4 text-primary" /> {title}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{children}</p>
      </div>
    </li>
  );
}

function Tile({ icon: Icon, title, body }: { icon: typeof Users; title: string; body: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-secondary">
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <div className="font-medium">{title}</div>
        <div className="text-sm text-muted-foreground">{body}</div>
      </div>
    </div>
  );
}
