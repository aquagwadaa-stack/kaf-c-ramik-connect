import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardSignature,
  Download,
  ShieldCheck,
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
          <div className="border border-border bg-card p-5 sm:p-8">
            <div className="flex items-start gap-4">
              <span className="grid h-12 w-12 shrink-0 place-items-center bg-secondary text-primary">
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
                className="h-12 w-full border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Personne sans réservation</option>
                {availableReservations.map((reservation) => (
                  <ReservationOption key={reservation.id} reservation={reservation} />
                ))}
              </select>
            </label>

            {selectedReservation && (
              <div className="mt-4 border-l-4 border-primary bg-secondary/45 p-4 text-sm">
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
        <div className="w-full max-w-xl border border-border bg-card p-6 text-center sm:p-9">
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
      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[0.85fr_1.15fr] lg:items-start lg:py-9">
        <div className="border border-border bg-white p-3 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-3 px-1">
            <div>
              <div className="text-xs font-medium uppercase text-primary">Document officiel</div>
              <div className="mt-0.5 text-sm text-muted-foreground">Version {waiver.version}</div>
            </div>
            {(waiver.attachmentDataUrl || waiver.attachmentUrl) && (
              <a
                href={waiver.attachmentDataUrl || waiver.attachmentUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-medium text-primary underline underline-offset-4"
              >
                Agrandir
              </a>
            )}
          </div>
          {preview ? (
            <img src={preview} alt={waiver.title} className="h-auto w-full border border-border" />
          ) : (
            <div className="p-6 text-sm leading-7">{waiver.body}</div>
          )}
        </div>

        <div className="border border-border bg-card p-5 sm:p-7">
          <div className="flex items-start justify-between gap-4 border-b border-border pb-5">
            <div>
              <div className="text-sm font-medium text-primary">
                À remplir par la personne qui peint
              </div>
              <h1 className="mt-1 font-display text-3xl">Décharge de responsabilité</h1>
            </div>
            <ShieldCheck className="h-7 w-7 shrink-0 text-primary" />
          </div>

          {selectedReservation && (
            <div className="mt-5 bg-secondary/45 px-4 py-3 text-sm">
              Réservation de {selectedReservation.firstName} {selectedReservation.lastName} ·{" "}
              {formatReservationDate(selectedReservation.date)} à {selectedReservation.slot}
            </div>
          )}

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
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
              tone="green"
            />
            <div className="border border-border bg-[#e8e5a9] p-3">
              <div className="text-xs font-semibold uppercase">Date</div>
              <div className="mt-3 text-base font-medium">
                {new Date().toLocaleDateString("fr-FR")}
              </div>
            </div>
          </div>

          <label className="mt-4 flex cursor-pointer items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={form.isMinor}
              onChange={(event) => setForm({ ...form, isMinor: event.target.checked })}
              className="h-5 w-5 accent-primary"
            />
            La personne qui peint est mineure
          </label>

          {form.isMinor && (
            <div className="mt-4 grid gap-3 border-l-4 border-primary bg-secondary/40 p-4 sm:grid-cols-2">
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

          <label className="mt-5 flex cursor-pointer items-start gap-3 border border-primary/25 bg-secondary/40 p-4 text-sm leading-6">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(event) => setAccepted(event.target.checked)}
              className="mt-1 h-5 w-5 shrink-0 accent-primary"
            />
            <span>{waiver.body}</span>
          </label>

          <div className="mt-5 border border-border bg-[#d9cbec] p-4">
            <SignaturePad value={signatureDataUrl} onChange={setSignatureDataUrl} />
          </div>

          {error && <div className="mt-4 text-sm font-medium text-destructive">{error}</div>}
          <button
            type="button"
            onClick={saveSignature}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 font-medium text-primary-foreground"
          >
            <ClipboardSignature className="h-5 w-5" /> Signer et enregistrer la décharge
          </button>
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
  tone?: "rose" | "green";
}) {
  const background =
    tone === "green" ? "bg-[#cfdfb7]" : tone === "rose" ? "bg-[#efc8d9]" : "bg-background";
  return (
    <label className={`border border-border p-3 ${background}`}>
      <span className="text-xs font-semibold uppercase">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete="off"
        className="mt-2 h-10 w-full border-b-2 border-foreground/35 bg-transparent px-1 text-base outline-none focus:border-primary"
      />
    </label>
  );
}
