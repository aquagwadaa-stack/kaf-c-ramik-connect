import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Menu, X, Coffee } from "lucide-react";

const links = [
  { to: "/reserver", label: "Réserver" },
  { to: "/brunch", label: "Brunch + Atelier" },
  { to: "/carte", label: "Carte café" },
  { to: "/objets", label: "Objets" },
  { to: "/cadeau", label: "Carte cadeau" },
] as const;

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:py-4">
        <Link to="/" className="flex items-center gap-2 min-w-0">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
            <Coffee className="h-4 w-4" />
          </span>
          <span className="truncate font-display text-lg sm:text-xl">Kafé Céramik</span>
        </Link>
        <nav className="hidden lg:flex items-center gap-1">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="rounded-full px-3 py-1.5 text-sm text-foreground/70 hover:text-foreground hover:bg-secondary transition"
              activeProps={{ className: "rounded-full px-3 py-1.5 text-sm bg-secondary text-foreground" }}
            >
              {l.label}
            </Link>
          ))}
          <Link
            to="/reserver"
            className="ml-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Réserver un atelier
          </Link>
        </nav>
        <button
          onClick={() => setOpen((v) => !v)}
          className="lg:hidden grid h-10 w-10 place-items-center rounded-full border border-border"
          aria-label="Menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      {open && (
        <div className="lg:hidden border-t border-border bg-background">
          <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                className="rounded-xl px-3 py-2.5 text-sm hover:bg-secondary"
              >
                {l.label}
              </Link>
            ))}
            <Link
              to="/reserver"
              onClick={() => setOpen(false)}
              className="mt-1 rounded-xl bg-primary px-3 py-2.5 text-center text-sm font-medium text-primary-foreground"
            >
              Réserver un atelier
            </Link>
            <Link
              to="/admin"
              onClick={() => setOpen(false)}
              className="rounded-xl px-3 py-2.5 text-sm text-muted-foreground hover:bg-secondary"
            >
              Espace équipe
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-border bg-cream">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-3">
        <div>
          <div className="font-display text-xl">Kafé Céramik</div>
          <p className="mt-2 text-sm text-muted-foreground">
            Déjeunette & Création. Saint-François, Guadeloupe.
          </p>
        </div>
        <div className="text-sm">
          <div className="font-medium">Nous trouver</div>
          <p className="mt-2 text-muted-foreground">Lieu dit Loyette<br />97118 Saint-François<br />Guadeloupe</p>
        </div>
        <div className="text-sm">
          <div className="font-medium">Horaires</div>
          <p className="mt-2 text-muted-foreground">Mardi – Dimanche<br />9h30 – 18h</p>
          <a href="tel:+590690284788" className="mt-3 inline-block font-medium text-primary">0690 28 47 88</a>
        </div>
      </div>
      <div className="border-t border-border/60 py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Kafé Céramik — Démo Lovable
      </div>
    </footer>
  );
}
