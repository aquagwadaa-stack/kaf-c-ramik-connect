import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent, PointerEvent, ReactNode } from "react";
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
  Home,
  Image as ImageIcon,
  LockKeyhole,
  LogOut,
  PackageOpen,
  Plus,
  Save,
  Settings,
  ShieldCheck,
  Trash2,
  UploadCloud,
  UserCog,
  Users,
  X,
} from "lucide-react";
import { PageShell } from "@/components/page-shell";
import {
  useReservations,
  experienceLabel,
  formatReservationDate,
  removeReservation,
  statusLabel,
  updateStatus,
  type Reservation,
  type ReservationStatus,
} from "@/lib/reservations";
import {
  useCeramicObjects,
  useContentDocuments,
  contentDocumentsSeed,
  creationInspirationsSeed,
  getGuideDocument,
  useKafeSettings,
  useWaiverSignatures,
  type CreationInspiration,
  type GuideSection,
  type CeramicObject,
  type ContentDocument,
  type KafeSettings,
  type ScheduleRule,
  type WaiverSignature,
} from "@/lib/admin-data";
import {
  deleteRow,
  deleteRowsByColumn,
  isSupabaseConfigured,
  patchRowsByColumn,
  selectRows,
  signInAdmin,
  signOutAdmin,
  useAdminAccess,
} from "@/lib/supabase-rest";

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

type AdminTab =
  "reservations" | "waivers" | "objects" | "creations" | "documents" | "settings" | "team";

const objectCategories: CeramicObject["category"][] = [
  "Tasses",
  "Bols",
  "Assiettes",
  "Figurines",
  "Deco",
  "Vases",
  "Petites pieces",
];

const tabs: { id: AdminTab; label: string; icon: LucideIcon }[] = [
  { id: "reservations", label: "Réservations", icon: CalendarDays },
  { id: "waivers", label: "Décharges", icon: ClipboardSignature },
  { id: "objects", label: "Objets", icon: PackageOpen },
  { id: "creations", label: "Créations", icon: ImageIcon },
  { id: "documents", label: "Guide", icon: BookOpenText },
  { id: "settings", label: "Réglages", icon: Settings },
  { id: "team", label: "Équipe", icon: UserCog },
];

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function csvCell(value: unknown) {
  const text = value === undefined || value === null ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

function downloadCsv(filename: string, rows: unknown[][]) {
  const csv = rows.map((row) => row.map(csvCell).join(";")).join("\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function exportReservationsCsv(reservations: Reservation[]) {
  downloadCsv("reservations-kafe-ceramik.csv", [
    [
      "Date",
      "Creneau",
      "Prenom",
      "Nom",
      "Telephone",
      "Email",
      "Personnes",
      "Formule",
      "Statut",
      "Acompte requis",
      "Acompte recu",
      "Montant acompte",
      "Message",
      "Reference",
    ],
    ...reservations.map((reservation) => [
      reservation.date,
      reservation.slot,
      reservation.firstName,
      reservation.lastName,
      reservation.phone,
      reservation.email,
      reservation.people,
      experienceLabel(reservation.experience),
      statusLabel(reservation.status),
      reservation.depositRequired ? "oui" : "non",
      reservation.depositPaid ? "oui" : "non",
      reservation.depositAmount ?? "",
      reservation.message ?? "",
      reservation.id,
    ]),
  ]);
}

function AdminPage() {
  const admin = useAdminAccess();

  if (admin.configured && !admin.signedIn) {
    return <AdminLogin />;
  }

  if (admin.configured && admin.checking) {
    return <AdminGate message="Vérification de l'accès équipe..." />;
  }

  if (admin.configured && !admin.allowed) {
    return (
      <AdminGate
        message="Ce compte est connecté, mais il n'a pas encore d'accès administrateur au Kafé Céramik."
        action
      />
    );
  }

  return (
    <AdminWorkspace
      remoteMode={admin.configured}
      adminUserId={admin.session?.user?.id}
      adminEmail={admin.profile?.email ?? admin.session?.user?.email}
      adminRole={admin.profile?.role}
    />
  );
}

function AdminWorkspace({
  remoteMode,
  adminUserId,
  adminEmail,
  adminRole,
}: {
  remoteMode: boolean;
  adminUserId?: string;
  adminEmail?: string | null;
  adminRole?: string;
}) {
  const reservations = useReservations();
  const [objects, saveObjects] = useCeramicObjects();
  const [documents, saveDocuments] = useContentDocuments();
  const [signatures, saveSignatures] = useWaiverSignatures();
  const [settings, saveSettings] = useKafeSettings();
  const [tab, setTab] = useState<AdminTab>("reservations");
  const creations = settings.creationInspirations?.length
    ? settings.creationInspirations
    : creationInspirationsSeed;

  function saveCreations(next: CreationInspiration[]) {
    saveSettings({ ...settings, creationInspirations: next });
  }

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
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border bg-background/92 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div className="min-w-0">
            <div className="font-display text-xl leading-none">Kafé Céramik</div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
              {remoteMode
                ? `Données synchronisées${adminEmail ? ` · ${adminEmail}` : ""}${adminRole ? ` · ${adminRole}` : ""}`
                : "Mode local de travail"}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm text-foreground hover:bg-secondary"
            >
              <Home className="h-4 w-4" /> Voir le site
            </Link>
            {remoteMode && (
              <button
                onClick={signOutAdmin}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm text-foreground hover:bg-secondary"
              >
                <LogOut className="h-4 w-4" /> Déconnexion
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-5 px-4 py-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-display text-3xl leading-tight sm:text-4xl">Tableau de bord</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Gérez les réservations, les objets, les documents et les conditions de réservation.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
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
        {tab === "creations" && (
          <CreationsPanel creations={creations} saveCreations={saveCreations} />
        )}
        {tab === "documents" && (
          <DocumentsPanel documents={documents} saveDocuments={saveDocuments} />
        )}
        {tab === "settings" && <SettingsPanel settings={settings} saveSettings={saveSettings} />}
        {tab === "team" && (
          <TeamPanel
            remoteMode={remoteMode}
            adminUserId={adminUserId}
            adminEmail={adminEmail}
            adminRole={adminRole}
          />
        )}
      </main>
    </div>
  );
}

function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      await signInAdmin(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connexion impossible.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <PageShell>
      <section className="mx-auto grid min-h-[70vh] max-w-md place-items-center px-4 py-12">
        <form
          onSubmit={submit}
          className="w-full rounded-3xl border border-border bg-card p-6 shadow-sm"
        >
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary text-primary-foreground">
            <LockKeyhole className="h-5 w-5" />
          </div>
          <h1 className="mt-5 font-display text-3xl">Connexion équipe</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Accès réservé à l'administration du Kafé Céramik.
          </p>

          <div className="mt-5 grid gap-3">
            <Field label="Email" value={email} onChange={setEmail} />
            <label>
              <span className="mb-1.5 block text-sm font-medium">Mot de passe</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </label>
          </div>

          {error && <div className="mt-4 text-sm text-destructive">{error}</div>}
          <button
            type="submit"
            disabled={loading}
            className="mt-5 w-full rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground disabled:opacity-60"
          >
            {loading ? "Connexion..." : "Se connecter"}
          </button>
        </form>
      </section>
    </PageShell>
  );
}

function AdminGate({ message, action }: { message: string; action?: boolean }) {
  return (
    <PageShell>
      <section className="mx-auto grid min-h-[70vh] max-w-md place-items-center px-4 py-12">
        <div className="w-full rounded-3xl border border-border bg-card p-6 text-center shadow-sm">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-secondary text-secondary-foreground">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <p className="mt-5 text-sm text-muted-foreground">{message}</p>
          {action && (
            <button
              onClick={signOutAdmin}
              className="mt-5 rounded-full border border-border px-5 py-2 text-sm hover:bg-secondary"
            >
              Se déconnecter
            </button>
          )}
        </div>
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

type AdminTeamRow = {
  user_id: string;
  email: string | null;
  role: "owner" | "manager" | "team" | "readonly";
  created_at?: string;
  updated_at?: string;
};

function useAdminTeam(remoteMode: boolean) {
  const [members, setMembers] = useState<AdminTeamRow[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!remoteMode || !isSupabaseConfigured()) return;
    let alive = true;
    selectRows<AdminTeamRow>(
      "kafe_admin_profiles",
      "?select=user_id,email,role,created_at,updated_at&order=created_at.asc",
      true,
    )
      .then((rows) => {
        if (!alive) return;
        setMembers(rows);
        setError("");
      })
      .catch((teamError) => {
        if (!alive) return;
        setError(teamError instanceof Error ? teamError.message : "Liste des accès indisponible.");
      });

    return () => {
      alive = false;
    };
  }, [remoteMode]);

  return { members, setMembers, error };
}

function TeamPanel({
  remoteMode,
  adminUserId,
  adminEmail,
  adminRole,
}: {
  remoteMode: boolean;
  adminUserId?: string;
  adminEmail?: string | null;
  adminRole?: string;
}) {
  const { members, setMembers, error } = useAdminTeam(remoteMode);
  const [savingId, setSavingId] = useState("");
  const canManageTeam = adminRole === "owner";

  async function updateMemberRole(member: AdminTeamRow, role: AdminTeamRow["role"]) {
    if (!canManageTeam || member.user_id === adminUserId) return;
    setSavingId(member.user_id);
    try {
      await patchRowsByColumn(
        "kafe_admin_profiles",
        "user_id",
        member.user_id,
        { role, updated_at: new Date().toISOString() },
        true,
      );
      setMembers((current) =>
        current.map((item) => (item.user_id === member.user_id ? { ...item, role } : item)),
      );
    } finally {
      setSavingId("");
    }
  }

  async function removeMember(member: AdminTeamRow) {
    if (!canManageTeam || member.user_id === adminUserId) return;
    const confirmed = window.confirm(`Retirer l'accès admin de ${member.email ?? "ce compte"} ?`);
    if (!confirmed) return;
    setSavingId(member.user_id);
    try {
      await deleteRowsByColumn("kafe_admin_profiles", "user_id", member.user_id, true);
      setMembers((current) => current.filter((item) => item.user_id !== member.user_id));
    } finally {
      setSavingId("");
    }
  }

  return (
    <Panel
      title="Équipe"
      desc="Comptes autorisés à entrer dans l'espace admin. La route admin reste protégée par connexion et droits en base."
    >
      <div className="grid gap-4 lg:grid-cols-[1fr_0.85fr]">
        <div className="rounded-2xl border border-border bg-background p-4">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <h3 className="font-display text-xl">Accès actifs</h3>
          </div>
          <div className="mt-4 grid gap-3">
            {!remoteMode ? (
              <EmptyState text="Mode local : les accès seront visibles une fois Supabase connecté." />
            ) : error ? (
              <div className="rounded-2xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
                {error}
              </div>
            ) : members.length === 0 ? (
              <EmptyState text="Aucun profil admin lu pour le moment." />
            ) : (
              members.map((member) => (
                <div
                  key={member.user_id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4"
                >
                  <div>
                    <div className="font-medium">{member.email ?? "Compte sans email visible"}</div>
                    <div className="text-xs text-muted-foreground">
                      Ajouté le{" "}
                      {member.created_at
                        ? new Date(member.created_at).toLocaleDateString("fr-FR")
                        : "-"}
                    </div>
                  </div>
                  {canManageTeam && member.user_id !== adminUserId ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        value={member.role}
                        disabled={savingId === member.user_id}
                        onChange={(event) =>
                          updateMemberRole(member, event.target.value as AdminTeamRow["role"])
                        }
                        className="rounded-full border border-input bg-background px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ring"
                      >
                        <option value="owner">owner</option>
                        <option value="manager">manager</option>
                        <option value="team">team</option>
                        <option value="readonly">readonly</option>
                      </select>
                      <button
                        onClick={() => removeMember(member)}
                        disabled={savingId === member.user_id}
                        className="rounded-full border border-destructive/30 px-3 py-1.5 text-xs text-destructive hover:bg-destructive/10 disabled:opacity-50"
                      >
                        Retirer
                      </button>
                    </div>
                  ) : (
                    <div className="text-right">
                      <RoleBadge role={member.role} />
                      {member.user_id === adminUserId && (
                        <div className="mt-1 text-xs text-muted-foreground">
                          Votre propre rôle est verrouillé ici.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-background p-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <h3 className="font-display text-xl">Rôles prévus</h3>
          </div>
          <div className="mt-4 space-y-3 text-sm">
            <RoleLine
              title="owner"
              body="Accès complet : réglages, contenus, objets, réservations et futurs comptes."
            />
            <RoleLine
              title="manager"
              body="Gestion quotidienne : réservations, objets, guide, documents et signatures."
            />
            <RoleLine
              title="team"
              body="Usage terrain : consultation du jour et signature de décharge sur tablette."
            />
            <RoleLine title="readonly" body="Lecture seule pour contrôler sans modifier." />
          </div>
          <div className="mt-5 rounded-2xl bg-secondary/60 p-4 text-sm text-muted-foreground">
            Compte connecté :{" "}
            <span className="font-medium text-foreground">{adminEmail ?? "-"}</span>
            {adminRole && <> · rôle {adminRole}</>}. Pour ajouter Anouk ou une autre personne, il
            faudra créer son compte puis lui attribuer un rôle ici ou via Supabase.
            {canManageTeam
              ? " Les rôles des autres comptes peuvent ensuite être modifiés depuis cette page."
              : " La modification des rôles est réservée au compte owner."}
          </div>
        </div>
      </div>
    </Panel>
  );
}

function RoleBadge({ role }: { role: AdminTeamRow["role"] }) {
  return (
    <span className="inline-flex rounded-full border border-border bg-secondary px-3 py-1 text-xs font-medium">
      {role}
    </span>
  );
}

function RoleLine({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-3">
      <div className="font-medium">{title}</div>
      <div className="mt-1 text-muted-foreground">{body}</div>
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
        <button
          onClick={() => exportReservationsCsv(filtered)}
          disabled={filtered.length === 0}
          className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-45"
        >
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
            {formatReservationDate(reservation.date)}
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
        <button
          onClick={() => removeReservation(reservation.id)}
          className="rounded-full border border-destructive/30 px-3 py-1 text-xs text-destructive hover:bg-destructive/10"
        >
          Supprimer
        </button>
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

  function removeSignature(id: string) {
    saveSignatures(signatures.filter((signature) => signature.id !== id));
    if (isSupabaseConfigured()) {
      deleteRow("kafe_waiver_signatures", id).catch((remoteError) => {
        console.warn("Remote signature delete skipped:", remoteError);
      });
    }
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
                    {reservation.firstName} {reservation.lastName} ·{" "}
                    {formatReservationDate(reservation.date)} · {reservation.slot}
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
                    <div className="flex shrink-0 items-center gap-2">
                      <InfoPill tone="success">Signé</InfoPill>
                      <button
                        onClick={() => removeSignature(signature.id)}
                        className="grid h-8 w-8 place-items-center rounded-full border border-border text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        aria-label="Supprimer la signature"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
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

  function removeObject(id: string) {
    saveObjects(objects.filter((object) => object.id !== id));
    if (isSupabaseConfigured()) {
      deleteRow("kafe_ceramic_objects", id).catch((remoteError) => {
        console.warn("Remote object delete skipped:", remoteError);
      });
    }
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
            {objectCategories.map((category) => (
              <option key={category}>{category}</option>
            ))}
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
              <button
                onClick={() => removeObject(object.id)}
                className="grid h-8 w-8 place-items-center rounded-full border border-border text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                aria-label="Supprimer l'objet"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_150px_96px]">
              <Field
                label="Nom"
                value={object.name}
                onChange={(value) => updateObject(object.id, { name: value })}
              />
              <label>
                <span className="mb-1.5 block text-sm font-medium">Categorie</span>
                <select
                  value={object.category}
                  onChange={(event) =>
                    updateObject(object.id, {
                      category: event.target.value as CeramicObject["category"],
                    })
                  }
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
                >
                  {objectCategories.map((category) => (
                    <option key={category}>{category}</option>
                  ))}
                </select>
              </label>
              <Field
                label="Prix"
                value={`${object.price}`}
                onChange={(value) => updateObject(object.id, { price: Number(value) || 0 })}
              />
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
            <label className="mt-3 block">
              <span className="mb-1.5 block text-sm font-medium">Note visible / precision</span>
              <textarea
                value={object.note ?? ""}
                onChange={(event) => updateObject(object.id, { note: event.target.value })}
                rows={2}
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                placeholder="Stock limite, modele populaire, grande piece..."
              />
            </label>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function CreationsPanel({
  creations,
  saveCreations,
}: {
  creations: CreationInspiration[];
  saveCreations: (next: CreationInspiration[]) => void;
}) {
  function updateCreation(id: string, patch: Partial<CreationInspiration>) {
    saveCreations(
      creations.map((creation) => (creation.id === id ? { ...creation, ...patch } : creation)),
    );
  }

  async function uploadCreationImage(id: string, file?: File) {
    if (!file) return;
    const imageDataUrl = await readFileAsDataUrl(file);
    updateCreation(id, { imageDataUrl, imageName: file.name });
  }

  function addCreation() {
    saveCreations([
      ...creations,
      {
        id: `creation-${Date.now()}`,
        title: "Nouvelle inspiration",
        body: "Description visible sur la page créations.",
        visible: true,
      },
    ]);
  }

  function removeCreation(id: string) {
    saveCreations(creations.filter((creation) => creation.id !== id));
  }

  return (
    <Panel
      title="Créations"
      desc="Photos et inspirations visibles sur la page Créations et dans la section d'accueil."
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
          Chaque carte peut être affichée, masquée, renommée et illustrée avec une photo. Les quatre
          premières cartes visibles remontent aussi sur l'accueil.
        </p>
        <button
          onClick={addCreation}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          <Plus className="h-4 w-4" /> Ajouter une création
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {creations.map((creation) => (
          <div key={creation.id} className="rounded-2xl border border-border bg-background p-4">
            <div className="grid gap-4 sm:grid-cols-[170px_1fr]">
              <div>
                <div className="flex aspect-[4/5] items-center justify-center overflow-hidden rounded-2xl border border-border bg-secondary/40">
                  {creation.imageDataUrl || creation.imageSrc ? (
                    <img
                      src={creation.imageDataUrl || creation.imageSrc}
                      alt={creation.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <ImageIcon className="h-9 w-9 text-muted-foreground" />
                  )}
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs hover:bg-secondary">
                    <UploadCloud className="h-3.5 w-3.5" /> Photo
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={async (event) => {
                        await uploadCreationImage(creation.id, event.currentTarget.files?.[0]);
                        event.currentTarget.value = "";
                      }}
                    />
                  </label>
                  {(creation.imageDataUrl || creation.imageSrc) && (
                    <button
                      onClick={() =>
                        updateCreation(creation.id, {
                          imageDataUrl: undefined,
                          imageName: undefined,
                          imageSrc: undefined,
                        })
                      }
                      className="rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-secondary"
                    >
                      Retirer
                    </button>
                  )}
                </div>
                {creation.imageName && (
                  <p className="mt-2 text-xs text-muted-foreground">{creation.imageName}</p>
                )}
              </div>

              <div className="grid gap-3">
                <Field
                  label="Titre"
                  value={creation.title}
                  onChange={(value) => updateCreation(creation.id, { title: value })}
                />
                <TextareaField
                  label="Description"
                  value={creation.body}
                  onChange={(value) => updateCreation(creation.id, { body: value })}
                />
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <ToggleRow
                    label="Visible sur le site"
                    checked={creation.visible}
                    onChange={(value) => updateCreation(creation.id, { visible: value })}
                  />
                  <button
                    onClick={() => removeCreation(creation.id)}
                    className="inline-flex items-center gap-2 rounded-full border border-destructive/30 px-3 py-2 text-xs text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Supprimer
                  </button>
                </div>
              </div>
            </div>
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
  const guide = getGuideDocument(documents);
  const waiver =
    documents.find((document) => document.id === "waiver") ??
    contentDocumentsSeed.find((document) => document.id === "waiver");

  function saveDocument(nextDocument: ContentDocument) {
    const exists = documents.some((document) => document.id === nextDocument.id);
    saveDocuments(
      exists
        ? documents.map((document) => (document.id === nextDocument.id ? nextDocument : document))
        : [...documents, nextDocument],
    );
  }

  function updateDocument(id: ContentDocument["id"], patch: Partial<ContentDocument>) {
    const current = id === "guide" ? guide : waiver;
    if (!current) return;
    saveDocument({ ...current, ...patch, updatedAt: new Date().toISOString() });
  }

  async function uploadDocument(id: ContentDocument["id"], file?: File) {
    if (!file) return;
    const attachmentDataUrl = await readFileAsDataUrl(file);
    updateDocument(id, {
      attachmentDataUrl,
      attachmentName: file.name,
      attachmentType: file.type || "application/octet-stream",
      version: `${id}-${new Date().toISOString().slice(0, 10)}`,
    });
  }

  function updateGuideSection(id: string, patch: Partial<GuideSection>) {
    updateDocument("guide", {
      sections: (guide.sections ?? []).map((section) =>
        section.id === id ? { ...section, ...patch } : section,
      ),
    });
  }

  async function uploadGuideImage(id: string, file?: File) {
    if (!file) return;
    const imageDataUrl = await readFileAsDataUrl(file);
    updateGuideSection(id, { imageDataUrl, imageName: file.name });
  }

  function addGuideSection() {
    const nextIndex = (guide.sections?.length ?? 0) + 1;
    updateDocument("guide", {
      sections: [
        ...(guide.sections ?? []),
        {
          id: `guide-${Date.now()}`,
          number: String(nextIndex).padStart(2, "0"),
          title: "Nouvelle étape",
          body: "Texte à compléter depuis l'administration.",
        },
      ],
    });
  }

  function removeGuideSection(id: string) {
    updateDocument("guide", {
      sections: (guide.sections ?? []).filter((section) => section.id !== id),
    });
  }

  return (
    <Panel
      title="Guide & décharge"
      desc="Le guide est une page publique modifiable. La décharge reste un document officiel importé pour la signature sur place."
    >
      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border border-border bg-background p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <BookOpenText className="h-5 w-5 text-primary" />
              <h3 className="font-display text-xl">Page guide</h3>
            </div>
            <Link
              to="/guide"
              className="rounded-full border border-border bg-card px-4 py-2 text-sm hover:bg-secondary"
            >
              Voir la page
            </Link>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <Field
              label="Titre"
              value={guide.title}
              onChange={(value) => updateDocument("guide", { title: value })}
            />
            <Field
              label="Version interne"
              value={guide.version}
              onChange={(value) => updateDocument("guide", { version: value })}
            />
          </div>
          <TextareaField
            label="Introduction"
            value={guide.intro ?? ""}
            onChange={(value) => updateDocument("guide", { intro: value })}
          />
          <TextareaField
            label="Texte important avant les étapes"
            value={guide.body}
            onChange={(value) => updateDocument("guide", { body: value })}
          />

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <h4 className="font-display text-xl">Étapes du guide</h4>
            <button
              onClick={addGuideSection}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              <Plus className="h-4 w-4" /> Ajouter une étape
            </button>
          </div>

          <div className="mt-3 grid gap-3">
            {(guide.sections ?? []).map((section) => (
              <div key={section.id} className="rounded-2xl border border-border bg-card p-4">
                <div className="grid gap-3 md:grid-cols-[90px_1fr]">
                  <Field
                    label="Numéro"
                    value={section.number}
                    onChange={(value) => updateGuideSection(section.id, { number: value })}
                  />
                  <Field
                    label="Titre"
                    value={section.title}
                    onChange={(value) => updateGuideSection(section.id, { title: value })}
                  />
                </div>

                <div className="mt-3 grid gap-3 lg:grid-cols-[150px_1fr]">
                  <div>
                    <div className="flex h-32 w-full items-center justify-center overflow-hidden rounded-2xl border border-border bg-secondary/40">
                      {section.imageDataUrl ? (
                        <img
                          src={section.imageDataUrl}
                          alt={section.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <ImageIcon className="h-8 w-8 text-muted-foreground" />
                      )}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-xs hover:bg-secondary">
                        <UploadCloud className="h-3.5 w-3.5" /> Photo
                        <input
                          type="file"
                          accept="image/*"
                          className="sr-only"
                          onChange={async (event) => {
                            await uploadGuideImage(section.id, event.currentTarget.files?.[0]);
                            event.currentTarget.value = "";
                          }}
                        />
                      </label>
                      {section.imageDataUrl && (
                        <button
                          onClick={() =>
                            updateGuideSection(section.id, {
                              imageDataUrl: undefined,
                              imageName: undefined,
                            })
                          }
                          className="rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-secondary"
                        >
                          Retirer
                        </button>
                      )}
                    </div>
                  </div>
                  <TextareaField
                    label="Texte de l'étape"
                    value={section.body}
                    onChange={(value) => updateGuideSection(section.id, { body: value })}
                  />
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">
                    {section.imageName ??
                      "Photo de remplacement utilisée côté client si aucune photo n'est ajoutée."}
                  </span>
                  <button
                    onClick={() => removeGuideSection(section.id)}
                    className="inline-flex items-center gap-2 rounded-full border border-destructive/30 px-3 py-1.5 text-xs text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Supprimer
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-3 text-xs text-muted-foreground">
            Dernière modification : {new Date(guide.updatedAt).toLocaleString("fr-FR")}
          </div>
        </div>

        {waiver && (
          <div className="rounded-2xl border border-border bg-background p-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <h3 className="font-display text-xl">Décharge officielle</h3>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Importez le document qui sera présenté avant la signature sur tablette.
            </p>
            <div className="mt-4 rounded-2xl border border-border bg-card p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-medium">
                    {waiver.attachmentName ?? "Aucun document importé"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    PDF, image, Word ou document fourni par Mala Madre.
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
                        await uploadDocument("waiver", event.currentTarget.files?.[0]);
                        event.currentTarget.value = "";
                      }}
                    />
                  </label>
                  {waiver.attachmentDataUrl && (
                    <button
                      onClick={() =>
                        updateDocument("waiver", {
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
              <DocumentPreview document={waiver} className="mt-3" compact />
            </div>
            <div className="mt-3 text-xs text-muted-foreground">
              Dernière modification : {new Date(waiver.updatedAt).toLocaleString("fr-FR")}
            </div>
          </div>
        )}
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
    <Panel
      title="Réglages"
      desc="Chaque paramètre modifie réellement le parcours client ou le travail de l'équipe."
    >
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
          suffix="EUR"
          onChange={(value) => update({ depositPerPerson: value })}
        />
        <NumberField
          label="Capacité atelier par défaut"
          value={settings.defaultCapacity}
          suffix="places"
          onChange={(value) => update({ defaultCapacity: value })}
        />
        <NumberField
          label="Durée d'un créneau"
          value={settings.slotDurationMinutes}
          suffix="minutes"
          onChange={(value) => update({ slotDurationMinutes: value })}
        />
        <NumberField
          label="Validation équipe à partir de"
          value={settings.manualConfirmationThreshold}
          suffix="personnes"
          onChange={(value) => update({ manualConfirmationThreshold: value })}
        />
        <ToggleRow
          label="Les groupes attendent une validation équipe"
          checked={settings.manualConfirmationForGroups}
          onChange={(value) => update({ manualConfirmationForGroups: value })}
        />
        <ToggleRow
          label="Accueil café sans réservation"
          checked={settings.walkInCafeEnabled}
          onChange={(value) => update({ walkInCafeEnabled: value })}
        />
      </div>

      <div className="mt-5 grid gap-4">
        <div className="rounded-2xl border border-border bg-background p-4">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            <h3 className="font-display text-xl">Réseaux & contact</h3>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <Field
              label="Instagram"
              value={settings.instagramUrl}
              onChange={(value) => update({ instagramUrl: value })}
            />
            <Field
              label="Facebook"
              value={settings.facebookUrl}
              onChange={(value) => update({ facebookUrl: value })}
            />
            <Field
              label="TikTok"
              value={settings.tiktokUrl}
              onChange={(value) => update({ tiktokUrl: value })}
            />
            <Field
              label="Email de contact"
              value={settings.contactEmail}
              onChange={(value) => update({ contactEmail: value })}
            />
          </div>
        </div>

        <ScheduleRulesEditor
          rules={settings.scheduleRules ?? []}
          onChange={(scheduleRules) => update({ scheduleRules })}
        />

        <TextareaField
          label="Texte affiché pour les clients qui viennent seulement au Kafé"
          value={settings.walkInNoticeText}
          onChange={(value) => update({ walkInNoticeText: value })}
        />
        <TextareaField
          label="Conditions pratiques affichées avant confirmation"
          value={settings.reservationConditionsText}
          onChange={(value) => update({ reservationConditionsText: value })}
        />
        <TextareaField
          label="Phrase d'acceptation du guide"
          value={settings.guideAcceptanceText}
          onChange={(value) => update({ guideAcceptanceText: value })}
        />
      </div>
    </Panel>
  );
}

const weekdayOptions = [
  ["Lun", 1],
  ["Mar", 2],
  ["Mer", 3],
  ["Jeu", 4],
  ["Ven", 5],
  ["Sam", 6],
  ["Dim", 0],
] as const;

function dateInput(offsetMonths = 0) {
  const date = new Date();
  date.setMonth(date.getMonth() + offsetMonths);
  return date.toISOString().slice(0, 10);
}

function createScheduleRule(): ScheduleRule {
  return {
    id: `rule-${Date.now()}`,
    label: "Nouvelle plage",
    weekdays: [2, 3, 4, 5, 6],
    startTime: "09:00",
    endTime: "12:00",
    validFrom: dateInput(0),
    validUntil: dateInput(2),
  };
}

function ScheduleRulesEditor({
  rules,
  onChange,
}: {
  rules: ScheduleRule[];
  onChange: (rules: ScheduleRule[]) => void;
}) {
  function updateRule(id: string, patch: Partial<ScheduleRule>) {
    onChange(rules.map((rule) => (rule.id === id ? { ...rule, ...patch } : rule)));
  }

  function toggleWeekday(rule: ScheduleRule, day: number) {
    const weekdays = rule.weekdays.includes(day)
      ? rule.weekdays.filter((value) => value !== day)
      : [...rule.weekdays, day].sort();
    updateRule(rule.id, { weekdays });
  }

  return (
    <div className="rounded-2xl border border-border bg-background p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="font-display text-xl">Planning des créneaux</div>
          <p className="mt-1 text-sm text-muted-foreground">
            Créez des plages horaires par jours et par période. Le planning client se met à jour
            avec ces règles.
          </p>
        </div>
        <button
          onClick={() => onChange([...rules, createScheduleRule()])}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          <Plus className="h-4 w-4" /> Ajouter une plage
        </button>
      </div>

      <div className="mt-4 grid gap-3">
        {rules.length === 0 ? (
          <EmptyState text="Aucune plage active. Ajoutez une plage pour afficher des créneaux côté client." />
        ) : (
          rules.map((rule) => (
            <div key={rule.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-start">
                <div className="grid gap-3 md:grid-cols-2">
                  <Field
                    label="Nom de la plage"
                    value={rule.label}
                    onChange={(value) => updateRule(rule.id, { label: value })}
                  />
                  <div>
                    <span className="mb-1.5 block text-sm font-medium">Jours concernés</span>
                    <div className="flex flex-wrap gap-2">
                      {weekdayOptions.map(([label, day]) => {
                        const active = rule.weekdays.includes(day);
                        return (
                          <button
                            key={day}
                            type="button"
                            onClick={() => toggleWeekday(rule, day)}
                            className={`rounded-full border px-3 py-1.5 text-sm ${
                              active
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border bg-background hover:bg-secondary"
                            }`}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <TimeField
                    label="Début"
                    value={rule.startTime}
                    onChange={(value) => updateRule(rule.id, { startTime: value })}
                  />
                  <TimeField
                    label="Fin"
                    value={rule.endTime}
                    onChange={(value) => updateRule(rule.id, { endTime: value })}
                  />
                  <DateField
                    label="Appliquer à partir du"
                    value={rule.validFrom}
                    onChange={(value) => updateRule(rule.id, { validFrom: value })}
                  />
                  <DateField
                    label="Jusqu'au"
                    value={rule.validUntil}
                    onChange={(value) => updateRule(rule.id, { validUntil: value })}
                  />
                </div>
                <button
                  onClick={() => onChange(rules.filter((item) => item.id !== rule.id))}
                  className="inline-flex items-center gap-2 rounded-full border border-destructive/30 px-4 py-2 text-sm text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4" /> Supprimer
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
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

function TimeField({
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
        type="time"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
      />
    </label>
  );
}

function DateField({
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
        type="date"
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

function TextareaField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium">{label}</span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={3}
        className="w-full resize-y rounded-2xl border border-input bg-background px-4 py-3 text-sm leading-6 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
      />
    </label>
  );
}
