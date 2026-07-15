import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarCheck2,
  CalendarDays,
  CalendarHeart,
  Check,
  ChevronLeft,
  ChevronRight,
  Coffee,
  CroissantIcon,
  Palette,
  Sparkles,
  Users,
} from "lucide-react";
import { PageShell, PageHeader } from "@/components/page-shell";
import { useKafeSettings, type KafeSettings } from "@/lib/admin-data";
import {
  addReservation,
  experienceLabel,
  formatReservationDate,
  getDepositAmount,
  getRemainingCapacity,
  shouldRequireDeposit,
  shouldWaitForManualConfirmation,
  useReservations,
  type ExperienceType,
  type Reservation,
} from "@/lib/reservations";

export const Route = createFileRoute("/reserver")({
  head: () => ({
    meta: [
      { title: "Réserver un atelier — Kafé Céramik" },
      {
        name: "description",
        content: "Choisissez votre formule et votre créneau dans le planning de la semaine.",
      },
    ],
  }),
  component: ReserverPage,
});

const experiences: {
  id: ExperienceType;
  title: string;
  desc: string;
  icon: typeof Palette;
  price: string;
}[] = [
  {
    id: "cafe_atelier",
    title: "Kafé + atelier",
    desc: "Peinture sur céramique avec une consommation sur place.",
    icon: Coffee,
    price: "pièce + conso",
  },
  {
    id: "brunch_atelier",
    title: "Brunch + atelier",
    desc: "Déjeunette gourmande puis moment créatif.",
    icon: CroissantIcon,
    price: "pièce + brunch",
  },
  {
    id: "groupe",
    title: "Groupe",
    desc: "Pour une grande table ou une demande à organiser.",
    icon: Users,
    price: "validation équipe",
  },
];

function ReserverPage() {
  const reservations = useReservations();
  const [settings] = useKafeSettings();
  const [step, setStep] = useState(1);
  const [experience, setExperience] = useState<ExperienceType>("cafe_atelier");
  const [people, setPeople] = useState(2);
  const [date, setDate] = useState("");
  const [slot, setSlot] = useState("");
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    message: "",
  });
  const [guideAccepted, setGuideAccepted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [done, setDone] = useState<string | null>(null);
  const [doneNotice, setDoneNotice] = useState("");

  const depositRequired = shouldRequireDeposit(people, settings);
  const deposit = getDepositAmount(people, settings);
  const requiresManualReview = shouldWaitForManualConfirmation(people, experience, settings);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  function chooseSlot(nextDate: string, nextSlot: string) {
    setDate(nextDate);
    setSlot(nextSlot);
  }

  function next() {
    if (step === 2 && (!date || !slot)) return;
    setStep((current) => Math.min(current + 1, 4));
  }

  function back() {
    setStep((current) => Math.max(current - 1, 1));
  }

  function submit(payDeposit: boolean) {
    if (!date || !slot) {
      setStep(2);
      return;
    }

    const remaining = getRemainingCapacity(reservations, date, slot, settings);
    if (remaining < people) {
      setErrors({ slot: "Ce créneau n'a plus assez de place pour ce nombre de personnes." });
      setStep(2);
      return;
    }

    const nextErrors: Record<string, string> = {};
    if (!form.firstName) nextErrors.firstName = "Requis";
    if (!form.lastName) nextErrors.lastName = "Requis";
    if (!form.phone || form.phone.length < 8) nextErrors.phone = "Téléphone invalide";
    if (!form.email || !/.+@.+\..+/.test(form.email)) nextErrors.email = "Email invalide";
    if (!guideAccepted)
      nextErrors.guideAccepted = "Merci de confirmer les consignes avant de continuer";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    const status = requiresManualReview
      ? depositRequired && payDeposit
        ? "deposit_paid"
        : "pending"
      : depositRequired
        ? payDeposit
          ? "deposit_paid"
          : "pending"
        : "confirmed";

    const reservation = addReservation({
      experience,
      people,
      date,
      slot,
      ...form,
      depositPaid: depositRequired ? payDeposit : false,
      depositRequired,
      depositAmount: deposit,
      status,
      isGroupRequest: people >= settings.manualConfirmationThreshold || experience === "groupe",
    });

    setDone(reservation.id);
    setDoneNotice(
      requiresManualReview
        ? "Votre demande est enregistrée. L'équipe du Kafé confirmera le créneau dès validation."
        : settings.confirmationEmailText,
    );
    setStep(4);
  }

  return (
    <PageShell>
      <PageHeader
        eyebrow="Réservation"
        title="Réservez votre atelier"
        description="La réservation concerne l'atelier céramique avec consommation sur place. Pour un café, un bagel ou une déjeunette sans peindre, vous pouvez passer librement."
      />
      <section className="mx-auto max-w-5xl px-4 py-10">
        {settings.walkInCafeEnabled && (
          <div className="mb-5 grid gap-3 rounded-2xl border border-border bg-cream/75 p-4 sm:grid-cols-[auto_1fr] sm:items-center">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-secondary text-secondary-foreground">
              <Coffee className="h-5 w-5" />
            </span>
            <div>
              <div className="font-medium">Envie de venir seulement au Kafé ?</div>
              <p className="mt-1 text-sm leading-5 text-muted-foreground">
                {settings.walkInNoticeText}
              </p>
            </div>
          </div>
        )}

        <Stepper step={step} />

        <div className="mt-6 rounded-2xl border border-border bg-card p-5 sm:p-8">
          {step === 1 && (
            <Step title="Quelle expérience vous tente ?">
              <div className="grid gap-3 sm:grid-cols-2">
                {experiences.map((item) => {
                  const Icon = item.icon;
                  const active = experience === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setExperience(item.id)}
                      className={`rounded-2xl border p-4 text-left transition ${
                        active
                          ? "border-primary bg-primary/10 ring-2 ring-primary/25"
                          : "border-border hover:border-primary/40 hover:bg-secondary/40"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="grid h-10 w-10 place-items-center rounded-xl bg-secondary">
                          <Icon className="h-5 w-5" />
                        </span>
                        <span className="min-w-0">
                          <span className="block font-medium">{item.title}</span>
                          <span className="block text-xs text-muted-foreground">{item.price}</span>
                        </span>
                      </div>
                      <p className="mt-3 text-sm text-muted-foreground">{item.desc}</p>
                    </button>
                  );
                })}
              </div>

              <div className="mt-6">
                <div className="mb-2 text-sm font-medium">Nombre de personnes</div>
                <div className="flex flex-wrap gap-2">
                  {[1, 2, 3, 4, 5, 6, 8, 10].map((count) => (
                    <button
                      key={count}
                      onClick={() => {
                        setPeople(count);
                        setDate("");
                        setSlot("");
                      }}
                      className={`min-w-12 rounded-full border px-4 py-2 text-sm ${
                        people === count
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border hover:bg-secondary"
                      }`}
                    >
                      {count}
                    </button>
                  ))}
                </div>
              </div>

              {requiresManualReview && (
                <div className="mt-4 rounded-xl bg-rose/20 p-3 text-sm">
                  Cette demande passera en validation équipe avant confirmation définitive.
                </div>
              )}
            </Step>
          )}

          {step === 2 && (
            <Step title="Choisissez un créneau">
              <WeekPlanner
                people={people}
                reservations={reservations}
                settings={settings}
                selectedDate={date}
                selectedSlot={slot}
                onSelect={chooseSlot}
              />
              {errors.slot && <p className="mt-3 text-sm text-destructive">{errors.slot}</p>}
            </Step>
          )}

          {step === 3 && (
            <Step title="Vos coordonnées">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field
                  label="Prénom"
                  value={form.firstName}
                  onChange={(v) => setForm({ ...form, firstName: v })}
                  error={errors.firstName}
                />
                <Field
                  label="Nom"
                  value={form.lastName}
                  onChange={(v) => setForm({ ...form, lastName: v })}
                  error={errors.lastName}
                />
                <Field
                  label="Téléphone"
                  value={form.phone}
                  onChange={(v) => setForm({ ...form, phone: v })}
                  error={errors.phone}
                />
                <Field
                  label="Email"
                  type="email"
                  value={form.email}
                  onChange={(v) => setForm({ ...form, email: v })}
                  error={errors.email}
                />
                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-sm font-medium">Message (optionnel)</label>
                  <textarea
                    value={form.message}
                    onChange={(event) => setForm({ ...form, message: event.target.value })}
                    rows={3}
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                    placeholder="Allergies, demande particulière, organisation groupe..."
                  />
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-dashed border-primary/40 bg-primary/10 p-4">
                <div className="flex items-start gap-3">
                  <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <div className="text-sm">
                    <div className="font-medium">
                      {depositRequired
                        ? `Acompte groupe de ${deposit} EUR`
                        : "Pas d'acompte en ligne pour ce créneau"}
                    </div>
                    <p className="mt-1 text-muted-foreground">
                      {depositRequired
                        ? "Pour les groupes concernés, l'acompte permet de bloquer la demande. Les conditions exactes sont indiquées par le Kafé."
                        : "Pour peindre, une consommation sur place reste demandée. Les personnes ayant réservé sont prioritaires sur les places atelier."}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-border bg-background p-4 text-sm">
                <div className="font-medium">Conditions pratiques</div>
                <p className="mt-1 text-muted-foreground">{settings.reservationConditionsText}</p>
              </div>

              <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-2xl border border-border bg-background p-4 text-sm">
                <input
                  type="checkbox"
                  checked={guideAccepted}
                  onChange={(event) => setGuideAccepted(event.target.checked)}
                  className="mt-1 h-4 w-4 accent-primary"
                />
                <span>
                  <span className="font-medium">J'ai compris les consignes de l'atelier.</span>
                  <span className="mt-1 block text-muted-foreground">
                    {settings.guideAcceptanceText}
                    {settings.signatureRequiredOnArrival &&
                      " La décharge devra être lue et signée à l'arrivée sur la tablette du Kafé."}
                  </span>
                  {errors.guideAccepted && (
                    <span className="mt-1 block text-xs text-destructive">
                      {errors.guideAccepted}
                    </span>
                  )}
                </span>
              </label>
            </Step>
          )}

          {step === 4 && done && (
            <div className="py-4 text-center">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-sage/20 text-sage">
                <Check className="h-7 w-7" />
              </div>
              <h2 className="mt-4 text-2xl">Réservation enregistrée</h2>
              <p className="mt-2 text-muted-foreground">{doneNotice}</p>
              <div className="mx-auto mt-6 max-w-md rounded-2xl border border-border bg-secondary/40 p-5 text-left text-sm">
                <Row k="Formule" v={experienceLabel(experience)} />
                <Row k="Personnes" v={`${people}`} />
                <Row k="Date" v={formatReservationDate(date)} />
                <Row k="Créneau" v={slot} />
                <Row k="Acompte" v={deposit > 0 ? `${deposit} EUR` : "Non requis"} />
                <Row k="Référence" v={done} />
              </div>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Link to="/" className="rounded-full border border-border px-4 py-2 text-sm">
                  Accueil
                </Link>
                <Link
                  to="/admin"
                  className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
                >
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
                  {step === 1 ? "Voir les créneaux" : "Continuer"}{" "}
                  <ChevronRight className="h-4 w-4" />
                </button>
              ) : depositRequired ? (
                <div className="flex flex-wrap justify-end gap-2">
                  <button
                    onClick={() => submit(false)}
                    className="rounded-full border border-border px-4 py-2 text-sm"
                  >
                    Envoyer la demande
                  </button>
                  <button
                    onClick={() => submit(true)}
                    className="inline-flex items-center gap-1 rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground"
                  >
                    <CalendarCheck2 className="h-4 w-4" /> Simuler l'acompte de {deposit} EUR
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => submit(false)}
                  className="inline-flex items-center gap-1 rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground"
                >
                  <CalendarCheck2 className="h-4 w-4" /> Confirmer la réservation
                </button>
              )}
            </div>
          )}
        </div>

        {step < 4 && (
          <Summary
            experience={experience}
            people={people}
            date={date}
            slot={slot}
            deposit={deposit}
            requiresManualReview={requiresManualReview}
          />
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
  label,
  value,
  onChange,
  type = "text",
  error,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  error?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
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
      {labels.map((label, index) => {
        const number = index + 1;
        const active = step >= number;
        return (
          <div
            key={label}
            className={`rounded-2xl border px-2 py-2 text-center ${
              active ? "border-primary bg-primary/10" : "border-border bg-card/70"
            }`}
          >
            <div
              className={`mx-auto grid h-7 w-7 place-items-center rounded-full text-xs font-medium ${
                active ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
              }`}
            >
              {number}
            </div>
            <div
              className={`mt-1 truncate text-[11px] ${active ? "text-foreground" : "text-muted-foreground"}`}
            >
              {label}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function WeekPlanner({
  people,
  reservations,
  settings,
  selectedDate,
  selectedSlot,
  onSelect,
}: {
  people: number;
  reservations: Reservation[];
  settings: KafeSettings;
  selectedDate: string;
  selectedSlot: string;
  onSelect: (date: string, slot: string) => void;
}) {
  const currentWeek = useMemo(() => startOfWeek(new Date()), []);
  const [weekStart, setWeekStart] = useState(currentWeek);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const days = useMemo(() => buildWeek(weekStart), [weekStart]);
  const weekLabel = `${formatShortDate(days[0])} - ${formatShortDate(days[6])}`;
  const canGoBack = weekStart.getTime() > currentWeek.getTime();

  useEffect(() => {
    const node = scrollerRef.current;
    if (!node) return;
    const todayIso = toISODate(new Date());
    const todayIndex = days.findIndex((day) => toISODate(day) === todayIso);
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
            const closed = settings.closedWeekdays.includes(day.getDay());
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
                    {settings.slots.map((slotOption) => {
                      const state = getSlotAvailability(
                        day,
                        slotOption,
                        people,
                        reservations,
                        settings,
                      );
                      const selected = selectedDate === iso && selectedSlot === slotOption;
                      return (
                        <button
                          key={slotOption}
                          disabled={state.disabled}
                          onClick={() => onSelect(iso, slotOption)}
                          className={`rounded-xl border px-2 py-2 text-left transition ${
                            selected
                              ? "border-primary bg-primary text-primary-foreground"
                              : state.disabled
                                ? "border-border bg-muted/55 text-muted-foreground line-through"
                                : "border-border bg-card hover:border-primary/45 hover:bg-secondary/60"
                          }`}
                        >
                          <span className="block text-sm font-medium">{slotOption}</span>
                          <span
                            className={`block text-[11px] ${selected ? "text-primary-foreground/75" : "text-muted-foreground"}`}
                          >
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
        Durée indicative d'un créneau : {settings.slotDurationMinutes} min. Les créneaux complets ne
        peuvent pas être réservés.
      </p>
    </div>
  );
}

function getSlotAvailability(
  day: Date,
  slot: string,
  people: number,
  reservations: Reservation[],
  settings: KafeSettings,
) {
  const today = startOfDay(new Date());
  const current = startOfDay(day);
  if (current < today) return { disabled: true, label: "passé" };

  const date = toISODate(day);
  const remaining = getRemainingCapacity(reservations, date, slot, settings);
  if (remaining <= 0) return { disabled: true, label: "complet" };
  if (remaining < people) return { disabled: true, label: `${remaining} place(s) restante(s)` };
  if (remaining <= 2) return { disabled: false, label: `${remaining} place(s) restante(s)` };
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

function Summary({
  experience,
  people,
  date,
  slot,
  deposit,
  requiresManualReview,
}: {
  experience: ExperienceType;
  people: number;
  date: string;
  slot: string;
  deposit: number;
  requiresManualReview: boolean;
}) {
  return (
    <div className="mt-4 rounded-2xl border border-border bg-cream/70 p-4 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-xs uppercase text-muted-foreground">Récap</div>
          <div className="font-medium">
            {experienceLabel(experience)} · {people} pers
            {date && ` · ${formatReservationDate(date)}`}
            {slot && ` · ${slot}`}
          </div>
          {requiresManualReview && (
            <div className="mt-1 text-xs text-muted-foreground">
              Validation équipe nécessaire avant confirmation définitive.
            </div>
          )}
        </div>
        <div className="text-right">
          <div className="text-xs text-muted-foreground">Acompte</div>
          <div className="font-display text-xl">
            {deposit > 0 ? `${deposit} EUR` : "Non requis"}
          </div>
        </div>
      </div>
    </div>
  );
}
