import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Facebook, Instagram, Menu, Music2, X, Coffee, ShieldCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useKafeSettings } from "@/lib/admin-data";
import { getPublicSchedule } from "@/lib/opening-hours";
import { useAdminAccess } from "@/lib/supabase-rest";

const links = [
  { to: "/brunch", label: "Déroulement" },
  { to: "/creations", label: "Créations" },
  { to: "/guide", label: "Guide" },
  { to: "/carte", label: "Carte" },
  { to: "/objets", label: "Objets" },
  { to: "/contact", label: "Contact" },
] as const;

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const admin = useAdminAccess();
  const showAdminLink = admin.configured && admin.signedIn && admin.allowed && !admin.checking;

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
          {showAdminLink && (
            <Link
              to="/admin"
              className="nav-link inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm text-foreground/70 hover:text-foreground"
              activeProps={{
                className:
                  "nav-link inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm text-foreground",
              }}
            >
              <ShieldCheck className="h-3.5 w-3.5" /> Admin
            </Link>
          )}
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
        className={`absolute right-4 top-[calc(100%+0.5rem)] w-[min(92vw,330px)] overflow-hidden rounded-2xl border border-border bg-card shadow-xl shadow-ink/15 lg:hidden transition-all duration-200 ease-out ${
          open
            ? "translate-y-0 scale-100 opacity-100"
            : "pointer-events-none -translate-y-2 scale-95 opacity-0"
        }`}
      >
        <div className="flex flex-col gap-1 p-2">
          {links.map((l, i) => (
            <Link
              key={l.to}
              to={l.to}
              onClick={() => setOpen(false)}
              style={{ animationDelay: `${i * 40}ms` }}
              className={`press rounded-xl px-3 py-3 text-left text-sm hover:bg-secondary ${
                open ? "rise" : ""
              }`}
            >
              {l.label}
            </Link>
          ))}
          {showAdminLink && (
            <Link
              to="/admin"
              onClick={() => setOpen(false)}
              className="press inline-flex items-center gap-2 rounded-xl px-3 py-3 text-left text-sm hover:bg-secondary"
            >
              <ShieldCheck className="h-4 w-4" /> Admin
            </Link>
          )}
          <Link
            to="/reserver"
            onClick={() => setOpen(false)}
            className="press shine mt-1 rounded-xl bg-primary px-3 py-3 text-center text-sm font-medium text-primary-foreground"
          >
            Réserver un atelier
          </Link>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  const [settings] = useKafeSettings();
  const schedule = getPublicSchedule(settings);
  const phoneHref = settings.contactPhone.replace(/[^+\d]/g, "");
  const socials = [
    settings.instagramUrl
      ? { label: "Instagram", href: settings.instagramUrl, icon: Instagram }
      : null,
    settings.facebookUrl ? { label: "Facebook", href: settings.facebookUrl, icon: Facebook } : null,
    settings.tiktokUrl ? { label: "TikTok", href: settings.tiktokUrl, icon: Music2 } : null,
  ].filter(Boolean) as { label: string; href: string; icon: LucideIcon }[];

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
          <p className="mt-2 text-muted-foreground">{settings.contactAddress}</p>
        </div>
        <div className="text-sm">
          <div className="font-medium">Horaires</div>
          <p className="mt-2 text-muted-foreground">
            {schedule.days}
            <br />
            {schedule.hours}
          </p>
          <a
            href={`tel:${phoneHref}`}
            className="nav-link mt-3 inline-block px-0 py-1 font-medium text-primary"
          >
            {settings.contactPhone}
          </a>
          {settings.contactEmail && (
            <a
              href={`mailto:${settings.contactEmail}`}
              className="nav-link mt-1 block px-0 py-1 font-medium text-primary"
            >
              {settings.contactEmail}
            </a>
          )}
          {socials.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {socials.map(({ label, href, icon: Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={label}
                  className="grid h-9 w-9 place-items-center rounded-full border border-border bg-background text-primary transition hover:bg-secondary"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="border-t border-border/60 py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Kafé Céramik — Démo Lovable
      </div>
    </footer>
  );
}
