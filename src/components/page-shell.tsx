import type { ReactNode } from "react";
import { SiteFooter, SiteHeader } from "./site-header";
import { OrganicShapes } from "./organic-shapes";

export function PageShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="flex-1">{children}</main>
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
    <section className="relative overflow-hidden border-b border-border/60">
      <OrganicShapes />
      <div className="relative mx-auto max-w-6xl px-4 py-14 sm:py-20">
        {eyebrow && (
          <div className="mb-3 inline-flex items-center rounded-full border border-ink/15 bg-cream/80 px-3 py-1 text-xs font-medium text-ink/70">
            {eyebrow}
          </div>
        )}
        <h1 className="text-4xl sm:text-6xl text-ink max-w-3xl leading-[1.05]">{title}</h1>
        {description && (
          <p className="mt-5 max-w-2xl text-base sm:text-lg text-ink/75">{description}</p>
        )}
      </div>
    </section>
  );
}
