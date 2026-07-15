import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Menu, X, Coffee } from "lucide-react";

const links = [
  { to: "/reserver", label: "Réserver" },
  { to: "/brunch", label: "Brunch + Atelier" },
  { to: "/carte", label: "Carte" },
  { to: "/objets", label: "Objets" },
] as const;

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // close mobile menu on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <header
      className={`sticky top-0 z-40 border-b transition-all duration-300 ${
        scrolled
          ? "border-border/70 bg-background/90 shadow-sm shadow-ink/5 backdrop-blur-md"
          : "border-transparent bg-background/60 backdrop-blur"
      }`}
    >
      <div
        className={`mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 transition-all duration-300 ${
          scrolled ? "py-2 sm:py-2.5" : "py-3 sm:py-4"
        }`}
      >
        <Link to="/" className="group flex min-w-0 items-center gap-2 press">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground transition-transform duration-300 group-hover:rotate-[-8deg] group-hover:scale-105">
            <Coffee className="h-4 w-4" />
          </span>
          <span className="truncate font-display text-lg sm:text-xl">Kafé Céramik</span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="nav-link rounded-full px-3 py-1.5 text-sm text-foreground/70 hover:text-foreground"
              activeProps={{
                className: "nav-link rounded-full px-3 py-1.5 text-sm text-foreground",
              }}
            >
              {l.label}
            </Link>
          ))}
          <Link
            to="/reserver"
            className="press shine ml-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm shadow-ink/10 hover:shadow-md hover:shadow-ink/15"
          >
            Réserver un atelier
          </Link>
        </nav>

        <button
          onClick={() => setOpen((v) => !v)}
          className="press grid h-10 w-10 place-items-center rounded-full border border-border bg-card/70 lg:hidden"
          aria-label="Menu"
          aria-expanded={open}
        >
          <span className="relative block h-5 w-5">
            <Menu
              className={`absolute inset-0 h-5 w-5 transition-all duration-300 ${
                open ? "rotate-90 scale-50 opacity-0" : "rotate-0 scale-100 opacity-100"
              }`}
            />
            <X
              className={`absolute inset-0 h-5 w-5 transition-all duration-300 ${
                open ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-50 opacity-0"
              }`}
            />
          </span>
        </button>
      </div>

      <div
        className={`grid overflow-hidden border-border bg-background lg:hidden transition-all duration-300 ease-out ${
          open ? "max-h-[420px] border-t opacity-100" : "max-h-0 border-t-0 opacity-0"
        }`}
      >
        <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3">
          {links.map((l, i) => (
            <Link
              key={l.to}
              to={l.to}
              onClick={() => setOpen(false)}
              style={{ animationDelay: `${i * 40}ms` }}
              className={`press rounded-xl px-3 py-2.5 text-sm hover:bg-secondary ${
                open ? "rise" : ""
              }`}
            >
              {l.label}
            </Link>
          ))}
          <Link
            to="/reserver"
            onClick={() => setOpen(false)}
            className="press shine mt-1 rounded-xl bg-primary px-3 py-2.5 text-center text-sm font-medium text-primary-foreground"
          >
            Réserver un atelier
          </Link>
        </div>
      </div>
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
            Déjeunette &amp; Création. Saint-François, Guadeloupe.
          </p>
        </div>
        <div className="text-sm">
          <div className="font-medium">Nous trouver</div>
          <p className="mt-2 text-muted-foreground">
            Lieu dit Loyette
            <br />
            97118 Saint-François
            <br />
            Guadeloupe
          </p>
        </div>
        <div className="text-sm">
          <div className="font-medium">Horaires</div>
          <p className="mt-2 text-muted-foreground">
            Mardi – Dimanche
            <br />
            9h30 – 18h
          </p>
          <a
            href="tel:+590690284788"
            className="nav-link mt-3 inline-block px-0 py-1 font-medium text-primary"
          >
            0690 28 47 88
          </a>
        </div>
      </div>
      <div className="border-t border-border/60 py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Kafé Céramik — Démo Lovable
      </div>
    </footer>
  );
}
