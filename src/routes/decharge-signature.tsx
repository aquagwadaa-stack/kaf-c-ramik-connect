import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardSignature,
  Coffee,
  Download,
  Heart,
  Paintbrush,
  ShieldCheck,
  Sparkles,
  UserRoundCheck,
} from "lucide-react";
import { SignaturePad } from "@/components/signature-pad";
import {
  getWaiverDocument,
  useContentDocuments,
  useWaiverSignatures,
  type WaiverSignature,
} from "@/lib/admin-data";
import {
  formatReservationDate,
  updateStatus,
  useReservations,
  type Reservation,
} from "@/lib/reservations";
import { useAdminAccess } from "@/lib/supabase-rest";
import { downloadSignedWaiver } from "@/lib/waiver-pdf";

export const Route = createFileRoute("/decharge-signature")({
  head: () => ({
    meta: [
      { title: "Signer la décharge - Kafé Céramik" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: WaiverSigningPage,
});

const emptyForm = {
  firstName: "",
  lastName: "",
  isMinor: false,
  guardianFirstName: "",
  guardianLastName: "",
};

function WaiverSigningPage() {
  const admin = useAdminAccess();

  if (admin.configured && !admin.signedIn) {
    return <AccessMessage text="Connectez-vous à l'espace équipe avant d'ouvrir la signature." />;
  }
  if (admin.configured && admin.checking) {
    return <AccessMessage text="Vérification de l'accès équipe…" />;
  }
  if (admin.configured && !admin.allowed) {
    return <AccessMessage text="Ce compte n'est pas autorisé à faire signer des décharges." />;
  }

  return (
    <SigningWorkspace
      validatedBy={admin.profile?.email ?? admin.session?.user?.email ?? undefined}
    />
  );
}

function AccessMessage({ text }: { text: string }) {
  return (
    <main className="grid min-h-screen place-items-center bg-background px-4">
      <div className="max-w-md border border-border bg-card p-7 text-center">
        <ShieldCheck className="mx-auto h-9 w-9 text-primary" />
        <h1 className="mt-4 font-display text-2xl">Accès équipe requis</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p>
        <Link
          to="/admin"
          className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
        >
          Ouvrir l'administration
        </Link>
      </div>
    </main>
  );
}

function SigningWorkspace({ validatedBy }: { validatedBy?: string }) {
  const reservations = useReservations();
  const [documents] = useContentDocuments();
  const [signatures, saveSignatures] = useWaiverSignatures();
  const waiver = getWaiverDocument(documents);
  const [reservationRef, setReservationRef] = useState("");
  const [prepared, setPrepared] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [accepted, setAccepted] = useState(false);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | undefined>();
  const [error, setError] = useState("");
  const [savedSignature, setSavedSignature] = useState<WaiverSignature | null>(null);

  const availableReservations = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return reservations
      .filter((reservation) => reservation.status !== "cancelled" && reservation.date >= today)
      .sort((a, b) => `${a.date}-${a.slot}`.localeCompare(`${b.date}-${b.slot}`));
  }, [reservations]);
  const selectedReservation = reservations.find((reservation) => reservation.id === reservationRef);
  const signedCount = reservationRef
    ? signatures.filter((signature) => signature.reservationRef === reservationRef).length
    : 0;
  const preview = waiver.previewImageDataUrls?.[0] || waiver.previewImageUrls?.[0];

  function prepare() {
    setPrepared(true);
    setSavedSignature(null);
    setError("");
  }

  function saveSignature() {
    if (!form.lastName.trim() || !form.firstName.trim() || !accepted || !signatureDataUrl) {
      setError("Nom, prénom, lecture de la décharge et signature sont obligatoires.");
      return;
    }
    if (form.isMinor && (!form.guardianFirstName.trim() || !form.guardianLastName.trim())) {
      setError("Le responsable légal doit renseigner son nom et son prénom.");
      return;
    }

    const next: WaiverSignature = {
      id: `sig-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      reservationRef: reservationRef || undefined,
      documentVersion: waiver.version,
      signedAt: new Date().toISOString(),
      signatureDataUrl,
      guideAccepted: true,
      waiverAccepted: true,
      isMinor: form.isMinor,
      guardianFirstName: form.isMinor ? form.guardianFirstName.trim() : undefined,
      guardianLastName: form.isMinor ? form.guardianLastName.trim() : undefined,
      documentTitle: waiver.title,
      documentUrl: waiver.attachmentUrl || waiver.attachmentDataUrl,
      documentPreviewUrl: preview,
      acceptanceText: waiver.body,
      validatedBy,
    };

    saveSignatures([next, ...signatures]);
    if (reservationRef) updateStatus(reservationRef, "arrived");
    setSavedSignature(next);
    setError("");
  }

  function nextPerson() {
    setForm(emptyForm);
    setAccepted(false);
    setSignatureDataUrl(undefined);
    setSavedSignature(null);
    setError("");
  }

  if (!prepared) {
    return (
      <main className="min-h-screen bg-background text-foreground">
        <SigningHeader />
        <section className="mx-auto max-w-3xl px-4 py-10 sm:py-16">
          <div className="rounded-[2rem] border border-border bg-card p-5 sm:p-8">
            <div className="flex items-start gap-4">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-secondary text-primary">
                <UserRoundCheck className="h-6 w-6" />
              </span>
              <div>
                <div className="text-sm font-medium text-primary">Préparation équipe</div>
                <h1 className="mt-1 font-display text-3xl">À qui faire signer ?</h1>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Liez la signature à une réservation pour suivre les arrivées. Pour une personne
                  venue sans réservation, continuez simplement sans liaison.
                </p>
              </div>
            </div>

            <label className="mt-7 block">
              <span className="mb-2 block text-sm font-medium">Réservation liée</span>
              <select
                value={reservationRef}
                onChange={(event) => setReservationRef(event.target.value)}
                className="h-12 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Personne sans réservation</option>
                {availableReservations.map((reservation) => (
                  <ReservationOption key={reservation.id} reservation={reservation} />
                ))}
              </select>
            </label>

            {selectedReservation && (
              <div className="mt-4 rounded-2xl border border-primary/20 bg-secondary/45 p-4 text-sm">
                <div className="font-medium">
                  {selectedReservation.firstName} {selectedReservation.lastName} ·{" "}
                  {selectedReservation.people} personne{selectedReservation.people > 1 ? "s" : ""}
                </div>
                <div className="mt-1 text-muted-foreground">
                  {signedCount}/{selectedReservation.people} signature
                  {selectedReservation.people > 1 ? "s" : ""} déjà enregistrée
                  {signedCount > 1 ? "s" : ""}.
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={prepare}
              className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 font-medium text-primary-foreground sm:w-auto"
            >
              <ClipboardSignature className="h-5 w-5" /> Passer à la signature
            </button>
          </div>
        </section>
      </main>
    );
  }

  if (savedSignature) {
    return (
      <main className="grid min-h-screen place-items-center bg-secondary/45 px-4 py-10 text-foreground">
        <div className="w-full max-w-xl rounded-[2rem] border border-border bg-card p-6 text-center sm:p-9">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-primary text-primary-foreground">
            <CheckCircle2 className="h-8 w-8" />
          </span>
          <h1 className="mt-5 font-display text-3xl">Décharge enregistrée</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Merci {savedSignature.firstName}. Le document signé est maintenant archivé dans l'espace
            équipe.
          </p>
          <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
            <button
              type="button"
              onClick={nextPerson}
              className="rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
            >
              Faire signer la personne suivante
            </button>
            <button
              type="button"
              onClick={() => downloadSignedWaiver(savedSignature, waiver.body)}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-background px-5 py-2.5 text-sm font-medium"
            >
              <Download className="h-4 w-4" /> Vérifier le PDF
            </button>
          </div>
          <button
            type="button"
            onClick={() => {
              nextPerson();
              setPrepared(false);
              setReservationRef("");
            }}
            className="mt-5 text-sm text-muted-foreground underline underline-offset-4"
          >
            Terminer et revenir à la préparation
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-secondary/35 text-foreground">
      <SigningHeader
        action={
          <button
            type="button"
            onClick={() => setPrepared(false)}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Modifier la liaison
          </button>
        }
      />
      <section className="mx-auto max-w-5xl px-4 py-6 lg:py-10">
        {selectedReservation && (
          <div className="mb-4 rounded-2xl border border-primary/20 bg-background px-4 py-3 text-sm">
            Réservation de {selectedReservation.firstName} {selectedReservation.lastName} ·{" "}
            {formatReservationDate(selectedReservation.date)} à {selectedReservation.slot}
          </div>
        )}

        <div className="relative overflow-hidden rounded-[2rem] border border-[#e90061]/25 bg-[#fff4f5] shadow-[0_24px_60px_rgba(97,49,39,0.12)]">
          <Sparkles className="absolute left-5 top-6 h-7 w-7 text-[#f0ad19]" />
          <Heart className="absolute right-6 top-8 h-8 w-8 text-[#e90061]" />

          <header className="px-5 pb-7 pt-12 text-center sm:px-10 sm:pb-9 sm:pt-14">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#cfe6a5] px-4 py-2 text-xs font-bold sm:text-sm">
              <Coffee className="h-4 w-4 text-[#e90061]" /> Une petite consommation accompagne
              l’atelier
            </div>
            <h1 className="mt-6 font-display text-4xl leading-none text-[#e90061] sm:text-6xl">
              Décharge officielle
            </h1>
            <div className="mt-5 flex items-center justify-center gap-3 text-center text-lg font-bold uppercase leading-7 text-[#d10b50] sm:text-2xl">
              <Paintbrush className="hidden h-8 w-8 shrink-0 sm:block" /> À lire et à remplir avant
              chaque début d’atelier
            </div>
          </header>

          <div className="mx-4 rounded-[1.75rem] border-2 border-dashed border-white bg-[#cfe6a5] px-5 py-7 text-center sm:mx-10 sm:px-10 sm:py-9">
            <ShieldCheck className="mx-auto h-9 w-9 text-[#315d39]" />
            <p className="mx-auto mt-4 max-w-3xl text-base font-medium leading-7 sm:text-xl sm:leading-9">
              {waiver.body}
            </p>
            <label className="mx-auto mt-6 flex max-w-xl cursor-pointer items-start justify-center gap-3 text-left text-sm font-semibold leading-6">
              <input
                type="checkbox"
                checked={accepted}
                onChange={(event) => setAccepted(event.target.checked)}
                className="mt-0.5 h-5 w-5 shrink-0 accent-[#e90061]"
              />
              <span>Je confirme avoir lu et compris cette décharge.</span>
            </label>
          </div>

          <div className="px-4 py-6 sm:px-10 sm:py-9">
            <div className="grid gap-4 sm:grid-cols-2">
              <DigitalField
                label="Nom"
                value={form.lastName}
                onChange={(lastName) => setForm({ ...form, lastName })}
                tone="rose"
              />
              <DigitalField
                label="Prénom"
                value={form.firstName}
                onChange={(firstName) => setForm({ ...form, firstName })}
                tone="purple"
              />
              <div className="rounded-2xl border-2 border-dashed border-[#22a9d6] bg-white p-4">
                <div className="inline-flex bg-[#22a9d6] px-4 py-1.5 text-xs font-bold uppercase text-white">
                  Date
                </div>
                <div className="mt-5 border-b-2 border-[#22a9d6]/40 pb-2 text-lg font-medium">
                  {new Date().toLocaleDateString("fr-FR")}
                </div>
              </div>
              <div className="rounded-2xl border-2 border-dashed border-[#f2a429] bg-white p-4">
                <SignaturePad
                  value={signatureDataUrl}
                  onChange={setSignatureDataUrl}
                  label="Signature"
                />
              </div>
            </div>

            <label className="mt-5 flex cursor-pointer items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={form.isMinor}
                onChange={(event) => setForm({ ...form, isMinor: event.target.checked })}
                className="h-5 w-5 accent-[#e90061]"
              />
              La personne qui peint est mineure
            </label>

            {form.isMinor && (
              <div className="mt-4 grid gap-3 rounded-2xl border border-[#315d39]/20 bg-[#cfe6a5]/45 p-4 sm:grid-cols-2">
                <DigitalField
                  label="Prénom du responsable légal"
                  value={form.guardianFirstName}
                  onChange={(guardianFirstName) => setForm({ ...form, guardianFirstName })}
                />
                <DigitalField
                  label="Nom du responsable légal"
                  value={form.guardianLastName}
                  onChange={(guardianLastName) => setForm({ ...form, guardianLastName })}
                />
              </div>
            )}

            {error && <div className="mt-4 text-sm font-medium text-destructive">{error}</div>}
            <button
              type="button"
              onClick={saveSignature}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#e90061] px-6 py-3.5 font-medium text-white shadow-sm"
            >
              <ClipboardSignature className="h-5 w-5" /> Signer et enregistrer la décharge
            </button>
          </div>

          <div className="h-5 bg-[repeating-linear-gradient(135deg,#f4b6cd_0,#f4b6cd_18px,#fff4f5_18px,#fff4f5_36px)]" />
        </div>
      </section>
    </main>
  );
}

function ReservationOption({ reservation }: { reservation: Reservation }) {
  return (
    <option value={reservation.id}>
      {reservation.firstName} {reservation.lastName} · {formatReservationDate(reservation.date)} ·{" "}
      {reservation.slot} · {reservation.people} pers.
    </option>
  );
}

function SigningHeader({ action }: { action?: React.ReactNode }) {
  return (
    <header className="border-b border-border bg-background">
      <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-4 px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-primary text-primary-foreground">
            <ClipboardSignature className="h-4 w-4" />
          </span>
          <div>
            <div className="font-display text-lg">Kafé Céramik</div>
            <div className="text-xs text-muted-foreground">Signature sur tablette</div>
          </div>
        </div>
        {action ?? (
          <Link to="/admin" className="text-sm text-muted-foreground hover:text-foreground">
            Retour administration
          </Link>
        )}
      </div>
    </header>
  );
}

function DigitalField({
  label,
  value,
  onChange,
  tone,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  tone?: "rose" | "purple";
}) {
  const border =
    tone === "purple"
      ? "border-[#8d59b6]"
      : tone === "rose"
        ? "border-[#e90061]"
        : "border-primary/35";
  const labelTone =
    tone === "purple" ? "bg-[#8d59b6]" : tone === "rose" ? "bg-[#e90061]" : "bg-primary";
  return (
    <label className={`rounded-2xl border-2 border-dashed bg-white p-4 ${border}`}>
      <span
        className={`inline-flex px-4 py-1.5 text-xs font-bold uppercase text-white ${labelTone}`}
      >
        {label}
      </span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete="off"
        className="mt-4 h-11 w-full border-b-2 border-foreground/25 bg-transparent px-1 text-lg outline-none focus:border-primary"
      />
    </label>
  );
}
