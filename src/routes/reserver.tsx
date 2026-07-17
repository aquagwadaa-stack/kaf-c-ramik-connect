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
  Minus,
  Palette,
  Plus,
  Sparkles,
  Users,
} from "lucide-react";
import { PageShell, PageHeader } from "@/components/page-shell";
import { useKafeSettings, type KafeSettings } from "@/lib/admin-data";
import { formatPublicTime } from "@/lib/opening-hours";
import {
  addReservation,
  experienceLabel,
  formatDuration,
  formatReservationDate,
  getDepositAmount,
  getSlotPlacement,
  getSlotsForDate,
  refreshReservationOccupancies,
  sendReservationCreatedEmails,
  shouldRequireDeposit,
  shouldWaitForManualConfirmation,
  useReservationOccupancies,
  useReservations,
  type ExperienceType,
  type Reservation,
  type SlotOccupancy,
} from "@/lib/reservations";

export const Route = createFileRoute("/reserver")({
  head: () => ({
    meta: [
      { title: "Réserver un atelier — Kafé Céramik" },
      {
        name: "description",
        content: "Choisis ton créneau dans le planning de la semaine.",
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
    title: "Atelier céramique",
    desc: "Peinture sur céramique avec consommation obligatoire sur place (café, boisson, bagel ou douceur).",
    icon: Palette,
    price: "pièce + conso",
  },
  {
    id: "brunch_atelier",
    title: "Brunch",
    desc: "Brunch gourmand seul, sans atelier céramique.",
    icon: CroissantIcon,
    price: "brunch seul",
  },
];

function ReserverPage() {
  const reservations = useReservations();
  const occupancies = useReservationOccupancies();
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
    childrenAges: "",
    message: "",
  });
  const [guideAccepted, setGuideAccepted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [done, setDone] = useState<string | null>(null);
  const [doneNotice, setDoneNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const depositRequired = shouldRequireDeposit(people, settings, experience);
  const deposit = getDepositAmount(people, settings, experience);
  const requiresManualReview = shouldWaitForManualConfirmation(people, experience, settings);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  function chooseSlot(nextDate: string, nextSlot: string) {
    setDate(nextDate);
    setSlot(nextSlot);
    setErrors((current) => ({ ...current, slot: "" }));
    setSubmitError("");
  }

  function next() {
    if (step === 2 && (!date || !slot)) return;
    setStep((current) => Math.min(current + 1, 4));
  }

  function back() {
    setStep((current) => Math.max(current - 1, 1));
  }

  async function submit() {
    if (!date || !slot) {
      setStep(2);
      return;
    }

    const placement = getSlotPlacement(reservations, occupancies, date, slot, people, settings);
    if (!placement.unitId) {
      setErrors({
        slot:
          placement.maxGroupSize > 0
            ? `Il reste des places, mais aucun espace ne peut accueillir ton groupe de ${people} personnes ensemble.`
            : "Ce créneau est complet.",
      });
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

    const status = requiresManualReview || depositRequired ? "pending" : "confirmed";

    setSubmitting(true);
    setSubmitError("");
    let reservation: Reservation;
    try {
      reservation = await addReservation({
        experience,
        people,
        date,
        slot,
        ...form,
        guideAccepted,
        seatingUnitId: placement.unitId,
        depositPaid: false,
        depositRequired,
        depositAmount: deposit,
        status,
        isGroupRequest: people >= settings.manualConfirmationThreshold || experience === "groupe",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const schedulingConflict =
        message.includes("KAFE_SLOT_FULL") ||
        message.includes("KAFE_INVALID_SLOT") ||
        message.includes("KAFE_INVALID_DATE") ||
        message.includes("KAFE_SEATING_REVIEW_REQUIRED");
      const friendlyMessage = message.includes("KAFE_SLOT_FULL")
        ? "Ce créneau vient d'être rempli par une autre réservation. Choisis un autre horaire."
        : schedulingConflict
          ? "Ce créneau n'est plus réservable. Choisis une autre date ou un autre horaire."
          : "La réservation n'a pas pu être enregistrée. Réessayez dans un instant.";
      if (schedulingConflict) {
        setSlot("");
        setErrors((current) => ({ ...current, slot: friendlyMessage }));
        setStep(2);
        refreshReservationOccupancies();
      } else {
        setSubmitError(friendlyMessage);
      }
      setSubmitting(false);
      return;
    }
    const emailDispatch = await sendReservationCreatedEmails(reservation.id).catch(() => ({
      ok: false,
      delivered: false,
    }));
    setSubmitting(false);

    setDone(reservation.id);
    setDoneNotice(
      emailDispatch.delivered
        ? requiresManualReview
          ? "Ta demande est enregistrée. Tu as reçu un email récapitulatif et l'équipe te recontactera après validation."
          : "Ta réservation est confirmée. Un email récapitulatif vient de t'être envoyé."
        : requiresManualReview
          ? "Ta demande est enregistrée. L'équipe du Kafé confirmera le créneau dès validation."
          : settings.confirmationEmailText,
    );
    setStep(4);
  }

  return (
    <PageShell>
      <PageHeader
        eyebrow="Réservation"
        title="Réserve ton atelier"
        description="La réservation concerne l'atelier céramique avec consommation sur place. Pour un café, un bagel ou une déjeunette sans peindre, tu peux passer librement."
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
            <Step title="Quelle expérience te tente ?">
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
                <div className="mb-2 text-sm font-medium">Nombre total de personnes</div>
                <div className="inline-grid grid-cols-[2.75rem_5rem_2.75rem] items-center overflow-hidden rounded-xl border border-border bg-background">
                  <button
                    type="button"
                    aria-label="Retirer une personne"
                    disabled={people <= 1}
                    onClick={() => {
                      setPeople((current) => Math.max(1, current - 1));
                      setDate("");
                      setSlot("");
                    }}
                    className="grid h-11 place-items-center border-r border-border hover:bg-secondary disabled:opacity-35"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <input
                    aria-label="Nombre total de personnes"
                    type="number"
                    min={1}
                    max={15}
                    value={people}
                    onChange={(event) => {
                      const value = Math.min(15, Math.max(1, Number(event.target.value) || 1));
                      setPeople(value);
                      setDate("");
                      setSlot("");
                    }}
                    className="h-11 w-full bg-transparent text-center text-lg font-medium outline-none"
                  />
                  <button
                    type="button"
                    aria-label="Ajouter une personne"
                    disabled={people >= 15}
                    onClick={() => {
                      setPeople((current) => Math.min(15, current + 1));
                      setDate("");
                      setSlot("");
                    }}
                    className="grid h-11 place-items-center border-l border-border hover:bg-secondary disabled:opacity-35"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Jusqu'à 15 personnes par réservation. À partir de 8 personnes, l'équipe valide la
                  demande.
                </p>
              </div>

              {requiresManualReview && (
                <div className="mt-4 rounded-xl bg-rose/20 p-3 text-sm">
                  Cette demande passera en validation équipe avant confirmation définitive.
                </div>
              )}
            </Step>
          )}

          {step === 2 && (
            <Step title="Choisis un créneau">
              <WeekPlanner
                people={people}
                reservations={reservations}
                occupancies={occupancies}
                settings={settings}
                selectedDate={date}
                selectedSlot={slot}
                onSelect={chooseSlot}
              />
              {errors.slot && <p className="mt-3 text-sm text-destructive">{errors.slot}</p>}
            </Step>
          )}

          {step === 3 && (
            <Step title="Tes coordonnées">
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
                  <Field
                    label="Présence d'enfants et âges"
                    value={form.childrenAges}
                    onChange={(v) => setForm({ ...form, childrenAges: v })}
                    error={errors.childrenAges}
                    placeholder="Ex. 2 enfants de 6 et 9 ans"
                    hint="Facultatif"
                  />
                </div>
                <div className="sm:col-span-2">
                  <div className="mb-1.5 flex items-center justify-between gap-3">
                    <label className="block text-sm font-medium">
                      Message ou demande particulière
                    </label>
                    <span className="text-xs text-muted-foreground">Facultatif</span>
                  </div>
                  <textarea
                    value={form.message}
                    onChange={(event) => setForm({ ...form, message: event.target.value })}
                    rows={3}
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                    placeholder="Allergies, besoin particulier, précision sur le groupe…"
                  />
                  {errors.message && (
                    <span className="mt-1 block text-xs text-destructive">{errors.message}</span>
                  )}
                </div>
              </div>

              {depositRequired && (
                <div className="mt-6 rounded-2xl border border-dashed border-primary/40 bg-primary/10 p-4">
                  <div className="flex items-start gap-3">
                    <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                    <div className="text-sm">
                      <div className="font-medium">Acompte nécessaire : {deposit} €</div>
                      <p className="mt-1 text-muted-foreground">
                        Il sera demandé après validation de ta demande par l'équipe.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-4 rounded-2xl border border-border bg-background p-4 text-sm">
                <div className="font-medium">Conditions pratiques</div>
                <p className="mt-1 text-muted-foreground">
                  {depositRequired
                    ? `Annulation possible jusqu'à ${settings.groupDepositForfeitHours} h avant pour obtenir le remboursement de l'acompte. Passé ce délai, l'acompte est conservé.`
                    : `Annulation possible jusqu'à ${settings.cancellationNoticeHours} h avant. Au-delà, merci d'appeler le Kafé.`}
                </p>
                <p className="mt-2 text-muted-foreground">
                  La cuisine ferme à {formatPublicTime(settings.kitchenClosingTime)}.
                </p>
                <p className="mt-2 text-muted-foreground">
                  Ta demande sort du cadre habituel ?{" "}
                  <Link
                    to="/contact"
                    className="font-medium text-primary underline underline-offset-2"
                  >
                    Contacte directement l'équipe.
                  </Link>
                </p>
              </div>

              <div className="mt-4 border-l-4 border-primary bg-secondary/45 px-4 py-4 text-sm">
                <div className="font-medium">À savoir avant de confirmer</div>
                <ul className="mt-2 grid gap-1.5 text-muted-foreground sm:grid-cols-2">
                  <li>• Consommation sur place obligatoire pour peindre</li>
                  <li>• Cuisson et finition réalisées après ton départ</li>
                  <li>• Création prête habituellement sous 7 à 10 jours</li>
                  <li>• Photo et initiales indispensables pour la récupérer</li>
                  <li>• Pièces conservées au maximum deux mois</li>
                  <li>• Enfants sous la surveillance de leur accompagnateur</li>
                </ul>
                <Link
                  to="/guide"
                  target="_blank"
                  className="mt-3 inline-flex font-medium text-primary underline underline-offset-4"
                >
                  Consulter le guide complet
                </Link>
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

          {submitError && (
            <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {submitError}
            </div>
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
                {deposit > 0 && <Row k="Acompte" v={`${deposit} €`} />}
                <Row k="Référence" v={done} />
              </div>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Link to="/" className="rounded-full border border-border px-4 py-2 text-sm">
                  Accueil
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
                <button
                  onClick={submit}
                  disabled={submitting}
                  className="inline-flex items-center gap-1 rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground"
                >
                  <CalendarCheck2 className="h-4 w-4" />
                  {submitting ? "Enregistrement…" : "Envoyer la demande groupe"}
                </button>
              ) : (
                <button
                  onClick={submit}
                  disabled={submitting}
                  className="inline-flex items-center gap-1 rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground"
                >
                  <CalendarCheck2 className="h-4 w-4" />
                  {submitting ? "Enregistrement…" : "Confirmer la réservation"}
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
  hint,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  error?: string;
  hint?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 flex items-center justify-between gap-3 text-sm font-medium">
        <span>{label}</span>
        {hint && <span className="text-xs font-normal text-muted-foreground">{hint}</span>}
      </label>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
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
  occupancies,
  settings,
  selectedDate,
  selectedSlot,
  onSelect,
}: {
  people: number;
  reservations: Reservation[];
  occupancies: SlotOccupancy[];
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
            const slots = getSlotsForDate(iso, settings);
            const closed = slots.length === 0;
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
                    {slots.map((slotOption) => {
                      const state = getSlotAvailability(
                        day,
                        slotOption,
                        people,
                        reservations,
                        occupancies,
                        settings,
                      );
                      const selected = selectedDate === iso && selectedSlot === slotOption;
                      return (
                        <button
                          key={slotOption}
                          disabled={state.disabled}
                          onClick={() => onSelect(iso, slotOption)}
                          className={`border text-left transition ${
                            selected
                              ? "min-h-14 rounded-xl border-primary bg-primary px-2 py-2 text-primary-foreground"
                              : state.disabled
                                ? "h-8 rounded-md border-dashed border-border/70 bg-muted/45 px-2 text-muted-foreground"
                                : "min-h-14 rounded-xl border-border bg-card px-2 py-2 hover:border-primary/45 hover:bg-secondary/60"
                          }`}
                        >
                          {state.disabled ? (
                            <span className="flex items-center justify-between gap-1">
                              <span className="text-xs font-medium line-through">{slotOption}</span>
                              <span className="truncate text-[10px]">{state.label}</span>
                            </span>
                          ) : (
                            <>
                              <span className="block text-sm font-medium">{slotOption}</span>
                              <span
                                className={`block text-[11px] ${selected ? "text-primary-foreground/75" : "text-muted-foreground"}`}
                              >
                                {state.label}
                              </span>
                            </>
                          )}
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
        Durée indicative d'un créneau : {formatDuration(settings.slotDurationMinutes)}. Les créneaux
        complets ne peuvent pas être réservés.
      </p>
    </div>
  );
}

function getSlotAvailability(
  day: Date,
  slot: string,
  people: number,
  reservations: Reservation[],
  occupancies: SlotOccupancy[],
  settings: KafeSettings,
) {
  const today = startOfDay(new Date());
  const current = startOfDay(day);
  if (current < today) return { disabled: true, label: "passé" };

  const date = toISODate(day);
  if (new Date(`${date}T${slot}:00`).getTime() <= Date.now()) {
    return { disabled: true, label: "passé" };
  }

  const placement = getSlotPlacement(reservations, occupancies, date, slot, people, settings);
  if (!placement.unitId && placement.totalRemaining <= 0) {
    return { disabled: true, label: "complet" };
  }
  if (!placement.unitId) {
    return { disabled: true, label: "places restantes séparées" };
  }
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
        {deposit > 0 && (
          <div className="text-right">
            <div className="text-xs text-muted-foreground">Acompte</div>
            <div className="font-display text-xl">{deposit} €</div>
          </div>
        )}
      </div>
    </div>
  );
}
