import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
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
} from "lucide-react";
import { PageShell, PageHeader } from "@/components/page-shell";
import { addReservation, experienceLabel, type ExperienceType } from "@/lib/reservations";

export const Route = createFileRoute("/reserver")({
  head: () => ({
    meta: [
      { title: "Réserver un atelier — Kafé Céramik" },
      { name: "description", content: "Choisissez votre formule, votre date et votre créneau pour un atelier de peinture sur céramique." },
    ],
  }),
  component: ReserverPage,
});

const experiences: { id: ExperienceType; title: string; desc: string; icon: typeof Palette; price: string }[] = [
  { id: "atelier", title: "Atelier libre", desc: "Peinture sur céramique, à votre rythme.", icon: Palette, price: "dès 22 €/pers" },
  { id: "cafe_atelier", title: "Café + atelier", desc: "Une boisson chaude et votre création.", icon: Coffee, price: "dès 28 €/pers" },
  { id: "brunch_atelier", title: "Brunch + atelier", desc: "Brunch gourmand puis création.", icon: CroissantIcon, price: "dès 38 €/pers" },
  { id: "groupe", title: "Groupe / EVJF / Anniversaire", desc: "À partir de 6 personnes.", icon: Users, price: "sur devis" },
];

const SLOTS = ["09:30", "10:30", "11:00", "13:30", "14:00", "15:30", "16:30"];

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

  const next = () => setStep((s) => Math.min(s + 1, 5));
  const back = () => setStep((s) => Math.max(s - 1, 1));

  function submit(payDeposit: boolean) {
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
    setStep(5);
  }

  return (
    <PageShell>
      <PageHeader
        eyebrow="Réservation"
        title="Réservez votre atelier"
        description="En 4 étapes : choisissez votre formule, votre date, vos coordonnées, puis confirmez avec un acompte."
      />
      <section className="mx-auto max-w-3xl px-4 py-10">
        <Stepper step={step} />

        <div className="mt-6 rounded-3xl border border-border bg-card p-5 sm:p-8">
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
                          ? "border-primary bg-primary/5 ring-2 ring-primary/30"
                          : "border-border hover:border-foreground/30"
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
                      onClick={() => setPeople(n)}
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
                <div className="mt-4 rounded-xl bg-accent/15 p-3 text-sm">
                  Pour un groupe, vous pouvez aussi{" "}
                  <Link to="/groupes" className="font-medium text-primary underline">
                    envoyer une demande dédiée
                  </Link>
                  .
                </div>
              )}
            </Step>
          )}

          {step === 2 && (
            <Step title="Choisissez une date">
              <CalendarPicker value={date} onChange={setDate} />
            </Step>
          )}

          {step === 3 && (
            <Step title="Choisissez un créneau">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {SLOTS.map((s) => {
                  const blocked = (s === "13:30" && date.endsWith("3")) || (s === "16:30" && people > 4);
                  return (
                    <button
                      key={s}
                      disabled={blocked}
                      onClick={() => setSlot(s)}
                      className={`rounded-xl border px-3 py-3 text-sm font-medium ${
                        blocked
                          ? "border-border bg-muted text-muted-foreground line-through"
                          : slot === s
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border hover:bg-secondary"
                      }`}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Les créneaux barrés sont complets. Affichage simulé pour la démo.
              </p>
            </Step>
          )}

          {step === 4 && (
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
                    placeholder="Allergies, occasion spéciale, demande particulière…"
                  />
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-dashed border-primary/40 bg-primary/5 p-4">
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

          {step === 5 && done && (
            <div className="text-center py-4">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-sage/20 text-sage">
                <Check className="h-7 w-7" />
              </div>
              <h2 className="mt-4 text-2xl">Réservation enregistrée ✨</h2>
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

          {step < 5 && (
            <div className="mt-8 flex items-center justify-between gap-3">
              <button
                onClick={back}
                disabled={step === 1}
                className="inline-flex items-center gap-1 rounded-full border border-border px-4 py-2 text-sm disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" /> Retour
              </button>
              {step < 4 ? (
                <button
                  onClick={next}
                  disabled={(step === 2 && !date) || (step === 3 && !slot)}
                  className="inline-flex items-center gap-1 rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground disabled:opacity-40"
                >
                  Continuer <ChevronRight className="h-4 w-4" />
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

        {step < 5 && (
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
  const labels = ["Formule", "Date", "Créneau", "Coordonnées", "Confirmation"];
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto">
      {labels.map((l, i) => {
        const n = i + 1;
        const active = step >= n;
        return (
          <div key={l} className="flex items-center gap-1.5">
            <div
              className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-medium ${
                active ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
              }`}
            >
              {n}
            </div>
            <span className={`text-xs ${active ? "text-foreground" : "text-muted-foreground"}`}>{l}</span>
            {n < labels.length && <div className="mx-1 h-px w-4 bg-border" />}
          </div>
        );
      })}
    </div>
  );
}

function CalendarPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [view, setView] = useState(() => {
    const d = new Date();
    return { y: d.getFullYear(), m: d.getMonth() };
  });
  const days = useMemo(() => buildMonth(view.y, view.m), [view]);
  const monthLabel = new Date(view.y, view.m, 1).toLocaleDateString("fr-FR", {
    month: "long", year: "numeric",
  });
  const today = new Date(); today.setHours(0, 0, 0, 0);

  return (
    <div>
      <div className="flex items-center justify-between">
        <button onClick={() => setView(prevMonth(view))} className="grid h-9 w-9 place-items-center rounded-full border border-border">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="font-medium capitalize">{monthLabel}</div>
        <button onClick={() => setView(nextMonth(view))} className="grid h-9 w-9 place-items-center rounded-full border border-border">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-4 grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
        {["L", "M", "M", "J", "V", "S", "D"].map((d, i) => <div key={i} className="py-1">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((d, i) => {
          if (!d) return <div key={i} />;
          const iso = d.toISOString().slice(0, 10);
          const dow = d.getDay(); // 0 = Sun, 1 = Mon
          const closed = dow === 1; // Lundi fermé
          const past = d < today;
          const disabled = closed || past;
          const selected = iso === value;
          return (
            <button
              key={iso}
              disabled={disabled}
              onClick={() => onChange(iso)}
              className={`aspect-square rounded-xl text-sm transition ${
                selected
                  ? "bg-primary text-primary-foreground"
                  : disabled
                    ? "text-muted-foreground/40 line-through"
                    : "hover:bg-secondary"
              }`}
            >
              {d.getDate()}
            </button>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">Fermé le lundi.</p>
    </div>
  );
}

function buildMonth(y: number, m: number) {
  const first = new Date(y, m, 1);
  const lead = (first.getDay() + 6) % 7;
  const total = new Date(y, m + 1, 0).getDate();
  const arr: (Date | null)[] = Array.from({ length: lead }, () => null);
  for (let d = 1; d <= total; d++) arr.push(new Date(y, m, d));
  while (arr.length % 7) arr.push(null);
  return arr;
}
function prevMonth(v: { y: number; m: number }) {
  return v.m === 0 ? { y: v.y - 1, m: 11 } : { y: v.y, m: v.m - 1 };
}
function nextMonth(v: { y: number; m: number }) {
  return v.m === 11 ? { y: v.y + 1, m: 0 } : { y: v.y, m: v.m + 1 };
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
    <div className="mt-4 rounded-2xl border border-border bg-cream/60 p-4 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Récap</div>
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
