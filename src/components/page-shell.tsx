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

export function PageHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
}) {
  return (
    <section className="relative overflow-hidden border-b border-border/60 bg-[#f5cdd7]">
      <OrganicShapes />
      <div className="relative mx-auto max-w-6xl px-4 py-14 sm:py-20">
        {eyebrow && (
          <div className="mb-4 inline-flex items-center rounded-full border border-ink/15 bg-[#fff7e7] px-3 py-1.5 text-xs font-semibold text-ink/75">
            {eyebrow}
          </div>
        )}
        <h1 className="max-w-3xl text-4xl leading-[1.05] text-ink sm:text-6xl">{title}</h1>
        {description && (
          <p className="mt-5 max-w-2xl text-base text-ink/75 sm:text-lg">{description}</p>
        )}
      </div>
      <div className="checker-pink relative h-4" />
    </section>
  );
}
