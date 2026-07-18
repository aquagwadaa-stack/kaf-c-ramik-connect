import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  AlertCircle,
  BookOpenText,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  MapPin,
  Users,
} from "lucide-react";
import { PageHeader, PageShell } from "@/components/page-shell";
import {
  cancelReservationFromPortal,
  createSumUpCheckout,
  experienceLabel,
  experienceUsesCeramicGuide,
  formatReservationDate,
  getReservationPortal,
  statusLabel,
  type ReservationPortalData,
} from "@/lib/reservations";

export const Route = createFileRoute("/reservation")({
  head: () => ({
    meta: [
      { title: "Ma réservation — Kafé Céramik" },
      {
        name: "description",
        content: "Retrouve les informations et les actions liées à ta réservation.",
      },
    ],
  }),
  component: ReservationPortalPage,
});

function ReservationPortalPage() {
  const [data, setData] = useState<ReservationPortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [openingPayment, setOpeningPayment] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const token =
    typeof window === "undefined"
      ? ""
      : (new URLSearchParams(window.location.search).get("token")?.trim() ?? "");

  useEffect(() => {
    let alive = true;
    if (!token) {
      setError("Ce lien de réservation est incomplet.");
      setLoading(false);
      return;
    }
    getReservationPortal(token)
      .then((result) => {
        if (alive) setData(result);
      })
      .catch(() => {
        if (alive) setError("Cette réservation est introuvable ou le lien n'est plus valide.");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [token]);

  async function cancelReservation() {
    if (!data?.canCancel || !token) return;
    const confirmed = window.confirm(
      "Confirmer l'annulation de cette réservation ? Cette action est définitive.",
    );
    if (!confirmed) return;
    setCancelling(true);
    setError("");
    try {
      const next = await cancelReservationFromPortal(token);
      setData(next);
      setNotice("Ta réservation a bien été annulée. Un e-mail de confirmation va être envoyé.");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(
        message.includes("KAFE_CANCELLATION_DEADLINE")
          ? "Le délai d'annulation en ligne est dépassé. Contacte directement le Kafé."
          : "L'annulation n'a pas pu être enregistrée. Réessaie ou contacte le Kafé.",
      );
    } finally {
      setCancelling(false);
    }
  }

  async function openPayment() {
    if (!token) return;
    setOpeningPayment(true);
    setError("");
    try {
      const checkout = await createSumUpCheckout(token);
      if (checkout.paid) {
        setNotice("Ton acompte est déjà enregistré.");
        return;
      }
      if (checkout.checkoutUrl) {
        window.location.assign(checkout.checkoutUrl);
        return;
      }
      setError("Le paiement en ligne n'est pas encore activé. Contacte le Kafé si nécessaire.");
    } catch {
      setError("Le paiement n'a pas pu être ouvert. Réessaie dans un instant.");
    } finally {
      setOpeningPayment(false);
    }
  }

  return (
    <PageShell>
      <PageHeader
        eyebrow="Espace réservation"
        title="Ton rendez-vous au Kafé"
        description="Retrouve ici ton créneau, les informations pratiques et les actions disponibles."
      />
      <section className="mx-auto max-w-4xl px-4 py-10">
        {loading ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
            Chargement de la réservation…
          </div>
        ) : error && !data ? (
          <Message tone="error">{error}</Message>
        ) : data ? (
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
            <div className="rounded-3xl border border-border bg-card p-5 sm:p-7">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-5">
                <div>
                  <p className="text-sm text-muted-foreground">Réservation de</p>
                  <h1 className="mt-1 font-display text-3xl">
                    {data.reservation.firstName} {data.reservation.lastName}
                  </h1>
                </div>
                <span className="rounded-full bg-secondary px-3 py-1.5 text-sm font-medium">
                  {statusLabel(data.reservation.status)}
                </span>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <Info icon={CalendarDays} label="Date">
                  {formatReservationDate(data.reservation.date)}
                </Info>
                <Info icon={Clock3} label="Heure">
                  {data.reservation.slot}
                </Info>
                <Info icon={Users} label="Participants">
                  {data.reservation.people} personne{data.reservation.people > 1 ? "s" : ""}
                </Info>
                <Info icon={MapPin} label="Formule">
                  {experienceLabel(data.reservation.experience)}
                </Info>
                {data.reservation.groupQuoteTotal && (
                  <Info icon={FileText} label="Devis estimatif">
                    {data.reservation.groupQuoteTotal} € pour le groupe
                  </Info>
                )}
              </div>

              {notice && (
                <div className="mt-5">
                  <Message tone="success">{notice}</Message>
                </div>
              )}
              {error && (
                <div className="mt-5">
                  <Message tone="error">{error}</Message>
                </div>
              )}
            </div>

            <aside className="space-y-4">
              {data.paymentEnabled &&
                data.reservation.depositRequired &&
                !data.reservation.depositPaid &&
                data.reservation.status !== "cancelled" && (
                  <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4">
                    <h2 className="font-medium">Acompte à régler</h2>
                    <p className="mt-2 text-xs leading-5 text-muted-foreground">
                      Le règlement de {data.reservation.depositAmount ?? 100} € est nécessaire avant
                      la validation définitive par l'équipe.
                    </p>
                    <button
                      type="button"
                      onClick={openPayment}
                      disabled={openingPayment}
                      className="mt-4 w-full rounded-full bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
                    >
                      {openingPayment ? "Ouverture…" : "Payer l'acompte"}
                    </button>
                  </div>
                )}
              {experienceUsesCeramicGuide(data.reservation.experience) && (
                <Link
                  to="/guide"
                  className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4 hover:border-primary/50 hover:bg-secondary/40"
                >
                  <BookOpenText className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <span>
                    <span className="block font-medium">Relire le guide</span>
                    <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                      Toutes les consignes utiles avant ton atelier.
                    </span>
                  </span>
                </Link>
              )}

              {data.reservation.status !== "cancelled" && (
                <div className="rounded-2xl border border-border bg-card p-4">
                  <h2 className="font-medium">Besoin d'annuler ?</h2>
                  {data.canCancel ? (
                    <>
                      <p className="mt-2 text-xs leading-5 text-muted-foreground">
                        L'annulation en ligne est possible jusqu'à {data.cancellationNoticeHours} h
                        avant le créneau.
                      </p>
                      <button
                        type="button"
                        onClick={cancelReservation}
                        disabled={cancelling}
                        className="mt-4 w-full rounded-full border border-destructive/35 px-4 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/10 disabled:opacity-50"
                      >
                        {cancelling ? "Annulation…" : "Annuler ma réservation"}
                      </button>
                    </>
                  ) : (
                    <p className="mt-2 text-xs leading-5 text-muted-foreground">
                      Le délai d'annulation en ligne est dépassé. Contacte directement le Kafé au
                      0690 28 47 88.
                    </p>
                  )}
                </div>
              )}
            </aside>
          </div>
        ) : null}

        <div className="mt-7 text-center">
          <Link to="/" className="text-sm font-medium text-primary underline underline-offset-4">
            Retour au site
          </Link>
        </div>
      </section>
    </PageShell>
  );
}

function Info({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof CalendarDays;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-secondary/45 p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className="h-4 w-4 text-primary" /> {label}
      </div>
      <div className="mt-2 text-sm font-medium capitalize">{children}</div>
    </div>
  );
}

function Message({ tone, children }: { tone: "success" | "error"; children: React.ReactNode }) {
  const Icon = tone === "success" ? CheckCircle2 : AlertCircle;
  return (
    <div
      className={`flex items-start gap-3 rounded-2xl border p-4 text-sm ${
        tone === "success"
          ? "border-sage/35 bg-sage/10"
          : "border-destructive/30 bg-destructive/10 text-destructive"
      }`}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" /> {children}
    </div>
  );
}
