import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import type { PointerEvent, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  AlertCircle,
  BookOpenText,
  CalendarDays,
  CheckCircle2,
  ClipboardSignature,
  Clock,
  Coins,
  Download,
  FileText,
  Image as ImageIcon,
  PackageOpen,
  Plus,
  Save,
  Settings,
  ShieldCheck,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import { PageShell, PageHeader } from "@/components/page-shell";
import {
  useReservations,
  experienceLabel,
  statusLabel,
  updateStatus,
  type Reservation,
  type ReservationStatus,
} from "@/lib/reservations";
import {
  useCeramicObjects,
  useContentDocuments,
  useKafeSettings,
  useWaiverSignatures,
  type CeramicObject,
  type ContentDocument,
  type KafeSettings,
  type WaiverSignature,
} from "@/lib/admin-data";
import { formatDate } from "./reserver";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Espace équipe — Kafé Céramik" },
      {
        name: "description",
        content: "Tableau de bord interne des réservations, décharges et contenus.",
      },
    ],
  }),
  component: AdminPage,
});

type AdminTab = "reservations" | "waivers" | "objects" | "documents" | "settings";

const tabs: { id: AdminTab; label: string; icon: LucideIcon }[] = [
  { id: "reservations", label: "Réservations", icon: CalendarDays },
  { id: "waivers", label: "Décharges", icon: ClipboardSignature },
  { id: "objects", label: "Objets", icon: PackageOpen },
  { id: "documents", label: "Guide", icon: BookOpenText },
  { id: "settings", label: "Réglages", icon: Settings },
];

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function AdminPage() {
  const reservations = useReservations();
  const [objects, saveObjects] = useCeramicObjects();
  const [documents, saveDocuments] = useContentDocuments();
  const [signatures, saveSignatures] = useWaiverSignatures();
  const [settings, saveSettings] = useKafeSettings();
  const [tab, setTab] = useState<AdminTab>("reservations");

  const today = new Date().toISOString().slice(0, 10);
  const stats = useMemo(() => {
    const todayReservations = reservations.filter((r) => r.date === today);
    const upcoming = reservations.filter((r) => r.date >= today && r.status !== "cancelled");
    const pendingDeposit = reservations.filter(
      (r) => r.depositRequired && !r.depositPaid && r.status !== "cancelled",
    );
    const signedToday = signatures.filter((s) => s.signedAt.slice(0, 10) === today);
    return {
      todayReservations: todayReservations.length,
      upcoming: upcoming.length,
      pendingDeposit: pendingDeposit.length,
      signedToday: signedToday.length,
    };
  }, [reservations, signatures, today]);

  return (
    <PageShell>
      <PageHeader
        eyebrow="Espace équipe"
        title="Tableau de bord"
        description="Pilotez les réservations, les décharges, les objets disponibles et les textes importants depuis un seul endroit."
      />

      <section className="mx-auto max-w-6xl px-4 py-10 space-y-6">
        <div className="rounded-2xl border border-border bg-cream/75 p-4 text-sm text-muted-foreground">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <p>
              Version de travail : les données sont simulées côté navigateur pour valider les
              parcours. Avant mise en production, cet espace devra être protégé par connexion
              administrateur et branché à la base de données.
            </p>
          </div>
        </div>

        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          <Stat
            icon={CalendarDays}
            label="Aujourd'hui"
            value={`${stats.todayReservations}`}
            sub="réservations"
          />
          <Stat icon={Clock} label="À venir" value={`${stats.upcoming}`} sub="créneaux actifs" />
          <Stat
            icon={Coins}
            label="Acomptes"
            value={`${stats.pendingDeposit}`}
            sub="groupes à suivre"
          />
          <Stat
            icon={ClipboardSignature}
            label="Décharges"
            value={`${stats.signedToday}`}
            sub="signées aujourd'hui"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm ${
                tab === id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card hover:bg-secondary"
              }`}
            >
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
        </div>

        {tab === "reservations" && (
          <ReservationsPanel reservations={reservations} signatures={signatures} />
        )}
        {tab === "waivers" && (
          <WaiversPanel
            documents={documents}
            signatures={signatures}
            saveSignatures={saveSignatures}
            reservations={reservations}
          />
        )}
        {tab === "objects" && <ObjectsPanel objects={objects} saveObjects={saveObjects} />}
        {tab === "documents" && (
          <DocumentsPanel documents={documents} saveDocuments={saveDocuments} />
        )}
        {tab === "settings" && <SettingsPanel settings={settings} saveSettings={saveSettings} />}
      </section>
    </PageShell>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  sub: string;
}) {
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

function ReservationsPanel({
  reservations,
  signatures,
}: {
  reservations: Reservation[];
  signatures: WaiverSignature[];
}) {
  const [filter, setFilter] = useState<"today" | "upcoming" | "groups" | "all">("today");
  const today = new Date().toISOString().slice(0, 10);

  const filtered = useMemo(() => {
    if (filter === "today") return reservations.filter((r) => r.date === today);
    if (filter === "upcoming") return reservations.filter((r) => r.date >= today);
    if (filter === "groups") return reservations.filter((r) => r.isGroupRequest || r.people >= 8);
    return reservations;
  }, [filter, reservations, today]);

  return (
    <Panel title="Réservations" desc="Vue rapide du jour, des groupes et des acomptes à suivre.">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {(["today", "upcoming", "groups", "all"] as const).map((item) => (
            <button
              key={item}
              onClick={() => setFilter(item)}
              className={`rounded-full border px-4 py-1.5 text-sm ${
                filter === item
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border hover:bg-secondary"
              }`}
            >
              {item === "today" && "Aujourd'hui"}
              {item === "upcoming" && "À venir"}
              {item === "groups" && "Groupes"}
              {item === "all" && "Tout"}
            </button>
          ))}
        </div>
        <button className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm hover:bg-secondary">
          <Download className="h-4 w-4" /> Export CSV
        </button>
      </div>

      <div className="mt-5 grid gap-3">
        {filtered.length === 0 ? (
          <EmptyState text="Aucune réservation pour ce filtre." />
        ) : (
          filtered.map((reservation) => {
            const signed = signatures.some(
              (signature) =>
                signature.reservationRef === reservation.id ||
                `${signature.firstName} ${signature.lastName}`.toLowerCase() ===
                  `${reservation.firstName} ${reservation.lastName}`.toLowerCase(),
            );
            return (
              <ReservationCard key={reservation.id} reservation={reservation} signed={signed} />
            );
          })
        )}
      </div>
    </Panel>
  );
}

function ReservationCard({ reservation, signed }: { reservation: Reservation; signed: boolean }) {
  return (
    <div className="rounded-2xl border border-border bg-background p-4">
      <div className="grid gap-3 sm:grid-cols-[1fr_1.4fr_auto] sm:items-center">
        <div className="min-w-0">
          <div className="font-display text-lg">
            {reservation.firstName} {reservation.lastName}
          </div>
          <div className="text-xs text-muted-foreground">
            {reservation.phone} · {reservation.email}
          </div>
        </div>
        <div className="min-w-0 text-sm">
          <div>
            {experienceLabel(reservation.experience)} · {reservation.people} pers
          </div>
          <div className="text-xs text-muted-foreground">
            {formatDate(reservation.date)}
            {reservation.slot !== "—" && ` · ${reservation.slot}`}
            {reservation.eventType && ` · ${reservation.eventType}`}
          </div>
        </div>
        <StatusBadge status={reservation.status} />
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {reservation.depositRequired ? (
          <InfoPill tone={reservation.depositPaid ? "success" : "warning"}>
            {reservation.depositPaid
              ? "Acompte reçu"
              : `Acompte à suivre · ${reservation.depositAmount ?? reservation.people * 10} €`}
          </InfoPill>
        ) : (
          <InfoPill>Pas d'acompte requis</InfoPill>
        )}
        <InfoPill tone={signed ? "success" : "warning"}>
          {signed ? "Décharge signée" : "Décharge à signer sur tablette"}
        </InfoPill>
      </div>

      {reservation.message && (
        <div className="mt-3 flex items-start gap-2 rounded-xl bg-secondary/40 p-3 text-sm">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <p className="text-foreground/80">{reservation.message}</p>
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <StatusButton
          id={reservation.id}
          target="confirmed"
          current={reservation.status}
          label="Confirmer"
        />
        <StatusButton
          id={reservation.id}
          target="deposit_paid"
          current={reservation.status}
          label="Acompte reçu"
        />
        <StatusButton
          id={reservation.id}
          target="pending"
          current={reservation.status}
          label="En attente"
        />
        <StatusButton
          id={reservation.id}
          target="cancelled"
          current={reservation.status}
          label="Annuler"
          danger
        />
      </div>
    </div>
  );
}

function WaiversPanel({
  documents,
  signatures,
  saveSignatures,
  reservations,
}: {
  documents: ContentDocument[];
  signatures: WaiverSignature[];
  saveSignatures: (next: WaiverSignature[]) => void;
  reservations: Reservation[];
}) {
  const waiver = documents.find((document) => document.id === "waiver");
  const [form, setForm] = useState({ firstName: "", lastName: "", reservationRef: "" });
  const [guideAccepted, setGuideAccepted] = useState(true);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | undefined>();
  const [error, setError] = useState("");

  function saveSignature() {
    if (!form.firstName || !form.lastName || !guideAccepted) {
      setError("Nom, prénom et confirmation du guide sont obligatoires.");
      return;
    }
    const next: WaiverSignature = {
      id: `sig-${Date.now()}`,
      firstName: form.firstName,
      lastName: form.lastName,
      reservationRef: form.reservationRef || undefined,
      documentVersion: waiver?.version ?? "v1-demo",
      signedAt: new Date().toISOString(),
      signatureDataUrl,
      guideAccepted,
    };
    saveSignatures([next, ...signatures]);
    setForm({ firstName: "", lastName: "", reservationRef: "" });
    setSignatureDataUrl(undefined);
    setGuideAccepted(true);
    setError("");
  }

  return (
    <Panel
      title="Décharge sur tablette"
      desc="Enregistrement du nom, de la date, de la version du document et de la signature."
    >
      <div className="grid gap-5 lg:grid-cols-[1fr_1.1fr]">
        <div className="rounded-2xl border border-border bg-background p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              label="Prénom"
              value={form.firstName}
              onChange={(value) => setForm({ ...form, firstName: value })}
            />
            <Field
              label="Nom"
              value={form.lastName}
              onChange={(value) => setForm({ ...form, lastName: value })}
            />
            <label className="sm:col-span-2">
              <span className="mb-1.5 block text-sm font-medium">Réservation liée</span>
              <select
                value={form.reservationRef}
                onChange={(event) => setForm({ ...form, reservationRef: event.target.value })}
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Sans réservation liée</option>
                {reservations.map((reservation) => (
                  <option key={reservation.id} value={reservation.id}>
                    {reservation.firstName} {reservation.lastName} · {formatDate(reservation.date)}{" "}
                    · {reservation.slot}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <DocumentPreview document={waiver} title="Document officiel à signer" className="mt-4" />

          <label className="mt-4 flex cursor-pointer items-start gap-3 text-sm">
            <input
              type="checkbox"
              checked={guideAccepted}
              onChange={(event) => setGuideAccepted(event.target.checked)}
              className="mt-1 h-4 w-4 accent-primary"
            />
            <span>La personne confirme avoir lu le guide et la décharge avant signature.</span>
          </label>

          <SignaturePad onChange={setSignatureDataUrl} value={signatureDataUrl} />

          {error && <div className="mt-3 text-sm text-destructive">{error}</div>}
          <button
            onClick={saveSignature}
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground"
          >
            <Save className="h-4 w-4" /> Enregistrer la signature
          </button>
        </div>

        <div className="rounded-2xl border border-border bg-background p-4">
          <h3 className="font-display text-xl">Signatures enregistrées</h3>
          <div className="mt-4 grid gap-2">
            {signatures.length === 0 ? (
              <EmptyState text="Aucune signature enregistrée." />
            ) : (
              signatures.map((signature) => (
                <div key={signature.id} className="rounded-xl border border-border p-3 text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-medium">
                        {signature.firstName} {signature.lastName}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(signature.signedAt).toLocaleString("fr-FR")} ·{" "}
                        {signature.documentVersion}
                      </div>
                    </div>
                    <InfoPill tone="success">Signé</InfoPill>
                  </div>
                  {signature.signatureDataUrl && (
                    <img
                      src={signature.signatureDataUrl}
                      alt="Signature"
                      className="mt-3 h-16 rounded-lg border border-border bg-white object-contain"
                    />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </Panel>
  );
}

function SignaturePad({ value, onChange }: { value?: string; onChange: (value?: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawing = useRef(false);

  function point(event: PointerEvent<HTMLCanvasElement>) {
    const canvas = event.currentTarget;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  function start(event: PointerEvent<HTMLCanvasElement>) {
    const canvas = event.currentTarget;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    isDrawing.current = true;
    canvas.setPointerCapture(event.pointerId);
    const p = point(event);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  }

  function move(event: PointerEvent<HTMLCanvasElement>) {
    if (!isDrawing.current) return;
    const ctx = event.currentTarget.getContext("2d");
    if (!ctx) return;
    const p = point(event);
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#2D2421";
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  }

  function stop(event: PointerEvent<HTMLCanvasElement>) {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    onChange(event.currentTarget.toDataURL("image/png"));
  }

  function clear() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    onChange(undefined);
  }

  return (
    <div className="mt-4">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="text-sm font-medium">Signature tablette</span>
        <button
          onClick={clear}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <Trash2 className="h-3.5 w-3.5" /> Effacer
        </button>
      </div>
      <canvas
        ref={canvasRef}
        width={760}
        height={260}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={stop}
        onPointerLeave={stop}
        className="h-44 w-full touch-none rounded-2xl border border-border bg-white"
      />
      {value && <div className="mt-1 text-xs text-muted-foreground">Signature capturée.</div>}
    </div>
  );
}

function ObjectsPanel({
  objects,
  saveObjects,
}: {
  objects: CeramicObject[];
  saveObjects: (next: CeramicObject[]) => void;
}) {
  const [draft, setDraft] = useState({
    name: "",
    category: "Petites pieces" as CeramicObject["category"],
    price: "24",
  });

  function updateObject(id: string, patch: Partial<CeramicObject>) {
    saveObjects(objects.map((object) => (object.id === id ? { ...object, ...patch } : object)));
  }

  async function uploadObjectImage(id: string, file?: File) {
    if (!file) return;
    const imageDataUrl = await readFileAsDataUrl(file);
    updateObject(id, { imageDataUrl, imageName: file.name });
  }

  function addObject() {
    if (!draft.name.trim()) return;
    saveObjects([
      {
        id: `obj-${Date.now()}`,
        name: draft.name.trim(),
        category: draft.category,
        price: Number(draft.price) || 0,
        availability: "available",
      },
      ...objects,
    ]);
    setDraft({ name: "", category: "Petites pieces", price: "24" });
  }

  return (
    <Panel
      title="Objets à peindre"
      desc="Gestion simple des pièces, prix, disponibilités et photos visibles côté client."
    >
      <div className="grid gap-3 rounded-2xl border border-border bg-background p-4 sm:grid-cols-[1fr_180px_110px_auto]">
        <Field
          label="Nouvel objet"
          value={draft.name}
          onChange={(value) => setDraft({ ...draft, name: value })}
        />
        <label>
          <span className="mb-1.5 block text-sm font-medium">Catégorie</span>
          <select
            value={draft.category}
            onChange={(event) =>
              setDraft({ ...draft, category: event.target.value as CeramicObject["category"] })
            }
            className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
          >
            {["Tasses", "Bols", "Assiettes", "Figurines", "Deco", "Vases", "Petites pieces"].map(
              (category) => (
                <option key={category}>{category}</option>
              ),
            )}
          </select>
        </label>
        <Field
          label="Prix"
          value={draft.price}
          onChange={(value) => setDraft({ ...draft, price: value })}
        />
        <button
          onClick={addObject}
          className="self-end inline-flex items-center justify-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          <Plus className="h-4 w-4" /> Ajouter
        </button>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {objects.map((object) => (
          <div key={object.id} className="rounded-2xl border border-border bg-background p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-display text-xl">{object.name}</div>
                <div className="text-sm text-muted-foreground">
                  {object.category} · {object.price} €
                </div>
              </div>
              <select
                value={object.availability}
                onChange={(event) =>
                  updateObject(object.id, {
                    availability: event.target.value as CeramicObject["availability"],
                  })
                }
                className="rounded-full border border-input bg-background px-3 py-1.5 text-xs"
              >
                <option value="available">Disponible</option>
                <option value="limited">Stock limité</option>
                <option value="unavailable">Indisponible</option>
              </select>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-[96px_1fr] sm:items-center">
              <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl border border-border bg-secondary/40">
                {object.imageDataUrl ? (
                  <img
                    src={object.imageDataUrl}
                    alt={object.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <ImageIcon className="h-8 w-8 text-muted-foreground" />
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm hover:bg-secondary">
                  <UploadCloud className="h-4 w-4" /> Ajouter une photo
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={async (event) => {
                      await uploadObjectImage(object.id, event.currentTarget.files?.[0]);
                      event.currentTarget.value = "";
                    }}
                  />
                </label>
                {object.imageDataUrl && (
                  <button
                    onClick={() =>
                      updateObject(object.id, { imageDataUrl: undefined, imageName: undefined })
                    }
                    className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
                  >
                    <X className="h-4 w-4" /> Retirer
                  </button>
                )}
                {object.imageName && (
                  <span className="w-full text-xs text-muted-foreground">{object.imageName}</span>
                )}
              </div>
            </div>
            {object.note && <p className="mt-2 text-sm text-muted-foreground">{object.note}</p>}
          </div>
        ))}
      </div>
    </Panel>
  );
}

function DocumentsPanel({
  documents,
  saveDocuments,
}: {
  documents: ContentDocument[];
  saveDocuments: (next: ContentDocument[]) => void;
}) {
  function updateDocument(id: ContentDocument["id"], patch: Partial<ContentDocument>) {
    saveDocuments(
      documents.map((document) =>
        document.id === id
          ? { ...document, ...patch, updatedAt: new Date().toISOString() }
          : document,
      ),
    );
  }

  async function uploadDocument(id: ContentDocument["id"], file?: File) {
    if (!file) return;
    const attachmentDataUrl = await readFileAsDataUrl(file);
    updateDocument(id, {
      attachmentDataUrl,
      attachmentName: file.name,
      attachmentType: file.type || "application/octet-stream",
    });
  }

  return (
    <Panel
      title="Guide et décharge"
      desc="Les textes officiels seront fournis et validés par Mala Madre avant publication."
    >
      <div className="grid gap-4 lg:grid-cols-2">
        {documents.map((document) => (
          <div key={document.id} className="rounded-2xl border border-border bg-background p-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <h3 className="font-display text-xl">{document.title}</h3>
            </div>
            <label className="mt-4 block">
              <span className="mb-1.5 block text-sm font-medium">Version publiée</span>
              <input
                value={document.version}
                onChange={(event) => updateDocument(document.id, { version: event.target.value })}
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
              />
            </label>
            <label className="mt-3 block">
              <span className="mb-1.5 block text-sm font-medium">Texte</span>
              <textarea
                value={document.body}
                onChange={(event) => updateDocument(document.id, { body: event.target.value })}
                rows={8}
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </label>
            <div className="mt-4 rounded-2xl border border-border bg-card p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-medium">
                    {document.id === "waiver" ? "Document officiel" : "Fichier joint"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    PDF ou image à afficher avant signature.
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm hover:bg-secondary">
                    <UploadCloud className="h-4 w-4" /> Importer
                    <input
                      type="file"
                      accept="application/pdf,image/*,.doc,.docx"
                      className="sr-only"
                      onChange={async (event) => {
                        await uploadDocument(document.id, event.currentTarget.files?.[0]);
                        event.currentTarget.value = "";
                      }}
                    />
                  </label>
                  {document.attachmentDataUrl && (
                    <button
                      onClick={() =>
                        updateDocument(document.id, {
                          attachmentDataUrl: undefined,
                          attachmentName: undefined,
                          attachmentType: undefined,
                        })
                      }
                      className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
                    >
                      <X className="h-4 w-4" /> Retirer
                    </button>
                  )}
                </div>
              </div>
              <DocumentPreview document={document} className="mt-3" compact />
            </div>
            <div className="mt-3 text-xs text-muted-foreground">
              Dernière modification : {new Date(document.updatedAt).toLocaleString("fr-FR")}
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function DocumentPreview({
  document: item,
  title,
  className = "",
  compact,
}: {
  document?: ContentDocument;
  title?: string;
  className?: string;
  compact?: boolean;
}) {
  const previewTitle = title ?? item?.title ?? "Document";
  const hasAttachment = Boolean(item?.attachmentDataUrl);
  const isImage = item?.attachmentType?.startsWith("image/");
  const isPdf = item?.attachmentType === "application/pdf";

  return (
    <div className={`rounded-xl border border-border bg-secondary/30 p-3 text-sm ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-medium">
            {previewTitle}
            {item?.version && ` · ${item.version}`}
          </div>
          {item?.attachmentName && (
            <div className="mt-0.5 text-xs text-muted-foreground">{item.attachmentName}</div>
          )}
        </div>
        {hasAttachment && (
          <a
            href={item?.attachmentDataUrl}
            download={item?.attachmentName}
            className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-3 py-1 text-xs hover:bg-secondary"
          >
            <Download className="h-3.5 w-3.5" /> Ouvrir
          </a>
        )}
      </div>

      {hasAttachment && isImage && (
        <img
          src={item?.attachmentDataUrl}
          alt={previewTitle}
          className={`mt-3 w-full rounded-lg border border-border bg-white object-contain ${
            compact ? "max-h-52" : "max-h-80"
          }`}
        />
      )}

      {hasAttachment && isPdf && (
        <object
          data={item?.attachmentDataUrl}
          type="application/pdf"
          className={`mt-3 w-full rounded-lg border border-border bg-white ${
            compact ? "h-52" : "h-80"
          }`}
        >
          <a href={item?.attachmentDataUrl} download={item?.attachmentName}>
            Télécharger le document
          </a>
        </object>
      )}

      {hasAttachment && !isImage && !isPdf && (
        <div className="mt-3 flex items-center gap-3 rounded-lg border border-border bg-background p-3">
          <FileText className="h-5 w-5 text-primary" />
          <div>
            <div className="font-medium">Document importé</div>
            <div className="text-xs text-muted-foreground">
              Aperçu non disponible ici, mais le fichier est bien lié à cette version.
            </div>
          </div>
        </div>
      )}

      {!hasAttachment && (
        <p className={`mt-2 text-muted-foreground ${compact ? "line-clamp-3" : ""}`}>
          {item?.body ?? "Le document officiel sera ajouté par l'équipe."}
        </p>
      )}
    </div>
  );
}

function SettingsPanel({
  settings,
  saveSettings,
}: {
  settings: KafeSettings;
  saveSettings: (next: KafeSettings) => void;
}) {
  function update(patch: Partial<KafeSettings>) {
    saveSettings({ ...settings, ...patch });
  }

  return (
    <Panel title="Réglages" desc="Paramètres métier qui pourront ensuite être reliés à Supabase.">
      <div className="grid gap-4 md:grid-cols-2">
        <NumberField
          label="Acompte à partir de"
          value={settings.depositThreshold}
          suffix="personnes"
          onChange={(value) => update({ depositThreshold: value })}
        />
        <NumberField
          label="Acompte par personne"
          value={settings.depositPerPerson}
          suffix="€"
          onChange={(value) => update({ depositPerPerson: value })}
        />
        <NumberField
          label="Capacité atelier par défaut"
          value={settings.defaultCapacity}
          suffix="places"
          onChange={(value) => update({ defaultCapacity: value })}
        />
        <ToggleRow
          label="Signature obligatoire à l'arrivée"
          checked={settings.signatureRequiredOnArrival}
          onChange={(value) => update({ signatureRequiredOnArrival: value })}
        />
        <ToggleRow
          label="Accueil café sans réservation"
          checked={settings.walkInCafeEnabled}
          onChange={(value) => update({ walkInCafeEnabled: value })}
        />
      </div>
    </Panel>
  );
}

function Panel({ title, desc, children }: { title: string; desc: string; children: ReactNode }) {
  return (
    <div className="rounded-3xl border border-border bg-card p-4 sm:p-6">
      <div className="mb-5">
        <h2 className="font-display text-2xl">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
      </div>
      {children}
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
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${map[status]}`}
    >
      <CheckCircle2 className="h-3 w-3" /> {statusLabel(status)}
    </span>
  );
}

function StatusButton({
  id,
  target,
  current,
  label,
  danger,
}: {
  id: string;
  target: ReservationStatus;
  current: ReservationStatus;
  label: string;
  danger?: boolean;
}) {
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

function InfoPill({ children, tone }: { children: ReactNode; tone?: "success" | "warning" }) {
  const toneClass =
    tone === "success"
      ? "bg-sage/20 text-sage"
      : tone === "warning"
        ? "bg-mustard/25 text-brick"
        : "bg-secondary text-muted-foreground";
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs ${toneClass}`}>{children}</span>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl bg-secondary/40 p-8 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label>
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
      />
    </label>
  );
}

function NumberField({
  label,
  value,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  suffix: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="rounded-2xl border border-border bg-background p-4">
      <span className="mb-2 block text-sm font-medium">{label}</span>
      <div className="flex items-center gap-2">
        <input
          type="number"
          min={0}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
          className="w-28 rounded-xl border border-input bg-background px-3 py-2 text-sm"
        />
        <span className="text-sm text-muted-foreground">{suffix}</span>
      </div>
    </label>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-background p-4">
      <span className="text-sm font-medium">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-5 w-5 accent-primary"
      />
    </label>
  );
}
