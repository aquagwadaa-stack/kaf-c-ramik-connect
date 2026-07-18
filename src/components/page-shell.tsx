import type { ReactNode } from "react";
import { useRouterState } from "@tanstack/react-router";
import { SiteFooter, SiteHeader } from "./site-header";
import { OrganicShapes } from "./organic-shapes";

export function PageShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main key={pathname} className="page-enter flex-1">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}

// Little hand-drawn sun doodle
function SunDoodle({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 100 100"
      className={className}
    >
      <g stroke="var(--color-ink)" strokeWidth="4" strokeLinecap="round" fill="none">
        <circle cx="50" cy="50" r="18" fill="var(--color-mustard)" />
        <path d="M50 12v10M50 78v10M12 50h10M78 50h10M22 22l7 7M71 71l7 7M78 22l-7 7M22 78l7-7" />
      </g>
    </svg>
  );
}

// Squiggle doodle
function SquiggleDoodle({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 120 40" className={className} fill="none">
      <path
        d="M4 20 Q 20 4, 36 20 T 68 20 T 100 20 T 132 20"
        stroke="var(--color-sage)"
        strokeWidth="5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
}) {
  // Highlight the last word of the title with a marker underline for a handmade feel
  const words = title.trim().split(" ");
  const last = words.pop() ?? "";
  const head = words.join(" ");

  return (
    <section className="relative overflow-hidden bg-[#f5cdd7] grain">
      <OrganicShapes />

      {/* Floating doodles */}
      <SunDoodle className="absolute right-6 top-6 h-16 w-16 spin-slow opacity-90 sm:right-12 sm:top-10 sm:h-20 sm:w-20" />
      <SquiggleDoodle className="absolute left-6 bottom-16 hidden h-8 w-32 opacity-70 sm:block" />

      <div className="relative mx-auto max-w-6xl px-4 py-14 sm:py-20">
        {eyebrow && (
          <div className="mb-6 inline-flex">
            <span className="stamp">{eyebrow}</span>
          </div>
        )}
        <h1 className="max-w-3xl text-4xl leading-[1.02] text-ink sm:text-6xl">
          {head}{" "}
          <span className="marker marker-rose whitespace-nowrap">{last}</span>
        </h1>
        {description && (
          <p className="mt-6 max-w-2xl text-base text-ink/80 sm:text-lg">{description}</p>
        )}
      </div>

      {/* Wavy bottom edge instead of the checker strip */}
      <div className="relative -mb-px h-6 w-full wavy-bottom bg-background" />
    </section>
  );
}
