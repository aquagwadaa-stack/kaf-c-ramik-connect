import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChevronDown, Facebook, Instagram, Menu, Music2, X, ShieldCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useKafeSettings } from "@/lib/admin-data";
import { getPublicSchedule } from "@/lib/opening-hours";
import { useAdminAccess } from "@/lib/supabase-rest";

const baseLinks = [
  { to: "/histoire", label: "Le Kafé" },
  { to: "/creations", label: "Créations" },
  { to: "/guide", label: "Guide" },
  { to: "/carte", label: "Carte" },
  { to: "/objets", label: "Objets" },
  { to: "/cadeau", label: "Carte cadeau" },
  { to: "/contact", label: "Contact" },
] as const;

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [installedApp, setInstalledApp] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const admin = useAdminAccess();
  const [settings] = useKafeSettings();
  const links = [
    ...baseLinks.slice(0, -1),
    ...(settings.guestbookEnabled ? [{ to: "/livre-dor" as const, label: "Livre d'or" }] : []),
    baseLinks[baseLinks.length - 1],
  ];
  const showAdminLink = admin.configured && admin.signedIn && admin.allowed && !admin.checking;
  const showTeamEntry = showAdminLink || installedApp;
  const primaryLinks = links.slice(0, 5);
  const moreLinks = links.slice(5);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const displayMode = window.matchMedia("(display-mode: standalone)");
    const detectInstalledApp = () => {
      const navigatorWithStandalone = window.navigator as Navigator & { standalone?: boolean };
      setInstalledApp(displayMode.matches || navigatorWithStandalone.standalone === true);
    };
    detectInstalledApp();
    displayMode.addEventListener("change", detectInstalledApp);
    return () => displayMode.removeEventListener("change", detectInstalledApp);
  }, []);

  // close mobile menu on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <header
      className={`sticky top-0 z-40 border-b-2 border-ink transition-all duration-300 ${
        scrolled
          ? "bg-[#fffaf0]/95 shadow-[0_4px_0_rgba(47,22,32,0.12)] backdrop-blur-md"
          : "bg-[#fffaf0]/92 backdrop-blur"
      }`}
    >
      <div className="grid h-1.5 grid-cols-5" aria-hidden>
        <span className="bg-[#a85f73]" />
        <span className="bg-[#fef3b0]" />
        <span className="bg-[#dce6f7]" />
        <span className="bg-[#d6ead4]" />
        <span className="bg-[#ffc1b6]" />
      </div>
      <div
        className={`mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 transition-all duration-300 ${
          scrolled ? "py-2 sm:py-2.5" : "py-3 sm:py-4"
        }`}
      >
        <Link to="/" className="group flex min-w-0 items-center gap-2 press">
          <span className="h-11 w-11 shrink-0 overflow-hidden rounded-full border-2 border-ink bg-card shadow-[2px_2px_0_#2f1620] transition-transform duration-300 group-hover:rotate-[-6deg] group-hover:scale-105">
            <img src="/brand/kafe-ceramik-logo.jpg" alt="" className="h-full w-full object-cover" />
          </span>
          <span className="whitespace-nowrap font-display text-base text-ink sm:text-xl">
            Kafé Céramik
          </span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {primaryLinks.map((l) => (
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
          <div className="group relative">
            <button
              type="button"
              className="nav-link inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm text-foreground/70 hover:text-foreground"
            >
              Plus <ChevronDown className="h-3.5 w-3.5" />
            </button>
            <div className="invisible absolute right-0 top-full z-50 mt-2 w-48 translate-y-1 rounded-xl border-2 border-ink bg-[#fffdf8] p-2 opacity-0 shadow-[5px_5px_0_#2f1620] transition group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100">
              {moreLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className="block rounded-xl px-3 py-2.5 text-sm hover:bg-secondary"
                  activeProps={{ className: "block rounded-xl bg-secondary px-3 py-2.5 text-sm" }}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
          {showTeamEntry && (
            <Link
              to="/admin"
              className="nav-link inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm text-foreground/70 hover:text-foreground"
              activeProps={{
                className:
                  "nav-link inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm text-foreground",
              }}
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              {showAdminLink ? "Admin" : "Espace équipe"}
            </Link>
          )}
          <Link
            to="/reserver"
            className="press ml-2 rounded-xl border-2 border-ink bg-[#a85f73] px-4 py-2 text-sm font-bold text-[#fffaf0] shadow-[3px_3px_0_#2f1620]"
          >
            Réserver un atelier
          </Link>
        </nav>

        <button
          onClick={() => setOpen((v) => !v)}
          className="press grid h-10 w-10 place-items-center rounded-xl border-2 border-ink bg-[#fef3b0] shadow-[2px_2px_0_#2f1620] lg:hidden"
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
        className={`absolute right-4 top-[calc(100%+0.5rem)] w-[min(92vw,330px)] overflow-hidden rounded-xl border-2 border-ink bg-[#fffdf8] shadow-[6px_6px_0_#2f1620] lg:hidden transition-all duration-200 ease-out ${
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
          {showTeamEntry && (
            <Link
              to="/admin"
              onClick={() => setOpen(false)}
              className="press inline-flex items-center gap-2 rounded-xl px-3 py-3 text-left text-sm hover:bg-secondary"
            >
              <ShieldCheck className="h-4 w-4" />
              {showAdminLink ? "Admin" : "Espace équipe"}
            </Link>
          )}
          <Link
            to="/reserver"
            onClick={() => setOpen(false)}
            className="press mt-1 rounded-lg border-2 border-ink bg-[#a85f73] px-3 py-3 text-center text-sm font-bold text-[#fffaf0]"
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
    <footer className="relative mt-20 border-t-2 border-ink bg-[#98566b] text-[#fffaf0]">
      <div className="grid h-4 grid-cols-5 border-b-2 border-ink" aria-hidden>
        <span className="bg-[#fef3b0]" />
        <span className="bg-[#dce6f7]" />
        <span className="bg-[#a85f73]" />
        <span className="bg-[#d6ead4]" />
        <span className="bg-[#ffc1b6]" />
      </div>
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-[1.2fr_0.8fr_1fr]">
        <div>
          <div className="flex items-center gap-3">
            <img
              src="/brand/kafe-ceramik-logo.jpg"
              alt=""
              className="h-16 w-16 rounded-full border-2 border-[#fffaf0] object-cover"
            />
            <div className="font-display text-2xl">Kafé Céramik</div>
          </div>
          <p className="mt-4 max-w-sm text-sm leading-6 text-[#fffaf0]/80">
            Café, création et gourmandises à Saint-François.
          </p>
        </div>
        <div className="border-l-2 border-[#fffaf0]/25 pl-5 text-sm">
          <div className="font-poster text-xl font-extrabold uppercase">Nous trouver</div>
          <p className="mt-2 leading-6 text-[#fffaf0]/80">{settings.contactAddress}</p>
        </div>
        <div className="text-sm">
          <div className="font-poster text-xl font-extrabold uppercase">Horaires</div>
          <p className="mt-2 leading-6 text-[#fffaf0]/80">
            {schedule.days}
            <br />
            {schedule.hours}
          </p>
          <a href={`tel:${phoneHref}`} className="mt-3 inline-block font-bold text-[#fef3b0]">
            {settings.contactPhone}
          </a>
          {settings.contactEmail && (
            <a
              href={`mailto:${settings.contactEmail}`}
              className="mt-1 block font-bold text-[#fef3b0]"
            >
              {settings.contactEmail}
            </a>
          )}
          {socials.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {socials.map(({ label, href, icon: Icon }, index) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={label}
                  className={`grid h-10 w-10 place-items-center rounded-full border-2 border-ink text-ink shadow-[2px_2px_0_#2f1620] ${
                    index % 3 === 0
                      ? "bg-[#fef3b0]"
                      : index % 3 === 1
                        ? "bg-[#dce6f7]"
                        : "bg-[#d6ead4]"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="border-t border-[#fffaf0]/20 py-4 text-center text-xs text-[#fffaf0]/65">
        © {new Date().getFullYear()} Kafé Céramik · Saint-François
      </div>
    </footer>
  );
}
