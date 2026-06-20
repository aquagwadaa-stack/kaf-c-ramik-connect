import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Palette,
  Coffee,
  CroissantIcon,
  Users,
  ChevronLeft,
  ChevronRight,
  Check,
  CalendarCheck2,
  Sparkles,
  CalendarDays,
} from "lucide-react";
import { PageShell, PageHeader } from "@/components/page-shell";
import { addReservation, experienceLabel, type ExperienceType } from "@/lib/reservations";

export const Route = createFileRoute("/reserver")({
  head: () => ({
    meta: [
      { title: "Réserver un atelier — Kafé Céramik" },
      { name: "description", content: "Choisissez votre formule et votre créneau dans le planning de la semaine." },
    ],
  }),
  component: ReserverPage,
});

const experiences: { id: ExperienceType; title: string; desc: string; icon: typeof Palette; price: string }[] = [
  { id: "atelier", title: "Atelier libre", desc: "Peinture sur céramique, à votre rythme.", icon: Palette, price: "dès 22 €/pers" },
  { id: "cafe_atelier", title: "Café + atelier", desc: "Une boisson chaude et votre création.", icon: Coffee, price: "dès 28 €/pers" },
  { id: "brunch_atelier", title: "Brunch + atelier", desc: "Brunch gourmand puis création.", icon: CroissantIcon, price: "dès 38 €/pers" },
  { id: "groupe", title: "Groupe / événement", desc: "Pour une grande table ou une occasion spéciale.", icon: Users, price: "sur demande" },
];

const SLOTS = ["09:30", "10:30", "11:30", "13:30", "14:30", "15:30", "16:30"];

function ReserverPage() {
  const [step, setStep] = useState(1);
  const [experience, setExperience] = useState<ExperienceType>("atelier");
  const [people, setPeople] = useState(2);
  const [date, setDate] = useState<string>("");
  const [slot, setSlot] = useState<string>("");
  const [form, setForm] = useState({ firstName: "", lastName: "", phone: "", email: "", message: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [done, setDone] = useState<string | null>(null);

  const deposit = people * 10;

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  const next = () => {
    if (step === 2 && (!date || !slot)) return;
    setStep((s) => Math.min(s + 1, 4));
  };
  const back = () => setStep((s) => Math.max(s - 1, 1));

  function chooseSlot(nextDate: string, nextSlot: string) {
    setDate(nextDate);
    setSlot(nextSlot);
  }

  function submit(payDeposit: boolean) {
    if (!date || !slot) {
      setStep(2);
      return;
    }
    const e: Record<string, string> = {};
    if (!form.firstName) e.firstName = "Requis";
    if (!form.lastName) e.lastName = "Requis";
    if (!form.phone || form.phone.length < 8) e.phone = "Téléphone invalide";
    if (!form.email || !/.+@.+\..+/.test(form.email)) e.email = "Email invalide";
    setErrors(e);
    if (Object.keys(e).length) return;
    const r = addReservation({
      experience,
      people,
      date,
      slot,
      ...form,
      depositPaid: payDeposit,
      status: payDeposit ? "deposit_paid" : "pending",
    });
    setDone(r.id);
    setStep(4);
  }

  return (
    <PageShell>
      <PageHeader
        eyebrow="Réservation"
        title="Réservez votre atelier"
        description="Choisissez votre formule, puis sélectionnez directement un créneau dans le planning de la semaine."
      />
      <section className="mx-auto max-w-5xl px-4 py-10">
        <Stepper step={step} />

        <div className="mt-6 rounded-2xl border border-border bg-card p-5 sm:p-8">
          {step === 1 && (
            <Step title="Quelle expérience vous tente ?">
              <div className="grid gap-3 sm:grid-cols-2">
                {experiences.map((x) => {
                  const Icon = x.icon;
                  const active = experience === x.id;
                  return (
                    <button
                      key={x.id}
                      onClick={() => setExperience(x.id)}
                      className={`text-left rounded-2xl border p-4 transition ${
                        active
                          ? "border-primary bg-primary/10 ring-2 ring-primary/25"
                          : "border-border hover:border-primary/40 hover:bg-secondary/40"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="grid h-10 w-10 place-items-center rounded-xl bg-secondary">
                          <Icon className="h-5 w-5" />
                        </span>
                        <div className="min-w-0">
                          <div className="font-medium">{x.title}</div>
                          <div className="text-xs text-muted-foreground">{x.price}</div>
                        </div>
                      </div>
                      <p className="mt-3 text-sm text-muted-foreground">{x.desc}</p>
                    </button>
                  );
                })}
              </div>

              <div className="mt-6">
                <div className="mb-2 text-sm font-medium">Nombre de personnes</div>
                <div className="flex flex-wrap gap-2">
                  {[1, 2, 3, 4, 5, 6, 8, 10].map((n) => (
                    <button
                      key={n}
                      onClick={() => {
                        setPeople(n);
                        setDate("");
                        setSlot("");
                      }}
                      className={`min-w-12 rounded-full border px-4 py-2 text-sm ${
                        people === n ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-secondary"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              {experience === "groupe" && (
                <div className="mt-4 rounded-xl bg-rose/20 p-3 text-sm">
                  Pour un événement précis, vous pouvez aussi{" "}
                  <Link to="/groupes" className="font-medium text-primary underline">
                    envoyer une demande personnalisée
                  </Link>
                  .
                </div>
              )}
            </Step>
          )}

          {step === 2 && (
            <Step title="Choisissez un créneau cette semaine">
              <WeekPlanner
                people={people}
                selectedDate={date}
                selectedSlot={slot}
                onSelect={chooseSlot}
              />
            </Step>
          )}

          {step === 3 && (
            <Step title="Vos coordonnées">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Prénom" value={form.firstName} onChange={(v) => setForm({ ...form, firstName: v })} error={errors.firstName} />
                <Field label="Nom" value={form.lastName} onChange={(v) => setForm({ ...form, lastName: v })} error={errors.lastName} />
                <Field label="Téléphone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} error={errors.phone} />
                <Field label="Email" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} error={errors.email} />
                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-sm font-medium">Message (optionnel)</label>
                  <textarea
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    rows={3}
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                    placeholder="Allergies, occasion spéciale, demande particulière..."
                  />
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-dashed border-primary/40 bg-primary/10 p-4">
                <div className="flex items-start gap-3">
                  <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <div className="text-sm">
                    <div className="font-medium">Acompte de {deposit} € ({people} × 10 €)</div>
                    <p className="mt-1 text-muted-foreground">
                      L'acompte permet de confirmer votre réservation. Il est déduit de votre note finale.
                      Paiement simulé pour la démo.
                    </p>
                  </div>
                </div>
              </div>
            </Step>
          )}

          {step === 4 && done && (
            <div className="py-4 text-center">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-sage/20 text-sage">
                <Check className="h-7 w-7" />
              </div>
              <h2 className="mt-4 text-2xl">Réservation enregistrée</h2>
              <p className="mt-2 text-muted-foreground">On a hâte de vous accueillir au Kafé.</p>
              <div className="mx-auto mt-6 max-w-md rounded-2xl border border-border bg-secondary/40 p-5 text-left text-sm">
                <Row k="Formule" v={experienceLabel(experience)} />
                <Row k="Personnes" v={`${people}`} />
                <Row k="Date" v={formatDate(date)} />
                <Row k="Créneau" v={slot} />
                <Row k="Acompte" v={`${deposit} €`} />
                <Row k="Référence" v={done} />
              </div>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Link to="/" className="rounded-full border border-border px-4 py-2 text-sm">Accueil</Link>
                <Link to="/admin" className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
                  Voir côté équipe
                </Link>
              </div>
            </div>
          )}

          {step < 4 && (
            <div className="mt-8 flex items-center justify-between gap-3">
              <button
                onClick={back}
                disabled={step === 1}
                className="inline-flex items-center gap-1 rounded-full border border-border px-4 py-2 text-sm disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" /> Retour
              </button>
              {step < 3 ? (
                <button
                  onClick={next}
                  disabled={step === 2 && (!date || !slot)}
                  className="inline-flex items-center gap-1 rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground disabled:opacity-40"
                >
                  {step === 1 ? "Voir les créneaux" : "Continuer"} <ChevronRight className="h-4 w-4" />
                </button>
              ) : (
                <div className="flex flex-wrap justify-end gap-2">
                  <button
                    onClick={() => submit(false)}
                    className="rounded-full border border-border px-4 py-2 text-sm"
                  >
                    Réserver sans acompte
                  </button>
                  <button
                    onClick={() => submit(true)}
                    className="inline-flex items-center gap-1 rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground"
                  >
                    <CalendarCheck2 className="h-4 w-4" /> Payer {deposit} € et confirmer
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {step < 4 && (
          <Summary experience={experience} people={people} date={date} slot={slot} deposit={deposit} />
        )}
      </section>
    </PageShell>
  );
}

function Step({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-xl sm:text-2xl">{title}</h2>
      <div className="mt-5">{children}</div>
    </div>
  );
}

function Field({
  label, value, onChange, type = "text", error,
}: { label: string; value: string; onChange: (v: string) => void; type?: string; error?: string }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring ${
          error ? "border-destructive" : "border-input"
        }`}
      />
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className="text-muted-foreground">{k}</span>
      <span className="font-medium">{v}</span>
    </div>
  );
}

function Stepper({ step }: { step: number }) {
  const labels = ["Formule", "Planning", "Infos", "Confirmé"];
  return (
    <div className="grid grid-cols-4 gap-2">
      {labels.map((l, i) => {
        const n = i + 1;
        const active = step >= n;
        return (
          <div
            key={l}
            className={`rounded-2xl border px-2 py-2 text-center ${
              active ? "border-primary bg-primary/10" : "border-border bg-card/70"
            }`}
          >
            <div
              className={`mx-auto grid h-7 w-7 place-items-center rounded-full text-xs font-medium ${
                active ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
              }`}
            >
              {n}
            </div>
            <div className={`mt-1 truncate text-[11px] ${active ? "text-foreground" : "text-muted-foreground"}`}>{l}</div>
          </div>
        );
      })}
    </div>
  );
}

function WeekPlanner({
  people,
  selectedDate,
  selectedSlot,
  onSelect,
}: {
  people: number;
  selectedDate: string;
  selectedSlot: string;
  onSelect: (date: string, slot: string) => void;
}) {
  const currentWeek = useMemo(() => startOfWeek(new Date()), []);
  const [weekStart, setWeekStart] = useState(currentWeek);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const days = useMemo(() => buildWeek(weekStart), [weekStart]);
  const weekLabel = `${formatShortDate(days[0])} – ${formatShortDate(days[6])}`;
  const canGoBack = weekStart.getTime() > currentWeek.getTime();

  useEffect(() => {
    const node = scrollerRef.current;
    if (!node) return;
    const todayIso = toISODate(new Date());
    const todayIndex = days.findIndex((d) => toISODate(d) === todayIso);
    const targetIndex = todayIndex >= 0 ? todayIndex : 0;
    if (node.scrollWidth > node.clientWidth) {
      const columnWidth = node.scrollWidth / 7;
      node.scrollTo({ left: Math.max(0, targetIndex * columnWidth - 8), behavior: "auto" });
    } else {
      node.scrollTo({ left: 0, behavior: "auto" });
    }
  }, [days]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1.5 text-sm font-medium">
          <CalendarDays className="h-4 w-4 text-primary" /> Semaine du {weekLabel}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => canGoBack && setWeekStart(addDays(weekStart, -7))}
            disabled={!canGoBack}
            className="grid h-9 w-9 place-items-center rounded-full border border-border disabled:opacity-35"
            aria-label="Semaine précédente"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => setWeekStart(addDays(weekStart, 7))}
            className="grid h-9 w-9 place-items-center rounded-full border border-border"
            aria-label="Semaine suivante"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div ref={scrollerRef} className="mt-5 overflow-x-auto pb-2">
        <div className="grid min-w-[840px] grid-cols-7 gap-2">
          {days.map((day) => {
            const iso = toISODate(day);
            const closed = day.getDay() === 1;
            return (
              <div
                key={iso}
                className={`rounded-2xl border p-3 ${
                  closed ? "border-dashed bg-muted/45" : "border-border bg-background/85"
                }`}
              >
                <div className="text-xs uppercase text-muted-foreground">
                  {day.toLocaleDateString("fr-FR", { weekday: "short" })}
                </div>
                <div className="font-display text-2xl">{day.getDate()}</div>
                {closed ? (
                  <div className="mt-4 rounded-xl bg-background/70 px-2 py-3 text-center text-xs text-muted-foreground">
                    Fermé
                  </div>
                ) : (
                  <div className="mt-3 grid gap-1.5">
                    {SLOTS.map((s) => {
                      const state = getSlotAvailability(day, s, people);
                      const selected = selectedDate === iso && selectedSlot === s;
                      return (
                        <button
                          key={s}
                          disabled={state.disabled}
                          onClick={() => onSelect(iso, s)}
                          className={`rounded-xl border px-2 py-2 text-left transition ${
                            selected
                              ? "border-primary bg-primary text-primary-foreground"
                              : state.disabled
                                ? "border-border bg-muted/55 text-muted-foreground line-through"
                                : "border-border bg-card hover:border-primary/45 hover:bg-secondary/60"
                          }`}
                        >
                          <span className="block text-sm font-medium">{s}</span>
                          <span className={`block text-[11px] ${selected ? "text-primary-foreground/75" : "text-muted-foreground"}`}>
                            {state.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        Planning de démonstration : les disponibilités changent selon le jour et le nombre de personnes.
      </p>
    </div>
  );
}

function getSlotAvailability(day: Date, slot: string, people: number) {
  const today = startOfDay(new Date());
  const current = startOfDay(day);
  if (current < today) return { disabled: true, label: "passé" };

  const dow = day.getDay();
  const full =
    (dow === 6 && (slot === "10:30" || slot === "14:30")) ||
    (dow === 0 && slot === "15:30") ||
    (people > 4 && slot === "16:30");

  if (full) return { disabled: true, label: "complet" };

  const limited = (dow === 5 && slot === "10:30") || (people > 3 && slot === "11:30");
  if (limited) return { disabled: false, label: "reste 2 places" };

  return { disabled: false, label: "disponible" };
}

function startOfWeek(date: Date) {
  const d = startOfDay(date);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, count: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + count);
  return d;
}

function buildWeek(start: Date) {
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

function toISODate(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatShortDate(date: Date) {
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

export function formatDate(iso: string) {
  if (!iso) return "—";
  return new Date(iso + "T00:00:00").toLocaleDateString("fr-FR", {
    weekday: "long", day: "numeric", month: "long",
  });
}

function Summary({
  experience, people, date, slot, deposit,
}: { experience: ExperienceType; people: number; date: string; slot: string; deposit: number }) {
  return (
    <div className="mt-4 rounded-2xl border border-border bg-cream/70 p-4 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-xs uppercase text-muted-foreground">Récap</div>
          <div className="font-medium">
            {experienceLabel(experience)} · {people} pers
            {date && ` · ${formatDate(date)}`}
            {slot && ` · ${slot}`}
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-muted-foreground">Acompte simulé</div>
          <div className="font-display text-xl">{deposit} €</div>
        </div>
      </div>
    </div>
  );
}
