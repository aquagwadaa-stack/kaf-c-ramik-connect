import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import QRCode from "qrcode";
import {
  AlertCircle,
  Bell,
  BookOpenText,
  CalendarOff,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ClipboardSignature,
  Clock3,
  Coins,
  Download,
  FileText,
  Gift,
  Home,
  Image as ImageIcon,
  LayoutDashboard,
  LockKeyhole,
  LogOut,
  Mail,
  MessageSquareHeart,
  PackageOpen,
  Plus,
  QrCode,
  Search,
  Settings,
  ShieldCheck,
  Smartphone,
  Trash2,
  UploadCloud,
  UserCog,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { PageShell } from "@/components/page-shell";
import {
  addWalkInReservation,
  decideGroupReservation,
  useReservations,
  experienceLabel,
  formatReservationDate,
  getSeatingAvailability,
  getSlotsForDate,
  removeReservation,
  seatingAllocationLabel,
  statusLabel,
  seatingUnitLabel,
  updateStatus,
  useReservationOccupancies,
  type Reservation,
  type ReservationStatus,
  type SlotOccupancy,
} from "@/lib/reservations";
import {
  useCeramicObjects,
  useContentDocuments,
  creationInspirationsSeed,
  getGuideDocument,
  getMenuDocument,
  getWaiverDocument,
  pageImagesSeed,
  useKafeSettings,
  useWaiverSignatures,
  type CreationInspiration,
  type CeramicObject,
  type ContentDocument,
  type ContentResource,
  type GiftCardOption,
  type KafeSettings,
  type PageImageSetting,
  type ScheduleRule,
  type SeatingArea,
  type SeatingZone,
  type WaiverSignature,
} from "@/lib/admin-data";
import { useAdminGuestbookEntries, type GuestbookEntry } from "@/lib/guestbook";
import { resendGiftCardPdf, useAdminGiftCardOrders, type GiftCardOrder } from "@/lib/gift-cards";
import { storeDocumentFile } from "@/lib/document-files";
import {
  deleteAdminFileByPublicUrl,
  deleteRow,
  callRpc,
  isSupabaseConfigured,
  invokeEdgeFunction,
  selectRows,
  signInAdmin,
  signUpAdmin,
  signOutAdmin,
  useAdminAccess,
} from "@/lib/supabase-rest";
import { downloadSignedWaiver } from "@/lib/waiver-pdf";

export const Route = createFileRoute("/admin")({
  ssr: false,
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
  | "overview"
  | "reservations"
  | "waivers"
  | "objects"
  | "creations"
  | "images"
  | "guestbook"
  | "giftcards"
  | "documents"
  | "settings"
  | "team";

const objectCategories: CeramicObject["category"][] = [
  "Tasses",
  "Bols",
  "Assiettes",
  "Figurines",
  "Deco",
  "Vases",
  "Petites pieces",
];

const tabGroups: { label: string; items: { id: AdminTab; label: string; icon: LucideIcon }[] }[] = [
  {
    label: "Au quotidien",
    items: [
      { id: "overview", label: "Vue d'ensemble", icon: LayoutDashboard },
      { id: "reservations", label: "Réservations", icon: CalendarDays },
      { id: "waivers", label: "Décharges", icon: ClipboardSignature },
    ],
  },
  {
    label: "Contenus",
    items: [
      { id: "objects", label: "Objets", icon: PackageOpen },
      { id: "creations", label: "Créations", icon: ImageIcon },
      { id: "images", label: "Images des pages", icon: ImageIcon },
      { id: "guestbook", label: "Livre d'or", icon: MessageSquareHeart },
      { id: "giftcards", label: "Cartes cadeaux", icon: Gift },
      { id: "documents", label: "Guide et carte", icon: BookOpenText },
    ],
  },
  {
    label: "Configuration",
    items: [
      { id: "settings", label: "Réglages", icon: Settings },
      { id: "team", label: "Équipe", icon: UserCog },
    ],
  },
];

const tabs = tabGroups.flatMap((group) => group.items);

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

function reservationIsSigned(reservation: Reservation, signatures: WaiverSignature[]) {
  if (reservation.source === "walk_in") return true;
  return signatures.some(
    (signature) =>
      signature.reservationRef === reservation.id ||
      `${signature.firstName} ${signature.lastName}`.toLowerCase() ===
        `${reservation.firstName} ${reservation.lastName}`.toLowerCase(),
  );
}

function exportReservationsCsv(reservations: Reservation[], settings: KafeSettings) {
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
      "Emplacement",
      "Statut",
      "Acompte requis",
      "Acompte recu",
      "Montant acompte",
      "Forfait ceramique / personne",
      "Forfait brunch / personne",
      "Total devis estimatif",
      "Reference devis",
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
      seatingAllocationLabel(reservation, settings) ?? "À attribuer",
      statusLabel(reservation.status),
      reservation.depositRequired ? "oui" : "non",
      reservation.depositPaid ? "oui" : "non",
      reservation.depositAmount ?? "",
      reservation.groupCeramicRatePerPerson ?? "",
      reservation.groupMealRatePerPerson ?? "",
      reservation.groupQuoteTotal ?? "",
      reservation.groupQuoteNumber ?? "",
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

type AdminNotification = {
  id: number;
  kind: string;
  title: string;
  body: string;
  reservation_id?: string | null;
  access_request_id?: string | null;
  created_at: string;
  is_read: boolean;
};

function useAdminNotifications(remoteMode: boolean) {
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);

  useEffect(() => {
    if (!remoteMode) return;
    let alive = true;
    async function load() {
      try {
        const rows = await callRpc<AdminNotification[]>(
          "get_kafe_admin_notifications",
          { p_limit: 20 },
          true,
        );
        if (alive) setNotifications(rows);
      } catch (error) {
        console.warn("Admin notifications unavailable:", error);
      }
    }
    void load();
    const timer = window.setInterval(load, 15_000);
    window.addEventListener("focus", load);
    return () => {
      alive = false;
      window.clearInterval(timer);
      window.removeEventListener("focus", load);
    };
  }, [remoteMode]);

  async function markRead(id: number) {
    setNotifications((current) =>
      current.map((notification) =>
        notification.id === id ? { ...notification, is_read: true } : notification,
      ),
    );
    if (remoteMode) {
      await callRpc("mark_kafe_notification_read", { p_notification_id: id }, true).catch((error) =>
        console.warn("Notification receipt unavailable:", error),
      );
    }
  }

  return { notifications, markRead };
}

type AdminPushStatus = "checking" | "idle" | "active" | "blocked" | "unsupported";

function urlBase64ToUint8Array(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replaceAll("-", "+").replaceAll("_", "/");
  const raw = window.atob(base64);
  return Uint8Array.from(raw, (character) => character.charCodeAt(0));
}

function AdminPushControl({ remoteMode }: { remoteMode: boolean }) {
  const [status, setStatus] = useState<AdminPushStatus>("checking");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!remoteMode) {
      setStatus("unsupported");
      return;
    }
    if (
      !window.isSecureContext ||
      !("serviceWorker" in navigator) ||
      !("PushManager" in window) ||
      !("Notification" in window)
    ) {
      setStatus("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setStatus("blocked");
      return;
    }

    let alive = true;
    navigator.serviceWorker.ready
      .then(async (registration) => {
        const subscription = await registration.pushManager.getSubscription();
        if (!alive) return;
        if (!subscription) {
          setStatus("idle");
          return;
        }
        await invokeEdgeFunction(
          "kafe-push",
          {
            action: "subscribe",
            subscription: subscription.toJSON(),
            userAgent: navigator.userAgent,
          },
          true,
        );
        if (alive) setStatus("active");
      })
      .catch((error) => {
        console.warn("Push subscription check failed:", error);
        if (alive) {
          setStatus("idle");
          setMessage(
            "L'activation sera disponible une fois le service de notifications configuré.",
          );
        }
      });
    return () => {
      alive = false;
    };
  }, [remoteMode]);

  async function activate() {
    setBusy(true);
    setMessage("");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus(permission === "denied" ? "blocked" : "idle");
        return;
      }

      const config = await invokeEdgeFunction<{
        configured: boolean;
        publicKey?: string;
      }>("kafe-push", { action: "config" }, true);
      if (!config.configured || !config.publicKey) {
        throw new Error("Push service not configured");
      }

      const registration = await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();
      const subscription =
        existing ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(config.publicKey),
        }));
      await invokeEdgeFunction(
        "kafe-push",
        {
          action: "subscribe",
          subscription: subscription.toJSON(),
          userAgent: navigator.userAgent,
        },
        true,
      );
      setStatus("active");
      setMessage("Ce téléphone recevra les nouvelles réservations et les annulations.");
    } catch (error) {
      console.warn("Push activation failed:", error);
      setStatus("idle");
      setMessage("Impossible d'activer les notifications pour le moment.");
    } finally {
      setBusy(false);
    }
  }

  async function deactivate() {
    setBusy(true);
    setMessage("");
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await invokeEdgeFunction(
          "kafe-push",
          { action: "unsubscribe", endpoint: subscription.endpoint },
          true,
        );
        await subscription.unsubscribe();
      }
      setStatus("idle");
      setMessage("Notifications désactivées sur cet appareil.");
    } catch (error) {
      console.warn("Push deactivation failed:", error);
      setMessage("La désactivation n'a pas pu être finalisée.");
    } finally {
      setBusy(false);
    }
  }

  if (status === "checking") return null;

  return (
    <Panel
      title="Notifications sur cet appareil"
      desc="Chaque téléphone de l'équipe active ses propres notifications après connexion."
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-secondary">
            <Smartphone className="h-4 w-4" />
          </span>
          <div className="text-sm">
            <div className="font-medium">
              {status === "active"
                ? "Notifications actives"
                : status === "blocked"
                  ? "Notifications bloquées"
                  : status === "unsupported"
                    ? "Installation nécessaire"
                    : "Notifications non activées"}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {status === "unsupported"
                ? "Sur iPhone ou iPad, installe d'abord le site sur l'écran d'accueil, puis ouvre l'espace équipe depuis l'icône installée."
                : status === "blocked"
                  ? "Autorise les notifications dans les réglages du navigateur ou du téléphone, puis recharge cette page."
                  : message ||
                    "Tu recevras les nouvelles réservations, les demandes de groupe et les annulations, même lorsque le site est fermé."}
            </p>
          </div>
        </div>
        {status !== "unsupported" && status !== "blocked" && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void (status === "active" ? deactivate() : activate())}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
          >
            <Bell className="h-4 w-4" />
            {busy ? "Patientez..." : status === "active" ? "Désactiver" : "Activer"}
          </button>
        )}
      </div>
    </Panel>
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
  const occupancies = useReservationOccupancies();
  const [objects, saveObjects] = useCeramicObjects();
  const [documents, saveDocuments, replaceDocumentsLocal] = useContentDocuments();
  const [signatures, saveSignatures] = useWaiverSignatures();
  const [settings, saveSettings] = useKafeSettings();
  const [guestbookEntries, saveGuestbookEntries] = useAdminGuestbookEntries();
  const { notifications, markRead: markNotificationRead } = useAdminNotifications(remoteMode);
  const [tab, setTab] = useState<AdminTab>("overview");
  const creations = settings.creationInspirations?.length
    ? settings.creationInspirations
    : creationInspirationsSeed;

  function saveCreations(next: CreationInspiration[]) {
    saveSettings({ ...settings, creationInspirations: next });
  }

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

      <main className="mx-auto max-w-7xl space-y-5 px-4 py-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-display text-3xl leading-tight sm:text-4xl">Tableau de bord</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Gérez les réservations, les objets, les documents et les conditions de réservation.
            </p>
          </div>
        </div>

        <label className="block lg:hidden">
          <span className="sr-only">Rubrique de l'administration</span>
          <select
            value={tab}
            onChange={(event) => setTab(event.target.value as AdminTab)}
            className="h-12 w-full rounded-xl border border-input bg-card px-4 text-sm font-medium"
          >
            {tabGroups.map((group) => (
              <optgroup key={group.label} label={group.label}>
                {group.items.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>

        <div className="grid gap-5 lg:grid-cols-[14rem_minmax(0,1fr)] lg:items-start">
          <aside className="sticky top-24 hidden rounded-2xl border border-border bg-card p-3 lg:block">
            {tabGroups.map((group, groupIndex) => (
              <div key={group.label} className={groupIndex ? "mt-5" : ""}>
                <div className="px-3 pb-2 text-xs font-semibold uppercase text-muted-foreground">
                  {group.label}
                </div>
                <div className="grid gap-1">
                  {group.items.map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setTab(id)}
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm ${
                        tab === id ? "bg-primary text-primary-foreground" : "hover:bg-secondary"
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" /> {label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </aside>

          <section className="min-w-0">
            {tab === "overview" && (
              <OverviewPanel
                remoteMode={remoteMode}
                reservations={reservations}
                occupancies={occupancies}
                signatures={signatures}
                settings={settings}
                notifications={notifications}
                onReadNotification={markNotificationRead}
                onNavigate={setTab}
              />
            )}
            {tab === "reservations" && (
              <ReservationsPanel
                reservations={reservations}
                signatures={signatures}
                settings={settings}
              />
            )}
            {tab === "waivers" && (
              <WaiversPanel
                documents={documents}
                saveDocuments={saveDocuments}
                replaceDocumentsLocal={replaceDocumentsLocal}
                signatures={signatures}
                saveSignatures={saveSignatures}
                reservations={reservations}
              />
            )}
            {tab === "objects" && <ObjectsPanel objects={objects} saveObjects={saveObjects} />}
            {tab === "creations" && (
              <CreationsPanel creations={creations} saveCreations={saveCreations} />
            )}
            {tab === "images" && (
              <PageImagesPanel settings={settings} saveSettings={saveSettings} />
            )}
            {tab === "guestbook" && (
              <GuestbookPanel
                entries={guestbookEntries}
                saveEntries={saveGuestbookEntries}
                settings={settings}
                saveSettings={saveSettings}
              />
            )}
            {tab === "giftcards" && (
              <GiftCardsPanel settings={settings} saveSettings={saveSettings} />
            )}
            {tab === "documents" && (
              <DocumentsPanel
                documents={documents}
                saveDocuments={saveDocuments}
                replaceDocumentsLocal={replaceDocumentsLocal}
              />
            )}
            {tab === "settings" && (
              <SettingsPanel settings={settings} saveSettings={saveSettings} />
            )}
            {tab === "team" && (
              <TeamPanel
                remoteMode={remoteMode}
                adminUserId={adminUserId}
                adminEmail={adminEmail}
                adminRole={adminRole}
              />
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

function OverviewPanel({
  remoteMode,
  reservations,
  occupancies,
  signatures,
  settings,
  notifications,
  onReadNotification,
  onNavigate,
}: {
  remoteMode: boolean;
  reservations: Reservation[];
  occupancies: SlotOccupancy[];
  signatures: WaiverSignature[];
  settings: KafeSettings;
  notifications: AdminNotification[];
  onReadNotification: (id: number) => void;
  onNavigate: (tab: AdminTab) => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const activeReservations = reservations.filter(
    (reservation) => reservation.status !== "cancelled",
  );
  const todayReservations = activeReservations
    .filter((reservation) => reservation.date === today)
    .sort((a, b) => a.slot.localeCompare(b.slot));
  const pendingGroups = activeReservations.filter(
    (reservation) =>
      reservation.isGroupRequest &&
      (reservation.status === "pending" || reservation.status === "deposit_paid"),
  );
  const pendingDeposits = activeReservations.filter(
    (reservation) => reservation.depositRequired && !reservation.depositPaid,
  );
  const unsignedToday = todayReservations.filter(
    (reservation) => !reservationIsSigned(reservation, signatures),
  );

  const actions: {
    label: string;
    detail: string;
    icon: LucideIcon;
    tab?: AdminTab;
    href?: "/decharge-signature";
  }[] = [
    {
      label: "Réservations du jour",
      detail: "Consulter les arrivées et les emplacements",
      icon: CalendarDays,
      tab: "reservations",
    },
    {
      label: "Faire signer une décharge",
      detail: "Retrouver une réservation et enregistrer la signature",
      icon: ClipboardSignature,
      href: "/decharge-signature",
    },
    {
      label: "Gérer les objets",
      detail: "Mettre à jour les noms, catégories, prix et photos",
      icon: PackageOpen,
      tab: "objects",
    },
    {
      label: "Modifier le guide",
      detail: "Mettre à jour les textes et les étapes visibles",
      icon: BookOpenText,
      tab: "documents",
    },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          icon={CalendarDays}
          label="Aujourd'hui"
          value={`${todayReservations.length}`}
          sub="réservations actives"
        />
        <Stat
          icon={Users}
          label="Demandes groupes"
          value={`${pendingGroups.length}`}
          sub="à confirmer"
        />
        <Stat icon={Coins} label="Acomptes" value={`${pendingDeposits.length}`} sub="à suivre" />
        <Stat
          icon={ClipboardSignature}
          label="À signer"
          value={`${unsignedToday.length}`}
          sub="décharges aujourd'hui"
        />
      </div>

      <WeeklyCapacityPlanner
        reservations={reservations}
        occupancies={occupancies}
        settings={settings}
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <Panel
          title="Actions rapides"
          desc="Les tâches les plus utiles sont accessibles directement."
        >
          <div className="divide-y divide-border border-y border-border">
            {actions.map(({ label, detail, icon: Icon, tab, href }) => {
              const content = (
                <>
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-secondary">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">{label}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">{detail}</span>
                  </span>
                  <span aria-hidden="true" className="text-lg text-muted-foreground">
                    →
                  </span>
                </>
              );

              return href ? (
                <Link
                  key={href}
                  to={href}
                  className="flex w-full items-center gap-3 py-4 text-left hover:text-primary"
                >
                  {content}
                </Link>
              ) : (
                <button
                  key={tab}
                  type="button"
                  onClick={() => tab && onNavigate(tab)}
                  className="flex w-full items-center gap-3 py-4 text-left hover:text-primary"
                >
                  {content}
                </button>
              );
            })}
          </div>
        </Panel>

        <Panel
          title="Déroulé du jour"
          desc="Horaires, groupes et placement prévus pour chaque arrivée."
        >
          {todayReservations.length === 0 ? (
            <EmptyState text="Aucune réservation active aujourd'hui." />
          ) : (
            <div className="divide-y divide-border border-y border-border">
              {todayReservations.map((reservation) => {
                const location = seatingAllocationLabel(reservation, settings);
                const signed = reservationIsSigned(reservation, signatures);
                return (
                  <button
                    key={reservation.id}
                    type="button"
                    onClick={() => onNavigate("reservations")}
                    className="grid w-full gap-2 py-4 text-left sm:grid-cols-[4.5rem_minmax(0,1fr)_auto] sm:items-center"
                  >
                    <span className="font-display text-lg">{reservation.slot}</span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">
                        {reservation.firstName} {reservation.lastName} · {reservation.people} pers.
                      </span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {location ?? "Emplacement à attribuer"}
                      </span>
                    </span>
                    <InfoPill tone={signed ? "success" : "warning"}>
                      {signed ? "Arrivée enregistrée" : "Décharge à signer"}
                    </InfoPill>
                  </button>
                );
              })}
            </div>
          )}
        </Panel>
      </div>

      <WalkInAvailability
        reservations={reservations}
        occupancies={occupancies}
        settings={settings}
      />

      {notifications.length > 0 && (
        <Panel
          title={`Notifications${notifications.some((item) => !item.is_read) ? ` · ${notifications.filter((item) => !item.is_read).length} nouvelle(s)` : ""}`}
          desc="Réservations, annulations et demandes d'accès récentes."
        >
          <div className="divide-y divide-border border-y border-border">
            {notifications.slice(0, 6).map((notification) => (
              <button
                key={notification.id}
                type="button"
                onClick={() => {
                  void onReadNotification(notification.id);
                  onNavigate(
                    notification.kind === "admin_access_requested" ? "team" : "reservations",
                  );
                }}
                className="flex w-full items-start gap-3 py-3 text-left hover:text-primary"
              >
                <span
                  className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl ${
                    notification.is_read ? "bg-secondary" : "bg-primary text-primary-foreground"
                  }`}
                >
                  <Bell className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{notification.title}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {notification.body}
                  </span>
                </span>
                {!notification.is_read && (
                  <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" />
                )}
              </button>
            ))}
          </div>
        </Panel>
      )}

      <AdminPushControl remoteMode={remoteMode} />
    </div>
  );
}

function startOfAdminWeek(date: Date) {
  const result = new Date(date);
  const daysSinceMonday = (result.getDay() + 6) % 7;
  result.setDate(result.getDate() - daysSinceMonday);
  result.setHours(12, 0, 0, 0);
  return result;
}

function addAdminDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function WeeklyCapacityPlanner({
  reservations,
  occupancies,
  settings,
}: {
  reservations: Reservation[];
  occupancies: SlotOccupancy[];
  settings: KafeSettings;
}) {
  const [weekStart, setWeekStart] = useState(() => startOfAdminWeek(new Date()));
  const days = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addAdminDays(weekStart, index)),
    [weekStart],
  );
  const today = localDateValue(new Date());
  const weekLabel = `${days[0].toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
  })} - ${days[6].toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })}`;

  return (
    <Panel
      title="Planning de la semaine"
      desc="Visualisez les places encore disponibles pour chaque créneau, réservations en ligne et ajouts sur place compris."
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1.5 text-sm font-medium">
          <CalendarDays className="h-4 w-4 text-primary" /> {weekLabel}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setWeekStart((current) => addAdminDays(current, -7))}
            className="grid h-9 w-9 place-items-center rounded-full border border-border bg-background hover:bg-secondary"
            aria-label="Semaine précédente"
            title="Semaine précédente"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setWeekStart(startOfAdminWeek(new Date()))}
            className="h-9 rounded-full border border-border bg-background px-3 text-xs font-medium hover:bg-secondary"
          >
            Aujourd'hui
          </button>
          <button
            type="button"
            onClick={() => setWeekStart((current) => addAdminDays(current, 7))}
            className="grid h-9 w-9 place-items-center rounded-full border border-border bg-background hover:bg-secondary"
            aria-label="Semaine suivante"
            title="Semaine suivante"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto pb-2">
        <div className="grid min-w-[980px] grid-cols-7 gap-2">
          {days.map((day) => {
            const iso = localDateValue(day);
            const slots = getSlotsForDate(iso, settings);
            const isToday = iso === today;
            const isPast = iso < today;

            return (
              <div
                key={iso}
                className={`rounded-xl border p-2.5 ${
                  isToday
                    ? "border-primary bg-primary/5"
                    : isPast
                      ? "border-border bg-muted/30"
                      : "border-border bg-background"
                }`}
              >
                <div className="flex min-h-11 items-start justify-between gap-2">
                  <div>
                    <div className="text-[11px] uppercase text-muted-foreground">
                      {day.toLocaleDateString("fr-FR", { weekday: "short" })}
                    </div>
                    <div className="font-display text-xl leading-none">{day.getDate()}</div>
                  </div>
                  {isToday && (
                    <span className="rounded-full bg-primary px-2 py-1 text-[10px] font-medium text-primary-foreground">
                      Aujourd'hui
                    </span>
                  )}
                </div>

                {slots.length === 0 ? (
                  <div className="mt-3 rounded-lg border border-dashed border-border px-2 py-3 text-center text-xs text-muted-foreground">
                    Fermé
                  </div>
                ) : (
                  <div className="mt-3 grid gap-1.5">
                    {slots.map((slot) => {
                      const availability = getSeatingAvailability(
                        reservations,
                        occupancies,
                        iso,
                        slot,
                        settings,
                      );
                      const totalCapacity = availability.units.reduce(
                        (total, unit) => total + unit.capacity,
                        0,
                      );
                      const remaining = availability.hasUnassignedOverflow
                        ? 0
                        : availability.totalRemaining;
                      const ratio = totalCapacity > 0 ? remaining / totalCapacity : 0;
                      const tone =
                        remaining === 0
                          ? "border-destructive/30 bg-destructive/10 text-destructive"
                          : ratio <= 0.25
                            ? "border-gold/45 bg-gold/10"
                            : "border-sage/30 bg-sage/10";

                      return (
                        <div key={slot} className={`rounded-lg border px-2 py-2 ${tone}`}>
                          <div className="text-sm font-semibold">{slot}</div>
                          <div className="mt-0.5 text-[11px] leading-tight">
                            {remaining === 0
                              ? "Complet"
                              : `${remaining} / ${totalCapacity} places libres`}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </Panel>
  );
}

function localDateValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function localTimeValue(date: Date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function WalkInAvailability({
  reservations,
  occupancies,
  settings,
}: {
  reservations: Reservation[];
  occupancies: SlotOccupancy[];
  settings: KafeSettings;
}) {
  const [now, setNow] = useState(() => new Date());
  const today = localDateValue(now);
  const [date, setDate] = useState(today);
  const [timeChoice, setTimeChoice] = useState("now");
  const [walkInPeople, setWalkInPeople] = useState(2);
  const [walkInLabel, setWalkInLabel] = useState("");
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [walkInNotice, setWalkInNotice] = useState("");
  const [walkInError, setWalkInError] = useState("");
  const slots = useMemo(() => getSlotsForDate(date, settings), [date, settings]);
  const observedTime = timeChoice === "now" ? localTimeValue(now) : timeChoice;
  const availability = useMemo(
    () =>
      observedTime
        ? getSeatingAvailability(reservations, occupancies, date, observedTime, settings)
        : null,
    [date, observedTime, occupancies, reservations, settings],
  );

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  function chooseDate(nextDate: string) {
    setDate(nextDate);
    const nextSlots = getSlotsForDate(nextDate, settings);
    setTimeChoice(nextDate === today ? "now" : (nextSlots[0] ?? ""));
  }

  async function addWalkIn(unitId: string) {
    setAddingTo(unitId);
    setWalkInNotice("");
    setWalkInError("");
    try {
      const reservation = await addWalkInReservation({
        date,
        slot: observedTime,
        people: walkInPeople,
        seatingUnitId: unitId,
        label: walkInLabel,
      });
      setWalkInLabel("");
      setWalkInNotice(
        `${reservation.people} personne${reservation.people > 1 ? "s" : ""} ajoutée${reservation.people > 1 ? "s" : ""} dans ${seatingUnitLabel(reservation.seatingUnitId, settings) ?? "l'espace choisi"}.`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setWalkInError(
        message.includes("KAFE_SLOT_FULL")
          ? "Cet espace vient d'être occupé. Les disponibilités ont été actualisées."
          : "Le groupe n'a pas pu être ajouté. Réessayez dans un instant.",
      );
    } finally {
      setAddingTo(null);
    }
  }

  return (
    <Panel
      title="Places disponibles sur place"
      desc="Consultez chaque espace séparément pour accueillir un groupe sans le répartir entre plusieurs tables."
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <label>
          <span className="mb-1.5 block text-sm font-medium">Date</span>
          <input
            type="date"
            value={date}
            onChange={(event) => chooseDate(event.target.value)}
            className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </label>
        <label>
          <span className="mb-1.5 block text-sm font-medium">Heure observée</span>
          <select
            value={timeChoice}
            onChange={(event) => setTimeChoice(event.target.value)}
            className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          >
            {date === today && <option value="now">Maintenant · {localTimeValue(now)}</option>}
            {date !== today && slots.length === 0 && <option value="">Aucun créneau</option>}
            {slots.map((slot) => (
              <option key={slot} value={slot}>
                Créneau de {slot}
              </option>
            ))}
          </select>
        </label>
      </div>

      {!observedTime || !availability ? (
        <div className="mt-4">
          <EmptyState text="Aucun horaire n'est configuré pour cette date." />
        </div>
      ) : (
        <>
          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 border-y border-border py-3 text-sm">
            <span className="inline-flex items-center gap-2 font-medium">
              <Clock3 className="h-4 w-4 text-primary" /> {observedTime}
            </span>
            <span>
              <strong>{availability.totalRemaining}</strong> places libres au total
            </span>
            <span>
              plus grand groupe installable : <strong>{availability.maxGroupSize}</strong>
            </span>
          </div>

          <div className="mt-4 grid gap-3 rounded-xl border border-border bg-secondary/35 p-4 sm:grid-cols-[120px_minmax(0,1fr)]">
            <label>
              <span className="mb-1.5 block text-sm font-medium">Personnes</span>
              <input
                type="number"
                min={1}
                max={15}
                value={walkInPeople}
                onChange={(event) =>
                  setWalkInPeople(Math.min(15, Math.max(1, Number(event.target.value) || 1)))
                }
                className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </label>
            <label>
              <span className="mb-1.5 block text-sm font-medium">Nom ou repère</span>
              <input
                value={walkInLabel}
                onChange={(event) => setWalkInLabel(event.target.value)}
                placeholder="Facultatif · ex. Famille Laurent"
                className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </label>
            <p className="text-xs text-muted-foreground sm:col-span-2">
              Choisissez ensuite un espace compatible. L'ajout réserve immédiatement ces places pour
              tous les autres clients.
            </p>
          </div>

          {walkInNotice && (
            <div className="mt-3 flex items-start gap-2 rounded-lg border border-sage/35 bg-sage/10 p-3 text-sm">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-sage" /> {walkInNotice}
            </div>
          )}
          {walkInError && (
            <div className="mt-3 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {walkInError}
            </div>
          )}

          {availability.hasUnassignedOverflow && (
            <div className="mt-4 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              Une réservation sans emplacement compatible doit être réattribuée avant d'accueillir
              d'autres personnes.
            </div>
          )}

          <div className="mt-4 grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
            {availability.units.map((unit) => {
              const full = unit.remaining === 0;
              const canInstall =
                !availability.hasUnassignedOverflow && unit.remaining >= walkInPeople;
              const used = Math.max(0, unit.capacity - unit.remaining);
              return (
                <div
                  key={unit.id}
                  className={`bg-background p-3 ${full ? "text-muted-foreground" : ""}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-sm font-medium">{unit.label}</span>
                    <span className={`text-xs ${full ? "text-muted-foreground" : "text-sage"}`}>
                      {full ? "Complet" : `${unit.remaining}/${unit.capacity} libres`}
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full ${full ? "bg-muted-foreground/45" : "bg-sage"}`}
                      style={{ width: `${unit.capacity ? (used / unit.capacity) * 100 : 100}%` }}
                    />
                  </div>
                  <button
                    type="button"
                    disabled={!canInstall || addingTo !== null}
                    onClick={() => addWalkIn(unit.id)}
                    className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    {addingTo === unit.id ? "Ajout…" : canInstall ? "Installer ici" : "Trop petit"}
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}
    </Panel>
  );
}

function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "request">("login");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setNotice("");
    try {
      if (mode === "login") {
        await signInAdmin(email, password);
      } else {
        await signUpAdmin(email, password);
        setNotice(
          "La demande a bien été envoyée. Confirme ton adresse e-mail si nécessaire, puis attends la validation d'un membre de l'équipe.",
        );
      }
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
          <h1 className="mt-5 font-display text-3xl">
            {mode === "login" ? "Connexion équipe" : "Demander un accès"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {mode === "login"
              ? "Accès réservé à l'administration du Kafé Céramik."
              : "Crée ton identifiant personnel. Un accès déjà autorisé devra ensuite valider la demande."}
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
          {notice && (
            <div className="mt-4 rounded-xl border border-sage/35 bg-sage/10 p-3 text-sm">
              {notice}
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="mt-5 w-full rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground disabled:opacity-60"
          >
            {loading
              ? mode === "login"
                ? "Connexion..."
                : "Envoi..."
              : mode === "login"
                ? "Se connecter"
                : "Envoyer ma demande"}
          </button>
          <button
            type="button"
            onClick={() => {
              setMode((current) => (current === "login" ? "request" : "login"));
              setError("");
              setNotice("");
            }}
            className="mt-3 w-full text-sm font-medium text-primary underline underline-offset-4"
          >
            {mode === "login" ? "Je n'ai pas encore d'accès" : "J'ai déjà un compte"}
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

type AdminAccessRequest = {
  id: string;
  user_id: string;
  email: string;
  status: "pending" | "approved" | "rejected";
  requested_at: string;
};

function useAdminTeam(remoteMode: boolean) {
  const [members, setMembers] = useState<AdminTeamRow[]>([]);
  const [requests, setRequests] = useState<AdminAccessRequest[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!remoteMode || !isSupabaseConfigured()) return;
    let alive = true;
    Promise.all([
      selectRows<AdminTeamRow>(
        "kafe_admin_profiles",
        "?select=user_id,email,role,created_at,updated_at&order=created_at.asc",
        true,
      ),
      selectRows<AdminAccessRequest>(
        "kafe_admin_access_requests",
        "?select=id,user_id,email,status,requested_at&status=eq.pending&order=requested_at.asc",
        true,
      ),
    ])
      .then(([rows, pendingRequests]) => {
        if (!alive) return;
        setMembers(rows);
        setRequests(pendingRequests);
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

  return { members, setMembers, requests, setRequests, error };
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
  const { members, setMembers, requests, setRequests, error } = useAdminTeam(remoteMode);
  const [savingId, setSavingId] = useState("");
  const canManageTeam = Boolean(adminRole);

  async function removeMember(member: AdminTeamRow) {
    if (!canManageTeam || member.user_id === adminUserId) return;
    const confirmed = window.confirm(`Retirer l'accès admin de ${member.email ?? "ce compte"} ?`);
    if (!confirmed) return;
    setSavingId(member.user_id);
    try {
      await callRpc("revoke_kafe_admin_access", { p_user_id: member.user_id }, true);
      setMembers((current) => current.filter((item) => item.user_id !== member.user_id));
    } finally {
      setSavingId("");
    }
  }

  async function decideAccess(request: AdminAccessRequest, approved: boolean) {
    setSavingId(request.id);
    try {
      if (approved) {
        const result = await callRpc<{ ok: boolean; userId: string; email: string }>(
          "approve_kafe_admin_request",
          { p_request_id: request.id },
          true,
        );
        setMembers((current) => [
          ...current.filter((member) => member.user_id !== result.userId),
          {
            user_id: result.userId,
            email: result.email,
            role: "manager",
            created_at: new Date().toISOString(),
          },
        ]);
      } else {
        await callRpc("reject_kafe_admin_request", { p_request_id: request.id }, true);
      }
      setRequests((current) => current.filter((item) => item.id !== request.id));
    } finally {
      setSavingId("");
    }
  }

  return (
    <Panel
      title="Équipe"
      desc="Un seul niveau d'accès complet pour les personnes autorisées, avec un identifiant personnel pour chacune."
    >
      {requests.length > 0 && (
        <div className="mb-4 rounded-2xl border border-mustard/45 bg-mustard/10 p-4">
          <div className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            <h3 className="font-display text-xl">Demandes à valider</h3>
          </div>
          <div className="mt-3 grid gap-2">
            {requests.map((request) => (
              <div
                key={request.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-card p-3"
              >
                <div>
                  <div className="text-sm font-medium">{request.email}</div>
                  <div className="text-xs text-muted-foreground">
                    Demande du {new Date(request.requested_at).toLocaleDateString("fr-FR")}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => decideAccess(request, false)}
                    disabled={Boolean(savingId)}
                    className="rounded-full border border-border px-3 py-1.5 text-xs hover:bg-secondary disabled:opacity-50"
                  >
                    Refuser
                  </button>
                  <button
                    type="button"
                    onClick={() => decideAccess(request, true)}
                    disabled={Boolean(savingId)}
                    className="rounded-full bg-primary px-3 py-1.5 text-xs text-primary-foreground disabled:opacity-50"
                  >
                    Autoriser
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
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
                  <div className="flex flex-wrap items-center gap-2">
                    <RoleBadge role={member.role} />
                    {canManageTeam && member.user_id !== adminUserId && (
                      <button
                        onClick={() => removeMember(member)}
                        disabled={savingId === member.user_id}
                        className="rounded-full border border-destructive/30 px-3 py-1.5 text-xs text-destructive hover:bg-destructive/10 disabled:opacity-50"
                      >
                        Retirer
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-background p-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <h3 className="font-display text-xl">Accès unique</h3>
          </div>
          <div className="mt-4 border-l-4 border-primary bg-secondary/60 p-4 text-sm leading-6">
            Toutes les personnes autorisées peuvent gérer les réservations, les arrivées, les
            objets, les documents, le guide, les décharges, les contenus et les paramètres du Kafé.
          </div>
          <div className="mt-5 rounded-2xl bg-secondary/60 p-4 text-sm text-muted-foreground">
            Compte connecté :{" "}
            <span className="font-medium text-foreground">{adminEmail ?? "-"}</span>. Chaque
            personne utilise sa propre adresse e-mail et son propre mot de passe, sans partager les
            identifiants. Toute nouvelle demande doit être acceptée ici par une personne déjà
            autorisée.
          </div>
        </div>
      </div>
    </Panel>
  );
}

function RoleBadge({ role }: { role: AdminTeamRow["role"] }) {
  return (
    <span className="inline-flex rounded-full border border-border bg-secondary px-3 py-1 text-xs font-medium">
      {role === "owner" ? "Propriétaire technique" : "Accès complet"}
    </span>
  );
}

function ReservationsPanel({
  reservations,
  signatures,
  settings,
}: {
  reservations: Reservation[];
  signatures: WaiverSignature[];
  settings: KafeSettings;
}) {
  const [filter, setFilter] = useState<"today" | "upcoming" | "groups" | "all">("today");
  const today = new Date().toISOString().slice(0, 10);

  const filtered = useMemo(() => {
    if (filter === "today") return reservations.filter((r) => r.date === today);
    if (filter === "upcoming") return reservations.filter((r) => r.date >= today);
    if (filter === "groups") return reservations.filter((r) => r.isGroupRequest);
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
          onClick={() => exportReservationsCsv(filtered, settings)}
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
            const signed = reservationIsSigned(reservation, signatures);
            return (
              <ReservationCard
                key={reservation.id}
                reservation={reservation}
                signed={signed}
                settings={settings}
              />
            );
          })
        )}
      </div>
    </Panel>
  );
}

function ReservationCard({
  reservation,
  signed,
  settings,
}: {
  reservation: Reservation;
  signed: boolean;
  settings: KafeSettings;
}) {
  const location = seatingAllocationLabel(reservation, settings);
  const preferenceLabels = {
    indifferent: "Peu importe",
    interieur: "Intérieur",
    exterieur: "Extérieur",
    carbet: "Carbet",
  } as const;
  const groupRequest = Boolean(reservation.isGroupRequest);
  const pendingGroup =
    groupRequest && (reservation.status === "pending" || reservation.status === "deposit_paid");
  return (
    <div className="rounded-2xl border border-border bg-background p-4">
      <div className="grid gap-3 sm:grid-cols-[1fr_1.4fr_auto] sm:items-center">
        <div className="min-w-0">
          <div className="font-display text-lg">
            {reservation.firstName} {reservation.lastName}
          </div>
          <div className="text-xs text-muted-foreground">
            {reservation.source === "walk_in"
              ? "Groupe ajouté depuis l'accueil"
              : `${reservation.phone} · ${reservation.email}`}
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
        <InfoPill tone={location ? "success" : "warning"}>
          {location ? `Emplacement · ${location}` : "Emplacement à attribuer"}
        </InfoPill>
        {reservation.seatingPreference && (
          <InfoPill>Zone souhaitée · {preferenceLabels[reservation.seatingPreference]}</InfoPill>
        )}
        {reservation.depositRequired ? (
          <InfoPill tone={reservation.depositPaid ? "success" : "warning"}>
            {reservation.depositPaid
              ? "Acompte reçu"
              : `Acompte à suivre · ${reservation.depositAmount ?? settings.depositFixedAmount} €`}
          </InfoPill>
        ) : (
          <InfoPill>Pas d'acompte requis</InfoPill>
        )}
        {reservation.groupQuoteTotal ? (
          <InfoPill tone="success">Devis estimatif · {reservation.groupQuoteTotal} €</InfoPill>
        ) : null}
        {reservation.source === "walk_in" ? (
          <InfoPill>Ajouté sur place</InfoPill>
        ) : (
          <InfoPill tone={signed ? "success" : "warning"}>
            {signed ? "Décharge signée" : "Décharge à signer sur tablette"}
          </InfoPill>
        )}
      </div>

      {reservation.groupQuoteTotal && (
        <div className="mt-3 grid gap-2 rounded-xl bg-secondary/40 p-3 text-sm sm:grid-cols-3">
          <div>
            <span className="block text-xs text-muted-foreground">Céramique / personne</span>
            <span className="font-medium">{reservation.groupCeramicRatePerPerson} €</span>
          </div>
          <div>
            <span className="block text-xs text-muted-foreground">Brunch / personne</span>
            <span className="font-medium">{reservation.groupMealRatePerPerson} €</span>
          </div>
          <div>
            <span className="block text-xs text-muted-foreground">Total pour le groupe</span>
            <span className="font-medium">{reservation.groupQuoteTotal} €</span>
          </div>
        </div>
      )}

      {reservation.message && (
        <div className="mt-3 flex items-start gap-2 rounded-xl bg-secondary/40 p-3 text-sm">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <p className="text-foreground/80">{reservation.message}</p>
        </div>
      )}

      {groupRequest && <GroupDecisionControls reservation={reservation} />}

      <div className="mt-3 flex flex-wrap gap-2">
        {!pendingGroup && (
          <>
            <StatusButton
              id={reservation.id}
              target="confirmed"
              current={reservation.status}
              label="Confirmer"
            />
            {reservation.depositRequired && (
              <StatusButton
                id={reservation.id}
                target="deposit_paid"
                current={reservation.status}
                label="Acompte reçu"
              />
            )}
            <StatusButton
              id={reservation.id}
              target="cancelled"
              current={reservation.status}
              label="Annuler"
              danger
            />
          </>
        )}
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

function GroupDecisionControls({ reservation }: { reservation: Reservation }) {
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState<"approve" | "reject" | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  async function decide(approved: boolean) {
    setSaving(approved ? "approve" : "reject");
    setNotice("");
    setError("");
    try {
      const result = await decideGroupReservation(reservation.id, approved, message);
      setNotice(
        result.delivered
          ? `Demande ${approved ? "validée" : "refusée"} et email envoyé au client.`
          : `Demande ${approved ? "validée" : "refusée"}. L'email n'a pas pu être envoyé automatiquement.`,
      );
    } catch (decisionError) {
      setError(
        decisionError instanceof Error
          ? decisionError.message
          : "La décision n'a pas pu être enregistrée.",
      );
    } finally {
      setSaving(null);
    }
  }

  if (reservation.status !== "pending" && reservation.status !== "deposit_paid") {
    if (!notice && !reservation.decisionMessage) return null;
    return (
      <div className="mt-3 rounded-xl bg-secondary/45 px-3 py-2 text-xs text-muted-foreground">
        {notice || `Motif transmis au client : ${reservation.decisionMessage}`}
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-2xl border border-primary/25 bg-primary/5 p-4">
      <div className="font-medium">Décision de l'équipe</div>
      <p className="mt-1 text-xs text-muted-foreground">
        {reservation.depositPaid
          ? "L'acompte est reçu. Le client recevra automatiquement la décision par email."
          : "La demande reste bloquée jusqu'à la confirmation du paiement de l'acompte."}
      </p>
      <textarea
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        rows={2}
        placeholder="Motif du refus ou précision pour le client (facultatif)"
        className="mt-3 w-full resize-y rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
      />
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={saving !== null || !reservation.depositPaid}
          onClick={() => void decide(true)}
          className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {saving === "approve" ? "Validation…" : "Valider la demande"}
        </button>
        <button
          type="button"
          disabled={saving !== null}
          onClick={() => void decide(false)}
          className="rounded-full border border-destructive/35 px-4 py-2 text-sm text-destructive hover:bg-destructive/10 disabled:opacity-50"
        >
          {saving === "reject" ? "Refus…" : "Refuser la demande"}
        </button>
      </div>
      {notice && <p className="mt-3 text-xs text-sage">{notice}</p>}
      {error && <p className="mt-3 text-xs text-destructive">{error}</p>}
    </div>
  );
}

function WaiversPanel({
  documents,
  saveDocuments,
  replaceDocumentsLocal,
  signatures,
  saveSignatures,
  reservations,
}: {
  documents: ContentDocument[];
  saveDocuments: (next: ContentDocument[]) => void;
  replaceDocumentsLocal: (next: ContentDocument[]) => void;
  signatures: WaiverSignature[];
  saveSignatures: (next: WaiverSignature[]) => void;
  reservations: Reservation[];
}) {
  const waiver = getWaiverDocument(documents);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [uploading, setUploading] = useState(false);
  const [archiveView, setArchiveView] = useState<"reservation" | "date">("reservation");

  const filteredSignatures = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase("fr");
    return [...signatures]
      .filter((signature) => {
        if (!needle) return true;
        const reservation = reservations.find((item) => item.id === signature.reservationRef);
        return [
          signature.firstName,
          signature.lastName,
          signature.guardianFirstName,
          signature.guardianLastName,
          signature.reservationRef,
          reservation?.date,
          reservation?.slot,
        ]
          .filter(Boolean)
          .join(" ")
          .toLocaleLowerCase("fr")
          .includes(needle);
      })
      .sort((a, b) => b.signedAt.localeCompare(a.signedAt));
  }, [reservations, search, signatures]);

  const signatureGroups = useMemo(() => {
    const groups = new Map<
      string,
      { label: string; detail: string; signatures: WaiverSignature[] }
    >();

    filteredSignatures.forEach((signature) => {
      const reservation = reservations.find((item) => item.id === signature.reservationRef);
      const signedDate = signature.signedAt.slice(0, 10);
      const key =
        archiveView === "date"
          ? `date-${signedDate}`
          : reservation
            ? `reservation-${reservation.id}`
            : `walk-in-${signedDate}`;
      const label =
        archiveView === "date"
          ? new Date(`${signedDate}T12:00:00`).toLocaleDateString("fr-FR", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })
          : reservation
            ? `${reservation.firstName} ${reservation.lastName}`
            : "Sans réservation";
      const detail =
        archiveView === "date"
          ? "Signatures enregistrées ce jour"
          : reservation
            ? `${formatReservationDate(reservation.date)} à ${reservation.slot} · ${reservation.people} pers.`
            : `Signatures du ${new Date(`${signedDate}T12:00:00`).toLocaleDateString("fr-FR")}`;
      const current = groups.get(key) ?? { label, detail, signatures: [] };
      current.signatures.push(signature);
      groups.set(key, current);
    });

    return [...groups.entries()].map(([key, value]) => ({ key, ...value }));
  }, [archiveView, filteredSignatures, reservations]);

  const incompleteWaiverReservations = reservations.filter((reservation) => {
    if (reservation.status === "cancelled" || reservation.source === "walk_in") return false;
    const signedPeople = signatures.filter(
      (signature) => signature.reservationRef === reservation.id,
    ).length;
    return signedPeople < reservation.people;
  });

  function saveWaiver(patch: Partial<ContentDocument>) {
    const next = { ...waiver, ...patch, updatedAt: new Date().toISOString() };
    saveDocuments(
      documents.some((document) => document.id === "waiver")
        ? documents.map((document) => (document.id === "waiver" ? next : document))
        : [...documents, next],
    );
  }

  async function uploadWaiver(file?: File) {
    if (!file) return;
    setError("");
    setUploading(true);
    try {
      const stored = await storeDocumentFile("decharge", file, {
        generatePreviews: false,
        contentDocumentId: "waiver",
      });
      const next = {
        ...waiver,
        ...stored,
        version: `decharge-${new Date().toISOString().slice(0, 10)}`,
        updatedAt: new Date().toISOString(),
      };
      replaceDocumentsLocal(
        documents.some((document) => document.id === "waiver")
          ? documents.map((document) => (document.id === "waiver" ? next : document))
          : [...documents, next],
      );
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Import impossible.");
    } finally {
      setUploading(false);
    }
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
    <Panel title="Décharges" desc="Document, signature sur tablette et archives.">
      <div className="grid gap-5 lg:grid-cols-[1fr_0.72fr] lg:items-start">
        <div className="border border-border bg-background p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="font-display text-xl">Document à signer</h3>
              <p className="mt-1 max-w-xl text-sm text-muted-foreground">
                Ce fichier est la base affichée à la personne puis utilisée pour générer sa décharge
                signée.
              </p>
            </div>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-secondary">
              <UploadCloud className="h-4 w-4" /> {uploading ? "Import…" : "Remplacer"}
              <input
                type="file"
                accept="application/pdf,image/*"
                className="sr-only"
                disabled={uploading}
                onChange={async (event) => {
                  const input = event.currentTarget;
                  await uploadWaiver(input.files?.[0]);
                  input.value = "";
                }}
              />
            </label>
          </div>
          <DocumentPreview document={waiver} className="mt-4" compact />
          {error && <div className="mt-3 text-sm text-destructive">{error}</div>}
        </div>

        <div className="border border-primary/35 bg-secondary/50 p-5">
          <ClipboardSignature className="h-8 w-8 text-primary" />
          <h3 className="mt-4 font-display text-2xl">Faire signer la décharge</h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Ouvrez l'écran simplifié sur la tablette, liez éventuellement la réservation, puis
            laissez chaque personne lire, renseigner ses informations et signer.
          </p>
          <Link
            to="/decharge-signature"
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
          >
            <ClipboardSignature className="h-4 w-4" /> Ouvrir l'écran tablette
          </Link>
        </div>
      </div>

      {incompleteWaiverReservations.length > 0 && (
        <div className="mt-5 flex items-start gap-3 border-l-4 border-primary bg-secondary/45 p-4 text-sm">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div>
            <div className="font-medium">
              {incompleteWaiverReservations.length} réservation
              {incompleteWaiverReservations.length > 1 ? "s" : ""} avec des signatures à compléter
            </div>
            <div className="mt-2 grid gap-1 text-xs text-muted-foreground">
              {incompleteWaiverReservations.slice(0, 6).map((reservation) => {
                const signedPeople = signatures.filter(
                  (signature) => signature.reservationRef === reservation.id,
                ).length;
                return (
                  <div key={reservation.id}>
                    {reservation.firstName} {reservation.lastName} ·{" "}
                    {formatReservationDate(reservation.date)} · {signedPeople}/{reservation.people}{" "}
                    signature{reservation.people > 1 ? "s" : ""}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div className="mt-5 border border-border bg-background p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-xl">Décharges signées</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Retrouvez, recherchez et exportez chaque document signé.
            </p>
          </div>
          <div className="flex min-w-[230px] flex-1 flex-col gap-2 sm:max-w-xl sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Nom, date, heure, réservation…"
                className="h-10 w-full rounded-xl border border-input bg-card pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <select
              value={archiveView}
              onChange={(event) => setArchiveView(event.target.value as "reservation" | "date")}
              aria-label="Trier les décharges"
              className="h-10 rounded-xl border border-input bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="reservation">Par réservation</option>
              <option value="date">Par date</option>
            </select>
          </div>
        </div>
        <div className="mt-4 grid gap-2">
          {signatureGroups.length === 0 ? (
            <EmptyState text="Aucune signature enregistrée." />
          ) : (
            signatureGroups.map((group, index) => (
              <details
                key={group.key}
                className="group rounded-2xl border border-border bg-card"
                open={index === 0}
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3">
                  <span>
                    <span className="block text-sm font-medium capitalize">{group.label}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {group.detail} · {group.signatures.length} décharge
                      {group.signatures.length > 1 ? "s" : ""}
                    </span>
                  </span>
                  <ChevronDown className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180" />
                </summary>
                <div className="divide-y divide-border border-t border-border px-4">
                  {group.signatures.map((signature) => (
                    <div key={signature.id} className="py-3 text-sm">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-medium">
                            {signature.firstName} {signature.lastName}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(signature.signedAt).toLocaleString("fr-FR")} ·{" "}
                            {signature.documentVersion}
                          </div>
                          {signature.isMinor && (
                            <div className="mt-1 text-xs text-muted-foreground">
                              Signé par {signature.guardianFirstName} {signature.guardianLastName},
                              responsable légal
                            </div>
                          )}
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <InfoPill tone="success">Signé</InfoPill>
                          <button
                            onClick={() =>
                              downloadSignedWaiver(signature, waiver.body).catch(() =>
                                setError("Impossible de générer cette décharge pour le moment."),
                              )
                            }
                            className="grid h-8 w-8 place-items-center rounded-full border border-border text-muted-foreground hover:bg-secondary hover:text-foreground"
                            aria-label="Exporter la décharge signée"
                            title="Exporter la décharge signée"
                          >
                            <Download className="h-4 w-4" />
                          </button>
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
                  ))}
                </div>
              </details>
            ))
          )}
        </div>
      </div>
    </Panel>
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
  }

  async function uploadObjectImage(id: string, file?: File) {
    if (!file) return;
    const stored = await storeDocumentFile(`objets/${id}`, file);
    const imageDataUrl = stored.attachmentUrl || stored.attachmentDataUrl;
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
      desc="Catalogue informatif visible côté client : noms, catégories, prix, précisions et photos."
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
                      const input = event.currentTarget;
                      await uploadObjectImage(object.id, input.files?.[0]);
                      input.value = "";
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
              <span className="mb-1.5 block text-sm font-medium">Précision visible</span>
              <textarea
                value={object.note ?? ""}
                onChange={(event) => updateObject(object.id, { note: event.target.value })}
                rows={2}
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                placeholder="Dimensions, type de pièce, détail utile…"
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
    const stored = await storeDocumentFile(`creations/${id}`, file);
    const imageDataUrl = stored.attachmentUrl || stored.attachmentDataUrl;
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
                        const input = event.currentTarget;
                        await uploadCreationImage(creation.id, input.files?.[0]);
                        input.value = "";
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

async function hashImageFile(file: File) {
  if (!globalThis.crypto?.subtle) {
    return `${file.name}:${file.size}:${file.lastModified}`;
  }
  const digest = await globalThis.crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function PageImagesPanel({
  settings,
  saveSettings,
}: {
  settings: KafeSettings;
  saveSettings: (next: KafeSettings) => void;
}) {
  const [notice, setNotice] = useState("");
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const images = settings.pageImages?.length ? settings.pageImages : pageImagesSeed;
  const pages = ["Accueil", "Le Kafé", "Carte", "Carte cadeau"] as const;

  function saveImages(next: PageImageSetting[]) {
    saveSettings({ ...settings, pageImages: next });
  }

  function updateImage(id: PageImageSetting["id"], patch: Partial<PageImageSetting>) {
    saveImages(images.map((image) => (image.id === id ? { ...image, ...patch } : image)));
  }

  async function uploadPageImage(id: PageImageSetting["id"], file?: File) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setNotice("Choisissez un fichier image.");
      return;
    }

    setUploadingId(id);
    setNotice("");
    try {
      const imageHash = await hashImageFile(file);
      const duplicate = images.find((image) => image.id !== id && image.imageHash === imageHash);
      if (duplicate) {
        setNotice(
          `Cette photo est déjà utilisée dans « ${duplicate.page} - ${duplicate.label} ». Chaque emplacement doit garder une image différente.`,
        );
        return;
      }

      const current = images.find((image) => image.id === id);
      const stored = await storeDocumentFile(`pages/${id}`, file);
      const imageUrl = stored.attachmentUrl || stored.attachmentDataUrl;
      if (!imageUrl) throw new Error("Photo introuvable après l'import.");

      if (current?.imageUrl) {
        await deleteAdminFileByPublicUrl(current.imageUrl).catch(() => undefined);
      }
      updateImage(id, { imageUrl, imageName: file.name, imageHash });
      setNotice("Photo enregistrée. Elle est déjà utilisée sur la page correspondante.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Impossible d'enregistrer la photo.");
    } finally {
      setUploadingId(null);
    }
  }

  async function restoreImage(id: PageImageSetting["id"]) {
    const current = images.find((image) => image.id === id);
    const original = pageImagesSeed.find((image) => image.id === id);
    if (!original) return;
    if (current?.imageUrl) {
      await deleteAdminFileByPublicUrl(current.imageUrl).catch(() => undefined);
    }
    saveImages(images.map((image) => (image.id === id ? { ...original } : image)));
    setNotice("Photo d'origine rétablie.");
  }

  return (
    <Panel
      title="Images des pages"
      desc="Remplacez les photos fixes du site. Chaque emplacement utilise une image différente."
    >
      <div className="mb-5 rounded-2xl border border-border bg-secondary/35 p-4 text-sm leading-6 text-muted-foreground">
        Les photos des créations, des objets et du livre d'or se gèrent dans leurs rubriques. Ici,
        vous pilotez uniquement les images de présentation de l'accueil, du Kafé, de la carte et de
        la carte cadeau.
      </div>

      {notice && (
        <div className="mb-5 rounded-2xl border border-primary/25 bg-primary/10 p-4 text-sm">
          {notice}
        </div>
      )}

      <div className="space-y-7">
        {pages.map((page) => (
          <section key={page}>
            <h3 className="font-display text-2xl">{page}</h3>
            <div className="mt-3 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {images
                .filter((image) => image.page === page)
                .map((image) => {
                  const original = pageImagesSeed.find((item) => item.id === image.id);
                  const isOriginal = original?.imageUrl === image.imageUrl;
                  return (
                    <article
                      key={image.id}
                      className="overflow-hidden rounded-2xl border border-border bg-background"
                    >
                      <img
                        src={image.imageUrl}
                        alt={image.alt}
                        className="aspect-[4/3] w-full object-cover"
                      />
                      <div className="space-y-3 p-4">
                        <div>
                          <div className="font-medium">{image.label}</div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            {image.imageName ||
                              (isOriginal ? "Sélection Manika" : "Photo personnalisée")}
                          </div>
                        </div>
                        <Field
                          label="Description de l'image"
                          value={image.alt}
                          onChange={(alt) => updateImage(image.id, { alt })}
                        />
                        <div className="flex flex-wrap gap-2">
                          <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-primary px-3 py-2 text-xs font-medium text-primary-foreground">
                            <UploadCloud className="h-3.5 w-3.5" />
                            {uploadingId === image.id ? "Import..." : "Remplacer"}
                            <input
                              type="file"
                              accept="image/*"
                              disabled={uploadingId !== null}
                              className="sr-only"
                              onChange={async (event) => {
                                const input = event.currentTarget;
                                await uploadPageImage(image.id, input.files?.[0]);
                                input.value = "";
                              }}
                            />
                          </label>
                          {!isOriginal && (
                            <button
                              type="button"
                              onClick={() => void restoreImage(image.id)}
                              className="rounded-full border border-border px-3 py-2 text-xs hover:bg-secondary"
                            >
                              Rétablir l'originale
                            </button>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
            </div>
          </section>
        ))}
      </div>
    </Panel>
  );
}

function GuestbookPanel({
  entries,
  saveEntries,
  settings,
  saveSettings,
}: {
  entries: GuestbookEntry[];
  saveEntries: (next: GuestbookEntry[]) => void;
  settings: KafeSettings;
  saveSettings: (next: KafeSettings) => void;
}) {
  const [draft, setDraft] = useState({ author: "", message: "", rating: 5 });
  const [draftImage, setDraftImage] = useState<File | null>(null);
  const [draftImagePreview, setDraftImagePreview] = useState("");
  const [uploadingImageId, setUploadingImageId] = useState("");
  const [imageError, setImageError] = useState("");

  useEffect(() => {
    if (!draftImage) {
      setDraftImagePreview("");
      return;
    }
    const previewUrl = URL.createObjectURL(draftImage);
    setDraftImagePreview(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [draftImage]);

  function updateEntry(id: string, patch: Partial<GuestbookEntry>) {
    saveEntries(entries.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)));
  }

  async function storeGuestbookImage(id: string, file: File) {
    const error = guestbookImageError(file);
    if (error) throw new Error(error);
    const stored = await storeDocumentFile(`livre-dor/${id}`, file);
    return (
      stored.previewImageUrls?.[0] ??
      stored.previewImageDataUrls?.[0] ??
      stored.attachmentUrl ??
      stored.attachmentDataUrl ??
      ""
    );
  }

  async function updateEntryImage(id: string, file?: File) {
    if (!file) return;
    setImageError("");
    setUploadingImageId(id);
    try {
      const imageUrl = await storeGuestbookImage(id, file);
      const previousImageUrl = entries.find((entry) => entry.id === id)?.imageUrl;
      updateEntry(id, { imageUrl });
      if (previousImageUrl && previousImageUrl !== imageUrl) {
        await deleteAdminFileByPublicUrl(previousImageUrl).catch(() => undefined);
      }
    } catch (error) {
      setImageError(error instanceof Error ? error.message : "La photo n'a pas pu être importée.");
    } finally {
      setUploadingImageId("");
    }
  }

  async function removeEntryImage(entry: GuestbookEntry) {
    if (entry.imageUrl) await deleteAdminFileByPublicUrl(entry.imageUrl).catch(() => undefined);
    updateEntry(entry.id, { imageUrl: undefined });
  }

  async function deleteGuestbookEntry(entry: GuestbookEntry) {
    if (entry.imageUrl) await deleteAdminFileByPublicUrl(entry.imageUrl).catch(() => undefined);
    saveEntries(entries.filter((item) => item.id !== entry.id));
  }

  async function addGoogleReview() {
    if (draft.author.trim().length < 2 || draft.message.trim().length < 4) return;
    const id = `guest-google-${Date.now()}`;
    setImageError("");
    setUploadingImageId(id);
    let imageUrl = "";
    try {
      if (draftImage) imageUrl = await storeGuestbookImage(id, draftImage);
    } catch (error) {
      setImageError(error instanceof Error ? error.message : "La photo n'a pas pu être importée.");
      setUploadingImageId("");
      return;
    }
    saveEntries([
      {
        id,
        author: draft.author.trim(),
        message: draft.message.trim(),
        rating: draft.rating,
        status: "published",
        source: "google",
        sourceUrl: settings.googleReviewUrl,
        imageUrl: imageUrl || undefined,
        createdAt: new Date().toISOString(),
      },
      ...entries,
    ]);
    setDraft({ author: "", message: "", rating: 5 });
    setDraftImage(null);
    setUploadingImageId("");
  }

  const pending = entries.filter((entry) => entry.status === "pending");
  const others = entries.filter((entry) => entry.status !== "pending");

  return (
    <Panel
      title="Livre d'or"
      desc="Validez les messages reçus, ajoutez certains avis Google et téléchargez le QR code à poser au Kafé."
    >
      <div className="grid gap-4 lg:grid-cols-[1fr_270px]">
        <div className="rounded-2xl border border-border bg-background p-4">
          <div className="flex items-center gap-2">
            <MessageSquareHeart className="h-5 w-5 text-primary" />
            <h3 className="font-display text-xl">Réglages publics</h3>
          </div>
          <div className="mt-4 grid gap-3">
            <ToggleRow
              label="Afficher le livre d'or"
              checked={settings.guestbookEnabled}
              onChange={(guestbookEnabled) => saveSettings({ ...settings, guestbookEnabled })}
            />
            <Field
              label="Lien direct pour laisser un avis Google"
              value={settings.googleReviewUrl}
              onChange={(googleReviewUrl) => saveSettings({ ...settings, googleReviewUrl })}
            />
            <Link
              to="/livre-dor"
              className="inline-flex w-fit rounded-full border border-border px-4 py-2 text-sm hover:bg-secondary"
            >
              Voir la page publique
            </Link>
          </div>
        </div>

        <AdminQrCodeCard
          title="QR code du livre d'or"
          description="À poser près de la sortie ou de la caisse."
          path="/livre-dor"
          filename="qr-code-livre-dor-kafe-ceramik.png"
        />
      </div>

      {imageError && (
        <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {imageError}
        </div>
      )}

      <div className="mt-6">
        <h3 className="font-display text-xl">
          Messages à valider {pending.length > 0 && `(${pending.length})`}
        </h3>
        <div className="mt-3 grid gap-3">
          {pending.length === 0 && <EmptyState text="Aucun message en attente." />}
          {pending.map((entry) => (
            <GuestbookAdminCard
              key={entry.id}
              entry={entry}
              onPublish={() => updateEntry(entry.id, { status: "published" })}
              onHide={() => updateEntry(entry.id, { status: "hidden" })}
              onDelete={() => void deleteGuestbookEntry(entry)}
              onImageChange={(file) => void updateEntryImage(entry.id, file)}
              onRemoveImage={() => void removeEntryImage(entry)}
              uploadingImage={uploadingImageId === entry.id}
            />
          ))}
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-background p-4">
        <h3 className="font-display text-xl">Ajouter un avis Google sélectionné</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Recopiez uniquement les avis que vous souhaitez mettre en avant.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Field
            label="Auteur"
            value={draft.author}
            onChange={(author) => setDraft({ ...draft, author })}
          />
          <NumberField
            label="Note"
            value={draft.rating}
            suffix="/ 5"
            onChange={(rating) => setDraft({ ...draft, rating: Math.max(1, Math.min(5, rating)) })}
          />
        </div>
        <TextareaField
          label="Avis"
          value={draft.message}
          onChange={(message) => setDraft({ ...draft, message })}
        />
        <div className="mt-3 rounded-xl border border-dashed border-border p-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-medium">Photo associée</div>
              <p className="text-xs text-muted-foreground">
                Facultative · JPG, PNG ou WebP · 5 Mo max.
              </p>
            </div>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm hover:bg-secondary">
              <ImageIcon className="h-4 w-4" /> Choisir
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={(event) => {
                  const file = event.currentTarget.files?.[0] ?? null;
                  const error = file ? guestbookImageError(file) : "";
                  setImageError(error);
                  setDraftImage(error ? null : file);
                }}
              />
            </label>
          </div>
          {draftImagePreview && (
            <div className="relative mt-3 w-full max-w-sm overflow-hidden rounded-xl border border-border">
              <img
                src={draftImagePreview}
                alt="Aperçu de l'avis"
                className="aspect-[4/3] w-full object-cover"
              />
              <button
                type="button"
                onClick={() => setDraftImage(null)}
                className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full border border-border bg-background"
                aria-label="Retirer la photo"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => void addGoogleReview()}
          disabled={Boolean(uploadingImageId)}
          className="mt-3 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground"
        >
          <Plus className="h-4 w-4" />
          {uploadingImageId ? "Import en cours..." : "Ajouter l'avis"}
        </button>
      </div>

      <div className="mt-6">
        <h3 className="font-display text-xl">Messages traités</h3>
        <div className="mt-3 grid gap-3">
          {others.length === 0 && <EmptyState text="Aucun message traité pour le moment." />}
          {others.map((entry) => (
            <GuestbookAdminCard
              key={entry.id}
              entry={entry}
              onPublish={() => updateEntry(entry.id, { status: "published" })}
              onHide={() => updateEntry(entry.id, { status: "hidden" })}
              onDelete={() => void deleteGuestbookEntry(entry)}
              onImageChange={(file) => void updateEntryImage(entry.id, file)}
              onRemoveImage={() => void removeEntryImage(entry)}
              uploadingImage={uploadingImageId === entry.id}
            />
          ))}
        </div>
      </div>
    </Panel>
  );
}

function guestbookImageError(file: File) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    return "Choisissez une image JPG, PNG ou WebP.";
  }
  if (file.size > 5 * 1024 * 1024) return "La photo doit peser moins de 5 Mo.";
  return "";
}

function AdminQrCodeCard({
  title,
  description,
  path,
  filename,
}: {
  title: string;
  description: string;
  path: string;
  filename: string;
}) {
  const [qrDataUrl, setQrDataUrl] = useState("");
  const targetUrl =
    typeof window === "undefined"
      ? `https://kafeceramik.fr${path}`
      : `${window.location.origin}${path}`;

  useEffect(() => {
    QRCode.toDataURL(targetUrl, {
      width: 720,
      margin: 2,
      color: { dark: "#301c1a", light: "#fff8ef" },
      errorCorrectionLevel: "H",
    })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(""));
  }, [targetUrl]);

  return (
    <div className="rounded-2xl border border-border bg-[#fff8ef] p-4 text-center">
      <QrCode className="mx-auto h-5 w-5 text-primary" />
      <h3 className="mt-2 font-display text-xl">{title}</h3>
      <p className="mx-auto mt-1 max-w-xs text-xs leading-5 text-muted-foreground">{description}</p>
      {qrDataUrl && (
        <img
          src={qrDataUrl}
          alt={title}
          className="mx-auto mt-3 aspect-square w-44 rounded-xl bg-white p-2"
        />
      )}
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        {qrDataUrl && (
          <a
            href={qrDataUrl}
            download={filename}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground"
          >
            <Download className="h-3.5 w-3.5" /> Télécharger
          </a>
        )}
        <a
          href={targetUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center rounded-full border border-border bg-background px-4 py-2 text-xs hover:bg-secondary"
        >
          Ouvrir
        </a>
      </div>
    </div>
  );
}

function GuestbookAdminCard({
  entry,
  onPublish,
  onHide,
  onDelete,
  onImageChange,
  onRemoveImage,
  uploadingImage,
}: {
  entry: GuestbookEntry;
  onPublish: () => void;
  onHide: () => void;
  onDelete: () => void;
  onImageChange: (file: File) => void;
  onRemoveImage: () => void;
  uploadingImage: boolean;
}) {
  return (
    <article className="rounded-2xl border border-border bg-background p-4">
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_170px]">
        <div>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="font-medium">{entry.author}</div>
              <div className="mt-1 text-xs text-muted-foreground">
                {entry.rating}/5 · {entry.source === "google" ? "Google" : "Livre d'or"} ·{" "}
                {new Date(entry.createdAt).toLocaleDateString("fr-FR")}
              </div>
            </div>
            <InfoPill tone={entry.status === "published" ? "success" : undefined}>
              {entry.status === "published"
                ? "Publié"
                : entry.status === "pending"
                  ? "À valider"
                  : "Masqué"}
            </InfoPill>
          </div>
          <p className="mt-3 text-sm leading-6">{entry.message}</p>
        </div>
        <div className="overflow-hidden rounded-xl border border-border bg-secondary/30">
          {entry.imageUrl ? (
            <img
              src={entry.imageUrl}
              alt={`Souvenir de ${entry.author}`}
              className="aspect-[4/3] w-full object-cover"
            />
          ) : (
            <div className="grid aspect-[4/3] place-items-center text-muted-foreground">
              <ImageIcon className="h-8 w-8" />
            </div>
          )}
          <div className="flex flex-wrap gap-1.5 p-2">
            <label className="cursor-pointer rounded-full border border-border bg-background px-2.5 py-1 text-[11px] hover:bg-secondary">
              {uploadingImage ? "Import..." : entry.imageUrl ? "Remplacer" : "Ajouter"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                disabled={uploadingImage}
                onChange={(event) => {
                  const file = event.currentTarget.files?.[0];
                  if (file) onImageChange(file);
                }}
              />
            </label>
            {entry.imageUrl && (
              <button
                type="button"
                onClick={onRemoveImage}
                className="rounded-full border border-border bg-background px-2.5 py-1 text-[11px] hover:bg-secondary"
              >
                Retirer
              </button>
            )}
          </div>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {entry.status !== "published" && (
          <button
            type="button"
            onClick={onPublish}
            className="rounded-full bg-primary px-3 py-1.5 text-xs text-primary-foreground"
          >
            Publier
          </button>
        )}
        {entry.status !== "hidden" && (
          <button
            type="button"
            onClick={onHide}
            className="rounded-full border border-border px-3 py-1.5 text-xs hover:bg-secondary"
          >
            Masquer
          </button>
        )}
        <button
          type="button"
          onClick={onDelete}
          className="rounded-full border border-destructive/30 px-3 py-1.5 text-xs text-destructive hover:bg-destructive/10"
        >
          Supprimer
        </button>
      </div>
    </article>
  );
}

function GiftCardsPanel({
  settings,
  saveSettings,
}: {
  settings: KafeSettings;
  saveSettings: (next: KafeSettings) => void;
}) {
  const { orders, loading, refresh } = useAdminGiftCardOrders();
  const [resendingId, setResendingId] = useState("");

  function update(patch: Partial<KafeSettings>) {
    saveSettings({ ...settings, ...patch });
  }

  function updateOption(id: string, patch: Partial<GiftCardOption>) {
    update({
      giftCardOptions: settings.giftCardOptions.map((option) =>
        option.id === id ? { ...option, ...patch } : option,
      ),
    });
  }

  function addOption() {
    update({
      giftCardOptions: [
        ...settings.giftCardOptions,
        {
          id: `gift-${Date.now()}`,
          title: "Nouvelle suggestion",
          amount: 30,
          description: "Décrivez ce que ce budget permet d'imaginer au Kafé.",
          visible: true,
          visual: "rose",
        },
      ],
    });
  }

  return (
    <Panel
      title="Cartes cadeaux"
      desc="Configurez l'offre publique et retrouvez les cartes achetées après leur paiement SumUp."
    >
      <div className="grid gap-4 md:grid-cols-2">
        <Field
          label="Email de contact affiché si le paiement est indisponible"
          value={settings.giftCardContactEmail}
          onChange={(giftCardContactEmail) => update({ giftCardContactEmail })}
        />
        <NumberField
          label="Durée de validité"
          value={settings.giftCardValidityMonths}
          suffix="mois"
          onChange={(giftCardValidityMonths) =>
            update({ giftCardValidityMonths: Math.max(1, giftCardValidityMonths) })
          }
        />
        <ToggleRow
          label="Proposer un montant libre"
          checked={settings.giftCardCustomEnabled}
          onChange={(giftCardCustomEnabled) => update({ giftCardCustomEnabled })}
        />
        <NumberField
          label="Montant libre minimum"
          value={settings.giftCardCustomMin}
          suffix="EUR"
          onChange={(giftCardCustomMin) =>
            update({ giftCardCustomMin: Math.max(1, giftCardCustomMin) })
          }
        />
        <ToggleRow
          label="Activer le paiement SumUp et l'envoi automatique du PDF"
          checked={settings.giftCardPaymentsEnabled}
          onChange={(giftCardPaymentsEnabled) => update({ giftCardPaymentsEnabled })}
        />
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
        <div>
          <h3 className="font-display text-xl">Suggestions proposées</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Les exemples restent indicatifs : le montant est utilisable librement au Kafé.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/cadeau"
            className="rounded-full border border-border bg-background px-4 py-2 text-sm hover:bg-secondary"
          >
            Voir la page
          </Link>
          <button
            type="button"
            onClick={addOption}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground"
          >
            <Plus className="h-4 w-4" /> Ajouter
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {settings.giftCardOptions.map((option) => (
          <div key={option.id} className="rounded-2xl border border-border bg-background p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                label="Nom de la formule"
                value={option.title}
                onChange={(title) => updateOption(option.id, { title })}
              />
              <NumberField
                label="Montant"
                value={option.amount}
                suffix="EUR"
                onChange={(amount) => updateOption(option.id, { amount })}
              />
            </div>
            <TextareaField
              label="Ce que ce budget permet"
              value={option.description}
              onChange={(description) => updateOption(option.id, { description })}
            />
            <div className="mt-3">
              <label>
                <span className="mb-1.5 block text-sm font-medium">Visuel par défaut</span>
                <select
                  value={option.visual}
                  onChange={(event) =>
                    updateOption(option.id, {
                      visual: event.target.value as GiftCardOption["visual"],
                    })
                  }
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="rose">Rose Kafé</option>
                  <option value="tropical">Tropical</option>
                  <option value="confetti">Fête colorée</option>
                </select>
              </label>
            </div>
            <div className="mt-4 flex items-center justify-between gap-3">
              <ToggleRow
                label="Visible"
                checked={option.visible}
                onChange={(visible) => updateOption(option.id, { visible })}
              />
              <button
                type="button"
                onClick={() =>
                  update({
                    giftCardOptions: settings.giftCardOptions.filter(
                      (item) => item.id !== option.id,
                    ),
                  })
                }
                className="grid h-10 w-10 place-items-center rounded-full border border-destructive/30 text-destructive hover:bg-destructive/10"
                title="Supprimer"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 border-t border-border pt-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-xl">Cartes achetées</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Le code, la validité et l'envoi du PDF sont enregistrés après paiement.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void refresh()}
            className="rounded-full border border-border bg-background px-4 py-2 text-sm hover:bg-secondary"
          >
            Actualiser
          </button>
        </div>

        <div className="mt-4 grid gap-3">
          {loading && <EmptyState text="Chargement des cartes cadeaux..." />}
          {!loading && orders.length === 0 && (
            <EmptyState text="Aucune carte cadeau achetée pour le moment." />
          )}
          {orders.map((order) => (
            <GiftCardOrderCard
              key={order.id}
              order={order}
              resending={resendingId === order.id}
              onResend={async () => {
                setResendingId(order.id);
                try {
                  await resendGiftCardPdf(order.id);
                  await refresh();
                } finally {
                  setResendingId("");
                }
              }}
            />
          ))}
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-mustard/40 bg-mustard/10 p-4 text-sm leading-6">
        N'activez le paiement qu'après le test du compte SumUp du Kafé. Une fois activé, chaque
        paiement génère une carte personnalisée valable {settings.giftCardValidityMonths} mois et
        l'envoie automatiquement par email.
      </div>
    </Panel>
  );
}

function GiftCardOrderCard({
  order,
  resending,
  onResend,
}: {
  order: GiftCardOrder;
  resending: boolean;
  onResend: () => Promise<void>;
}) {
  const labels: Record<GiftCardOrder["status"], string> = {
    pending: "Paiement en attente",
    paid: "Payée",
    failed: "Échec du paiement",
    expired: "Paiement expiré",
  };
  return (
    <article className="rounded-2xl border border-border bg-background p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="font-medium">
            {order.code} · {order.amount} €
          </div>
          <div className="mt-1 text-sm text-muted-foreground">
            Pour {order.recipientName} · {order.recipientEmail}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            Achetée le {new Date(order.createdAt).toLocaleDateString("fr-FR")}
            {order.expiresAt &&
              ` · valable jusqu'au ${new Date(order.expiresAt).toLocaleDateString("fr-FR")}`}
          </div>
        </div>
        <InfoPill tone={order.status === "paid" ? "success" : undefined}>
          {labels[order.status]}
        </InfoPill>
      </div>
      {order.status === "paid" && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs text-muted-foreground">
            {order.pdfEmailSentAt ? "PDF envoyé" : "PDF à envoyer"}
          </span>
          <button
            type="button"
            disabled={resending}
            onClick={() => void onResend()}
            className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-2 text-xs hover:bg-secondary disabled:opacity-45"
          >
            <Mail className="h-3.5 w-3.5" /> {resending ? "Envoi..." : "Renvoyer le PDF"}
          </button>
        </div>
      )}
    </article>
  );
}

function DocumentsPanel({
  documents,
  saveDocuments,
  replaceDocumentsLocal,
}: {
  documents: ContentDocument[];
  saveDocuments: (next: ContentDocument[]) => Promise<boolean>;
  replaceDocumentsLocal: (next: ContentDocument[]) => void;
}) {
  const guide = getGuideDocument(documents);
  const menu = getMenuDocument(documents);

  async function saveDocument(nextDocument: ContentDocument) {
    const exists = documents.some((document) => document.id === nextDocument.id);
    const saved = await saveDocuments(
      exists
        ? documents.map((document) => (document.id === nextDocument.id ? nextDocument : document))
        : [...documents, nextDocument],
    );
    if (!saved) {
      throw new Error(
        "Le fichier a été envoyé, mais sa publication n'a pas pu être enregistrée. Réessayez.",
      );
    }
  }

  function updateDocument(patch: Partial<ContentDocument>) {
    return saveDocument({ ...guide, ...patch, updatedAt: new Date().toISOString() });
  }

  function updateMenu(patch: Partial<ContentDocument>) {
    return saveDocument({ ...menu, ...patch, updatedAt: new Date().toISOString() });
  }

  async function updateResource(resource: ContentResource, file?: File) {
    if (!file) {
      await updateDocument({
        resources: (guide.resources ?? []).map((item) =>
          item.id === resource.id ? resource : item,
        ),
      });
      return;
    }

    const stored = await storeDocumentFile(`guide/${resource.id}`, file, {
      generatePreviews: false,
      contentDocumentId: "guide",
      contentResourceId: resource.id,
    });
    const nextDocument = {
      ...guide,
      updatedAt: new Date().toISOString(),
      resources: (guide.resources ?? []).map((item) =>
        item.id === resource.id ? { ...resource, ...stored } : item,
      ),
    };
    replaceDocumentsLocal(
      documents.map((document) => (document.id === guide.id ? nextDocument : document)),
    );
  }

  async function updateMenuResource(resource: ContentResource, file?: File) {
    if (!file) {
      await updateMenu({
        resources: (menu.resources ?? []).map((item) =>
          item.id === resource.id ? resource : item,
        ),
      });
      return;
    }

    const stored = await storeDocumentFile(`menu/${resource.id}`, file, {
      generatePreviews: false,
      contentDocumentId: "menu",
      contentResourceId: resource.id,
    });
    const nextDocument = {
      ...menu,
      updatedAt: new Date().toISOString(),
      resources: (menu.resources ?? []).map((item) =>
        item.id === resource.id ? { ...resource, ...stored } : item,
      ),
    };
    replaceDocumentsLocal(
      documents.map((document) => (document.id === menu.id ? nextDocument : document)),
    );
  }

  const groups: {
    category: ContentResource["category"];
    title: string;
    description: string;
  }[] = [
    {
      category: "guide",
      title: "1. Guide complet",
      description: "Le guide principal affiché sur la page publique.",
    },
    {
      category: "nuancier",
      title: "2. Nuanciers",
      description: "Les deux supports de couleurs et leurs gestes propres.",
    },
    {
      category: "prevention",
      title: "3. Préventions",
      description: "Le dosage de la peinture et la casse de la céramique brute.",
    },
  ];

  return (
    <Panel title="Guide et carte" desc="Importez et mettez à jour les PDF visibles sur le site.">
      <div className="mb-5 rounded-[1.75rem] border border-border bg-background p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <div>
              <h3 className="font-display text-xl">Carte du Kafé</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Importez ici le PDF exporté depuis Canva.
              </p>
            </div>
          </div>
          <Link
            to="/carte"
            className="rounded-full border border-border bg-card px-4 py-2 text-sm hover:bg-secondary"
          >
            Voir la carte
          </Link>
        </div>
        <ResourceAdminList
          resources={(menu.resources ?? []).filter((resource) => resource.category === "menu")}
          onChange={updateMenuResource}
        />
      </div>

      <div className="rounded-[1.75rem] border border-border bg-background p-4">
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

        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_270px]">
          <div>
            <div className="grid gap-3 md:grid-cols-2">
              <Field
                label="Titre"
                value={guide.title}
                onChange={(value) => updateDocument({ title: value })}
              />
              <Field
                label="Nom de la version"
                value={guide.version}
                onChange={(value) => updateDocument({ version: value })}
              />
            </div>
            <TextareaField
              label="Introduction"
              value={guide.intro ?? ""}
              onChange={(value) => updateDocument({ intro: value })}
            />
          </div>
          <AdminQrCodeCard
            title="QR code du guide"
            description="À télécharger puis imprimer pour les tables et la tablette du Kafé."
            path="/guide"
            filename="qr-code-guide-kafe-ceramik.png"
          />
        </div>

        <div className="mt-7">
          {groups.map((group) => (
            <section
              key={group.category}
              className="border-t border-border py-6 first:border-t-0 first:pt-0"
            >
              <h4 className="font-display text-xl">{group.title}</h4>
              <p className="mt-1 text-sm text-muted-foreground">{group.description}</p>
              <ResourceAdminList
                resources={(guide.resources ?? []).filter(
                  (resource) => resource.category === group.category,
                )}
                onChange={updateResource}
              />
            </section>
          ))}
        </div>

        <div className="mt-3 text-xs text-muted-foreground">
          Dernière modification : {new Date(guide.updatedAt).toLocaleString("fr-FR")}
        </div>
      </div>
    </Panel>
  );
}

function ResourceAdminList({
  resources,
  onChange,
  onReorder,
  compact,
}: {
  resources: ContentResource[];
  onChange: (resource: ContentResource, file?: File) => void | Promise<void>;
  onReorder?: (resources: ContentResource[]) => void;
  compact?: boolean;
}) {
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [uploadFeedback, setUploadFeedback] = useState<{
    id: string;
    type: "success" | "error";
    message: string;
  } | null>(null);

  async function importResource(resource: ContentResource, file?: File) {
    if (!file) return;
    setUploadingId(resource.id);
    setUploadFeedback(null);
    try {
      await onChange(resource, file);
      setUploadFeedback({
        id: resource.id,
        type: "success",
        message: `${file.name} a bien été importé et publié.`,
      });
    } catch (error) {
      setUploadFeedback({
        id: resource.id,
        type: "error",
        message: error instanceof Error ? error.message : "Import impossible. Réessayez.",
      });
    } finally {
      setUploadingId(null);
    }
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (!onReorder || target < 0 || target >= resources.length) return;
    const next = [...resources];
    [next[index], next[target]] = [next[target], next[index]];
    onReorder(next);
  }

  return (
    <div className="mt-4 grid gap-3">
      {resources.map((resource, index) => {
        const previews = resource.previewImageDataUrls?.length
          ? resource.previewImageDataUrls
          : (resource.previewImageUrls ?? []);
        return (
          <div key={resource.id} className="rounded-2xl border border-border bg-card p-3">
            <div className={`grid gap-3 ${compact ? "" : "md:grid-cols-[140px_1fr]"}`}>
              {previews[0] ? (
                <img
                  src={previews[0]}
                  alt={resource.title}
                  className={`w-full rounded-xl border border-border bg-white object-contain ${
                    compact ? "max-h-40" : "h-36"
                  }`}
                />
              ) : (
                <div className="grid h-28 place-items-center rounded-xl border border-border bg-secondary/40">
                  <FileText className="h-7 w-7 text-muted-foreground" />
                </div>
              )}
              <div className="grid gap-2">
                <Field
                  label="Titre"
                  value={resource.title}
                  onChange={(title) => onChange({ ...resource, title })}
                />
                {!compact && (
                  <TextareaField
                    label="Description"
                    value={resource.description}
                    onChange={(description) => onChange({ ...resource, description })}
                  />
                )}
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <label
                  className={`inline-flex min-h-11 items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm font-medium ${
                    uploadingId ? "cursor-wait opacity-60" : "cursor-pointer hover:bg-secondary"
                  }`}
                >
                  <UploadCloud className="h-4 w-4" />
                  {uploadingId === resource.id ? "Import en cours..." : "Remplacer le document"}
                  <input
                    type="file"
                    accept="application/pdf,image/*"
                    className="sr-only"
                    disabled={uploadingId !== null}
                    onChange={async (event) => {
                      const input = event.currentTarget;
                      await importResource(resource, input.files?.[0]);
                      input.value = "";
                    }}
                  />
                </label>
                {onReorder && (
                  <>
                    <button
                      type="button"
                      onClick={() => move(index, -1)}
                      disabled={index === 0}
                      className="grid h-8 w-8 place-items-center border border-border disabled:opacity-30"
                      title="Monter"
                    >
                      <ChevronUp className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => move(index, 1)}
                      disabled={index === resources.length - 1}
                      className="grid h-8 w-8 place-items-center border border-border disabled:opacity-30"
                      title="Descendre"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </button>
                  </>
                )}
              </div>
              <ToggleRow
                label="Visible"
                checked={resource.visible}
                onChange={(visible) => onChange({ ...resource, visible })}
              />
            </div>
            {uploadFeedback?.id === resource.id && (
              <div
                role="status"
                aria-live="polite"
                className={`mt-3 flex items-start gap-2 rounded-xl border px-3 py-2 text-sm ${
                  uploadFeedback.type === "success"
                    ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                    : "border-red-300 bg-red-50 text-red-900"
                }`}
              >
                {uploadFeedback.type === "success" ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                ) : (
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                )}
                <span>{uploadFeedback.message}</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
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
  const attachment = item?.attachmentDataUrl || item?.attachmentUrl;
  const previews = item?.previewImageDataUrls?.length
    ? item.previewImageDataUrls
    : (item?.previewImageUrls ?? []);
  const hasAttachment = Boolean(attachment);

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
            href={attachment}
            download={item?.attachmentName}
            className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-3 py-1 text-xs hover:bg-secondary"
          >
            <Download className="h-3.5 w-3.5" /> Ouvrir
          </a>
        )}
      </div>

      {previews.length > 0 && (
        <div className="mt-3 grid gap-2">
          {previews.map((preview, index) => (
            <img
              key={`${previewTitle}-${index}`}
              src={preview}
              alt={`${previewTitle}${previews.length > 1 ? ` - page ${index + 1}` : ""}`}
              className={`w-full border border-border bg-white object-contain ${
                compact ? "max-h-52" : "max-h-[34rem]"
              }`}
            />
          ))}
        </div>
      )}

      {hasAttachment && previews.length === 0 && (
        <div className="mt-3 flex items-center gap-3 rounded-lg border border-border bg-background p-3">
          <FileText className="h-5 w-5 text-primary" />
          <div>
            <div className="font-medium">Document importé</div>
            <div className="text-xs text-muted-foreground">
              Le fichier est bien lié à cette version. Ouvrez-le pour le consulter.
            </div>
          </div>
        </div>
      )}

      {!hasAttachment && (
        <p className={`mt-2 text-muted-foreground ${compact ? "line-clamp-3" : ""}`}>
          {item?.body ?? "Le document sera ajouté par l'équipe."}
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

  function updateSeatingAreas(seatingAreas: SeatingArea[]) {
    const defaultCapacity = seatingAreas.reduce(
      (total, area) => total + Math.max(0, area.capacity) * Math.max(0, area.quantity),
      0,
    );
    update({ seatingAreas, defaultCapacity });
  }

  return (
    <Panel title="Réglages" desc="Horaires, capacité, réservation et informations du Kafé.">
      <div
        className={`rounded-2xl border p-4 ${
          settings.reservationsEnabled
            ? "border-sage/35 bg-sage/10"
            : "border-destructive/35 bg-destructive/10"
        }`}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-background text-primary">
              <CalendarOff className="h-5 w-5" />
            </span>
            <div>
              <h3 className="font-display text-xl">Ouverture des réservations</h3>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                Fermez temporairement le parcours public sans bloquer les réservations déjà
                enregistrées ni les ajouts sur place depuis l'administration.
              </p>
            </div>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              settings.reservationsEnabled
                ? "bg-sage/20 text-foreground"
                : "bg-destructive text-destructive-foreground"
            }`}
          >
            {settings.reservationsEnabled ? "Réservations ouvertes" : "Réservations en pause"}
          </span>
        </div>

        <div className="mt-4 grid gap-4">
          <ToggleRow
            label="Autoriser les réservations en ligne"
            checked={settings.reservationsEnabled}
            onChange={(reservationsEnabled) => update({ reservationsEnabled })}
          />
          <TextareaField
            label="Message affiché pendant la fermeture (facultatif)"
            value={settings.reservationPauseMessage}
            onChange={(reservationPauseMessage) => update({ reservationPauseMessage })}
          />
        </div>
      </div>

      <div className="mt-5 grid gap-5">
        <SettingsSection
          title="Règles de réservation"
          description="Ces valeurs déterminent les créneaux proposés et les conditions appliquées aux clients."
          icon={CalendarDays}
        >
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <NumberField
              label="Groupe avec acompte et validation à partir de"
              value={settings.depositThreshold}
              suffix="personnes"
              onChange={(value) =>
                update({ depositThreshold: value, manualConfirmationThreshold: value })
              }
            />
            <NumberField
              label="Acompte fixe par groupe"
              value={settings.depositFixedAmount}
              suffix="EUR"
              onChange={(value) => update({ depositFixedAmount: value })}
            />
            <NumberField
              label="Durée minimale d'un créneau"
              value={settings.slotDurationMinutes}
              suffix="minutes"
              onChange={(value) => update({ slotDurationMinutes: value })}
            />
            <IntervalField
              value={settings.slotIntervalMinutes}
              onChange={(slotIntervalMinutes) => update({ slotIntervalMinutes })}
            />
            <NumberField
              label="Durée maximale sur place"
              value={settings.maximumVisitHours}
              suffix="heures"
              onChange={(maximumVisitHours) => update({ maximumVisitHours })}
            />
            <TimeField
              label="Fermeture de la cuisine"
              value={settings.kitchenClosingTime}
              onChange={(kitchenClosingTime) => update({ kitchenClosingTime })}
            />
            <TimeField
              label="Heure limite pour réserver le lendemain"
              value={settings.bookingCutoffTime}
              onChange={(bookingCutoffTime) => update({ bookingCutoffTime })}
            />
            <NumberField
              label="Réservation libérée après une absence de"
              value={settings.lateArrivalGraceMinutes}
              suffix="minutes"
              onChange={(lateArrivalGraceMinutes) => update({ lateArrivalGraceMinutes })}
            />
            <NumberField
              label="Annulation en ligne jusqu'à"
              value={settings.cancellationNoticeHours}
              suffix="heures avant"
              onChange={(cancellationNoticeHours) => update({ cancellationNoticeHours })}
            />
            <NumberField
              label="Acompte conservé si annulation à moins de"
              value={settings.groupDepositForfeitHours}
              suffix="heures avant"
              onChange={(groupDepositForfeitHours) => update({ groupDepositForfeitHours })}
            />
          </div>
        </SettingsSection>

        <SettingsSection
          title="Planning et capacité"
          description="Gérez les jours ouverts, les horaires proposés et les espaces disponibles."
          icon={Clock3}
        >
          <div className="grid gap-4">
            <ScheduleRulesEditor
              rules={settings.scheduleRules ?? []}
              onChange={(scheduleRules) => update({ scheduleRules })}
            />
            <SeatingAreasEditor areas={settings.seatingAreas ?? []} onChange={updateSeatingAreas} />
          </div>
        </SettingsSection>

        <SettingsSection
          title="Informations affichées aux clients"
          description="Modifiez les consignes visibles pendant la réservation et sur le site."
          icon={FileText}
        >
          <div className="grid gap-4 lg:grid-cols-2">
            <TextareaField
              label="Venir sans réservation"
              value={settings.walkInNoticeText}
              onChange={(value) => update({ walkInNoticeText: value })}
            />
            <TextareaField
              label="Partage des tables"
              value={settings.sharedTableNotice}
              onChange={(sharedTableNotice) => update({ sharedTableNotice })}
            />
            <TextareaField
              label="Commandes à emporter"
              value={settings.takeawayNotice}
              onChange={(takeawayNotice) => update({ takeawayNotice })}
            />
            <TextareaField
              label="Consommation pendant l'atelier"
              value={settings.consumptionMandatoryNotice}
              onChange={(consumptionMandatoryNotice) => update({ consumptionMandatoryNotice })}
            />
            <TextareaField
              label="Conditions avant confirmation"
              value={settings.reservationConditionsText}
              onChange={(value) => update({ reservationConditionsText: value })}
            />
            <TextareaField
              label="Nourriture et boissons pour les groupes"
              value={settings.groupOutsideFoodNotice}
              onChange={(value) => update({ groupOutsideFoodNotice: value })}
            />
            <TextareaField
              label="Acceptation du guide"
              value={settings.guideAcceptanceText}
              onChange={(value) => update({ guideAcceptanceText: value })}
            />
          </div>
        </SettingsSection>

        <SettingsSection
          title="Contact et réseaux"
          description="Coordonnées utilisées dans le site et les e-mails."
          icon={Settings}
        >
          <div className="grid gap-3 md:grid-cols-2">
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
              label="Pinterest - inspirations"
              value={settings.pinterestUrl}
              onChange={(value) => update({ pinterestUrl: value })}
            />
            <Field
              label="Email de contact"
              value={settings.contactEmail}
              onChange={(value) => update({ contactEmail: value })}
            />
            <Field
              label="Email des notifications de réservation"
              value={settings.adminNotificationEmail}
              onChange={(value) => update({ adminNotificationEmail: value })}
            />
            <Field
              label="Téléphone"
              value={settings.contactPhone}
              onChange={(value) => update({ contactPhone: value })}
            />
            <Field
              label="Adresse"
              value={settings.contactAddress}
              onChange={(value) => update({ contactAddress: value })}
            />
            <Field
              label="Lien Google Maps"
              value={settings.contactMapUrl}
              onChange={(value) => update({ contactMapUrl: value })}
            />
          </div>
        </SettingsSection>

        <SettingsSection
          title="Estimation automatique des groupes"
          description="Fourchettes utilisées pour calculer le récapitulatif PDF d'une demande de groupe."
          icon={Coins}
        >
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <NumberField
              label="Céramique minimum"
              value={settings.groupCeramicRateMin}
              suffix="EUR"
              onChange={(groupCeramicRateMin) => update({ groupCeramicRateMin })}
            />
            <NumberField
              label="Céramique maximum"
              value={settings.groupCeramicRateMax}
              suffix="EUR"
              onChange={(groupCeramicRateMax) => update({ groupCeramicRateMax })}
            />
            <NumberField
              label="Brunch minimum"
              value={settings.groupMealRateMin}
              suffix="EUR"
              onChange={(groupMealRateMin) => update({ groupMealRateMin })}
            />
            <NumberField
              label="Brunch maximum"
              value={settings.groupMealRateMax}
              suffix="EUR"
              onChange={(groupMealRateMax) => update({ groupMealRateMax })}
            />
          </div>
        </SettingsSection>
      </div>
    </Panel>
  );
}

function SettingsSection({
  title,
  description,
  icon: Icon,
  children,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-background p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-secondary text-primary">
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <h3 className="font-display text-xl">{title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="mt-4">{children}</div>
    </section>
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
    startTime: "09:30",
    endTime: "16:30",
    validFrom: dateInput(0),
    validUntil: "2030-12-31",
  };
}

function IntervalField({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return (
    <div>
      <span className="mb-1.5 block text-sm font-medium">Départ des créneaux</span>
      <div className="grid grid-cols-2 overflow-hidden rounded-xl border border-input bg-background">
        {[30, 60].map((minutes) => (
          <button
            key={minutes}
            type="button"
            onClick={() => onChange(minutes)}
            className={`h-11 px-3 text-sm transition ${
              value === minutes ? "bg-primary text-primary-foreground" : "hover:bg-secondary"
            }`}
          >
            Toutes les {minutes === 60 ? "heures" : "30 minutes"}
          </button>
        ))}
      </div>
    </div>
  );
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
            Définissez le premier et le dernier départ par jour et par période. Le planning client
            se met à jour avec ces règles.
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
                    label="Premier départ"
                    value={rule.startTime}
                    onChange={(value) => updateRule(rule.id, { startTime: value })}
                  />
                  <TimeField
                    label="Dernier départ"
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

function SeatingAreasEditor({
  areas,
  onChange,
}: {
  areas: SeatingArea[];
  onChange: (areas: SeatingArea[]) => void;
}) {
  const total = areas.reduce(
    (sum, area) => sum + Math.max(0, area.capacity) * Math.max(0, area.quantity),
    0,
  );

  function updateArea(id: string, patch: Partial<SeatingArea>) {
    onChange(areas.map((area) => (area.id === id ? { ...area, ...patch } : area)));
  }

  return (
    <div className="rounded-2xl border border-border bg-background p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="font-display text-xl">Espaces et capacité</div>
          <p className="mt-1 text-sm text-muted-foreground">
            Le client choisit une zone, puis le système remplit les tables adaptées. Les groupes
            importants peuvent être répartis sur plusieurs tables de la même zone. Capacité totale
            actuelle : {total} places.
          </p>
        </div>
        <button
          type="button"
          onClick={() =>
            onChange([
              ...areas,
              {
                id: `espace-${Date.now()}`,
                label: "Nouvel espace",
                capacity: 2,
                quantity: 1,
                zone: "interieur",
              },
            ])
          }
          className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          <Plus className="h-4 w-4" /> Ajouter un espace
        </button>
      </div>

      <div className="mt-4 grid gap-3">
        {areas.map((area) => (
          <div
            key={area.id}
            className="grid gap-3 rounded-2xl border border-border bg-card p-4 md:grid-cols-[1fr_10rem_10rem_10rem_auto] md:items-end"
          >
            <Field
              label="Nom"
              value={area.label}
              onChange={(label) => updateArea(area.id, { label })}
            />
            <NumberField
              label="Nombre d'espaces"
              value={area.quantity}
              suffix=""
              onChange={(quantity) => updateArea(area.id, { quantity })}
            />
            <label>
              <span className="mb-1.5 block text-sm font-medium">Zone client</span>
              <select
                value={area.zone ?? "interieur"}
                onChange={(event) =>
                  updateArea(area.id, { zone: event.target.value as SeatingZone })
                }
                className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="interieur">Intérieur</option>
                <option value="exterieur">Extérieur</option>
                <option value="carbet">Carbet</option>
              </select>
            </label>
            <NumberField
              label="Places par espace"
              value={area.capacity}
              suffix="places"
              onChange={(capacity) => updateArea(area.id, { capacity })}
            />
            <button
              type="button"
              aria-label={`Supprimer ${area.label}`}
              onClick={() => onChange(areas.filter((item) => item.id !== area.id))}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-destructive/30 px-3 text-sm text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4" /> Supprimer
            </button>
          </div>
        ))}
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
    arrived: "bg-sage/25 text-sage",
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
      onClick={() => void updateStatus(id, target)}
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
