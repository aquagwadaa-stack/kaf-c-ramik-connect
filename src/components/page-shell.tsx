import type { ReactNode } from "react";
import { useRouterState } from "@tanstack/react-router";
import { SiteFooter, SiteHeader } from "./site-header";
import { OrganicShapes } from "./organic-shapes";

export function PageShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="kafe-site flex min-h-screen flex-col">
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
    <svg aria-hidden viewBox="0 0 100 100" className={className}>
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
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  // Highlight the last word of the title with a marker underline for a handmade feel
  const words = title.trim().split(" ");
  const last = words.pop() ?? "";
  const head = words.join(" ");

  return (
    <section className="kafe-page-header relative overflow-hidden border-b-2 border-ink bg-blush text-ink">
      <OrganicShapes />
      <div
        aria-hidden
        className="checker-strong absolute inset-y-0 right-0 hidden w-[24%] border-l-2 border-ink sm:block"
      />
      <div
        aria-hidden
        className="absolute -right-5 bottom-1 h-36 w-36 rounded-full border-2 border-ink bg-sky sm:right-[16%] sm:h-44 sm:w-44"
      />
      <SunDoodle className="absolute right-5 top-6 h-16 w-16 rotate-6 sm:right-[10%] sm:top-9 sm:h-20 sm:w-20" />
      <SquiggleDoodle className="absolute bottom-8 right-[28%] hidden h-8 w-32 rotate-[-8deg] opacity-90 md:block" />

      <div className="relative mx-auto max-w-6xl px-4 py-12 sm:py-16">
        {eyebrow && (
          <div className="mb-6 inline-flex">
            <span className="kafe-poster-label -rotate-2 bg-lemon text-ink">{eyebrow}</span>
          </div>
        )}
        <h1 className="max-w-3xl text-4xl leading-[1.12] text-ink sm:text-6xl sm:leading-[1.1]">
          {head} <span className="text-brick">{last}</span>
        </h1>
        {description && (
          <p className="mt-6 max-w-2xl text-base leading-7 text-ink/78 sm:text-lg">{description}</p>
        )}
        {children && <div className="mt-8">{children}</div>}
      </div>
      <div className="relative grid h-4 grid-cols-4 border-t-2 border-ink" aria-hidden>
        <span className="bg-lemon" />
        <span className="bg-sky" />
        <span className="bg-sage" />
        <span className="bg-coral" />
      </div>
    </section>
  );
}
