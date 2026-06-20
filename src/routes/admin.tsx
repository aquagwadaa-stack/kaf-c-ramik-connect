import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Calendar, CalendarDays, CheckCircle2, Clock, Coins, Users2, Ban, AlertCircle,
} from "lucide-react";
import { PageShell, PageHeader } from "@/components/page-shell";
import {
  useReservations, experienceLabel, statusLabel, updateStatus,
  type ReservationStatus,
} from "@/lib/reservations";
import { formatDate } from "./reserver";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Espace équipe — Kafé Céramik" },
      { name: "description", content: "Tableau de bord interne des réservations." },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const list = useReservations();
  const [tab, setTab] = useState<"today" | "upcoming" | "groups" | "all">("today");
  const [blocked, setBlocked] = useState<string[]>([]);

  const today = new Date().toISOString().slice(0, 10);
  const filtered = useMemo(() => {
    if (tab === "today") return list.filter((r) => r.date === today);
    if (tab === "upcoming") return list.filter((r) => r.date >= today);
    if (tab === "groups") return list.filter((r) => r.isGroupRequest);
    return list;
  }, [list, tab, today]);

  const stats = useMemo(() => {
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - ((startOfWeek.getDay() + 6) % 7));
    const sow = startOfWeek.toISOString().slice(0, 10);
    const weekRes = list.filter((r) => r.date >= sow);
    const deposits = list.filter((r) => r.depositPaid).reduce((s, r) => s + r.people * 10, 0);
    const slotCount: Record<string, number> = {};
    list.forEach((r) => { if (r.slot && r.slot !== "—") slotCount[r.slot] = (slotCount[r.slot] || 0) + 1; });
    const topSlot = Object.entries(slotCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";
    const groupReq = list.filter((r) => r.isGroupRequest).length;
    return { weekRes: weekRes.length, deposits, topSlot, groupReq };
  }, [list]);

  function blockSlot() {
    const date = prompt("Date à bloquer (yyyy-mm-dd) :", today);
    if (!date) return;
    const slot = prompt("Créneau à bloquer (ex: 14:00) :", "14:00");
    if (!slot) return;
    setBlocked((b) => [...b, `${date} ${slot}`]);
  }

  return (
    <PageShell>
      <PageHeader
        eyebrow="Espace équipe"
        title="Tableau de bord"
        description="Gérez les réservations, les acomptes et les demandes de groupes."
      />
      <section className="mx-auto max-w-6xl px-4 py-10 space-y-8">
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          <Stat icon={CalendarDays} label="Cette semaine" value={`${stats.weekRes}`} sub="réservations" />
          <Stat icon={Coins} label="Acomptes reçus" value={`${stats.deposits} €`} sub="simulés" />
          <Stat icon={Clock} label="Créneau préféré" value={stats.topSlot} sub="le plus demandé" />
          <Stat icon={Users2} label="Demandes groupes" value={`${stats.groupReq}`} sub="en attente" />
        </div>

        <div className="rounded-3xl border border-border bg-card p-4 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {(["today", "upcoming", "groups", "all"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`rounded-full border px-4 py-1.5 text-sm ${
                    tab === t ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-secondary"
                  }`}
                >
                  {t === "today" && "Aujourd'hui"}
                  {t === "upcoming" && "À venir"}
                  {t === "groups" && "Groupes"}
                  {t === "all" && "Tout"}
                </button>
              ))}
            </div>
            <button
              onClick={blockSlot}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm hover:bg-secondary"
            >
              <Ban className="h-4 w-4" /> Bloquer un créneau
            </button>
          </div>

          {blocked.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {blocked.map((b) => (
                <span key={b} className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-3 py-1 text-xs text-destructive">
                  <Ban className="h-3 w-3" /> {b}
                </span>
              ))}
            </div>
          )}

          <div className="mt-5 overflow-x-auto">
            {filtered.length === 0 ? (
              <div className="rounded-2xl bg-secondary/40 p-8 text-center text-sm text-muted-foreground">
                Aucune réservation pour ce filtre.
              </div>
            ) : (
              <div className="grid gap-3">
                {filtered.map((r) => (
                  <div key={r.id} className="rounded-2xl border border-border bg-background p-4">
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 sm:grid-cols-[1fr_2fr_auto] sm:items-center">
                      <div className="min-w-0">
                        <div className="font-display text-lg">{r.firstName} {r.lastName}</div>
                        <div className="text-xs text-muted-foreground">{r.phone} · {r.email}</div>
                      </div>
                      <div className="hidden sm:block min-w-0">
                        <div className="text-sm">{experienceLabel(r.experience)} · {r.people} pers</div>
                        <div className="text-xs text-muted-foreground">
                          {formatDate(r.date)}{r.slot !== "—" && ` · ${r.slot}`}
                          {r.eventType && ` · ${r.eventType}`}
                          {r.budget && ` · ${r.budget}`}
                        </div>
                      </div>
                      <StatusBadge status={r.status} />
                    </div>

                    <div className="mt-3 grid gap-2 sm:hidden text-sm">
                      <div>{experienceLabel(r.experience)} · {r.people} pers</div>
                      <div className="text-xs text-muted-foreground">
                        {formatDate(r.date)}{r.slot !== "—" && ` · ${r.slot}`}
                      </div>
                    </div>

                    {r.message && (
                      <div className="mt-3 flex items-start gap-2 rounded-xl bg-secondary/40 p-3 text-sm">
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                        <p className="text-foreground/80">{r.message}</p>
                      </div>
                    )}

                    <div className="mt-3 flex flex-wrap gap-2">
                      <StatusButton id={r.id} target="confirmed" current={r.status} label="Confirmer" />
                      <StatusButton id={r.id} target="deposit_paid" current={r.status} label="Marquer acompte" />
                      <StatusButton id={r.id} target="pending" current={r.status} label="En attente" />
                      <StatusButton id={r.id} target="cancelled" current={r.status} label="Annuler" danger />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <WeekCalendar list={list} />
      </section>
    </PageShell>
  );
}

function Stat({
  icon: Icon, label, value, sub,
}: { icon: typeof Calendar; label: string; value: string; sub: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className="h-4 w-4" /> {label}
      </div>
      <div className="mt-2 font-display text-2xl sm:text-3xl">{value}</div>
      <div className="text-xs text-muted-foreground">{sub}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: ReservationStatus }) {
  const map: Record<ReservationStatus, string> = {
    pending: "bg-mustard/30 text-brick",
    deposit_paid: "bg-sage/25 text-sage",
    confirmed: "bg-primary/15 text-primary",
    cancelled: "bg-destructive/15 text-destructive",
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${map[status]}`}>
      <CheckCircle2 className="h-3 w-3" /> {statusLabel(status)}
    </span>
  );
}

function StatusButton({
  id, target, current, label, danger,
}: { id: string; target: ReservationStatus; current: ReservationStatus; label: string; danger?: boolean }) {
  const active = current === target;
  return (
    <button
      onClick={() => updateStatus(id, target)}
      disabled={active}
      className={`rounded-full border px-3 py-1 text-xs ${
        active
          ? "border-foreground/20 bg-secondary text-muted-foreground cursor-default"
          : danger
            ? "border-destructive/30 text-destructive hover:bg-destructive/10"
            : "border-border hover:bg-secondary"
      }`}
    >
      {label}
    </button>
  );
}

function WeekCalendar({ list }: { list: ReturnType<typeof useReservations> }) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d;
  });
  return (
    <div className="rounded-3xl border border-border bg-card p-4 sm:p-6">
      <h2 className="text-2xl">Vue 7 jours</h2>
      <div className="mt-4 grid gap-2 sm:grid-cols-7">
        {days.map((d) => {
          const iso = d.toISOString().slice(0, 10);
          const res = list.filter((r) => r.date === iso);
          const closed = d.getDay() === 1;
          return (
            <div key={iso} className={`rounded-2xl border p-3 ${closed ? "border-dashed bg-muted/40" : "border-border bg-background"}`}>
              <div className="text-xs uppercase text-muted-foreground">
                {d.toLocaleDateString("fr-FR", { weekday: "short" })}
              </div>
              <div className="font-display text-xl">{d.getDate()}</div>
              {closed ? (
                <div className="mt-2 text-xs text-muted-foreground">Fermé</div>
              ) : (
                <div className="mt-2 space-y-1">
                  {res.length === 0 && <div className="text-xs text-muted-foreground">—</div>}
                  {res.map((r) => (
                    <div key={r.id} className="truncate rounded-md bg-primary/10 px-1.5 py-0.5 text-[11px] text-primary">
                      {r.slot} {r.firstName} ({r.people})
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
