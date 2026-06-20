import type { ReactNode } from "react";
import { SiteFooter, SiteHeader } from "./site-header";

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
    <section className="relative overflow-hidden border-b border-border bg-rose/40">
      <div className="blob -left-20 -top-20 h-72 w-72 bg-apricot" />
      <div className="blob -right-10 top-10 h-60 w-60 bg-sage" />
      <div className="relative mx-auto max-w-6xl px-4 py-12 sm:py-16">
        {eyebrow && (
          <div className="mb-3 inline-flex items-center rounded-full bg-background/70 px-3 py-1 text-xs font-medium text-foreground/70">
            {eyebrow}
          </div>
        )}
        <h1 className="text-3xl sm:text-5xl font-semibold">{title}</h1>
        {description && (
          <p className="mt-4 max-w-2xl text-base sm:text-lg text-foreground/70">{description}</p>
        )}
      </div>
    </section>
  );
}
