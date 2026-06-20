import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Check, PartyPopper } from "lucide-react";
import { PageShell, PageHeader } from "@/components/page-shell";
import { addReservation } from "@/lib/reservations";

export const Route = createFileRoute("/groupes")({
  head: () => ({
    meta: [
      { title: "Groupes, Anniversaires & EVJF — Kafé Céramik" },
      { name: "description", content: "Privatisez le Kafé pour votre anniversaire, EVJF ou événement de groupe." },
    ],
  }),
  component: GroupesPage,
});

const TYPES = ["Anniversaire", "EVJF", "Baby shower", "Team building", "Famille", "Autre"];
const BUDGETS = ["< 200€", "200–500€", "500–1000€", "> 1000€"];

function GroupesPage() {
  const [sent, setSent] = useState(false);
  const [f, setF] = useState({
    eventType: "Anniversaire",
    people: 8,
    date: "",
    budget: "200–500€",
    message: "",
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
  });
  const [err, setErr] = useState<Record<string, string>>({});

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const E: Record<string, string> = {};
    if (!f.firstName) E.firstName = "Requis";
    if (!f.lastName) E.lastName = "Requis";
    if (!f.phone || f.phone.length < 8) E.phone = "Téléphone invalide";
    if (!f.email || !/.+@.+\..+/.test(f.email)) E.email = "Email invalide";
    if (!f.date) E.date = "Requis";
    setErr(E);
    if (Object.keys(E).length) return;
    addReservation({
      experience: "groupe",
      people: f.people,
      date: f.date,
      slot: "—",
      firstName: f.firstName,
      lastName: f.lastName,
      phone: f.phone,
      email: f.email,
      message: f.message,
      depositPaid: false,
      status: "pending",
      isGroupRequest: true,
      eventType: f.eventType,
      budget: f.budget,
    });
    setSent(true);
  }

  return (
    <PageShell>
      <PageHeader
        eyebrow="Groupes & événements"
        title="Anniversaire, EVJF, team building…"
        description="Dites-nous tout : on revient vers vous avec une proposition personnalisée sous 24h."
      />

      <section className="mx-auto max-w-3xl px-4 py-10">
        {sent ? (
          <div className="rounded-3xl border border-border bg-card p-8 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-sage/20 text-sage">
              <PartyPopper className="h-7 w-7" />
            </div>
            <h2 className="mt-4 text-2xl">Demande envoyée 🎉</h2>
            <p className="mt-2 text-muted-foreground">
              On revient vers vous très vite avec une proposition personnalisée pour votre {f.eventType.toLowerCase()}.
            </p>
          </div>
        ) : (
          <form onSubmit={submit} className="rounded-3xl border border-border bg-card p-6 sm:p-8 space-y-6">
            <div>
              <Label>Type d'événement</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {TYPES.map((t) => (
                  <button
                    type="button"
                    key={t}
                    onClick={() => setF({ ...f, eventType: t })}
                    className={`rounded-full border px-4 py-2 text-sm ${
                      f.eventType === t ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-secondary"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Nombre de personnes</Label>
                <input
                  type="number"
                  min={4}
                  value={f.people}
                  onChange={(e) => setF({ ...f, people: Number(e.target.value) })}
                  className="mt-2 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
              <div>
                <Label>Date souhaitée</Label>
                <input
                  type="date"
                  value={f.date}
                  onChange={(e) => setF({ ...f, date: e.target.value })}
                  className={`mt-2 w-full rounded-xl border bg-background px-3 py-2 text-sm ${err.date ? "border-destructive" : "border-input"}`}
                />
              </div>
            </div>

            <div>
              <Label>Budget approximatif</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {BUDGETS.map((b) => (
                  <button
                    type="button"
                    key={b}
                    onClick={() => setF({ ...f, budget: b })}
                    className={`rounded-full border px-4 py-2 text-sm ${
                      f.budget === b ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-secondary"
                    }`}
                  >
                    {b}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label>Message</Label>
              <textarea
                rows={4}
                value={f.message}
                onChange={(e) => setF({ ...f, message: e.target.value })}
                placeholder="Parlez-nous de l'événement, des envies, des contraintes…"
                className="mt-2 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Prénom" v={f.firstName} on={(v) => setF({ ...f, firstName: v })} e={err.firstName} />
              <Input label="Nom" v={f.lastName} on={(v) => setF({ ...f, lastName: v })} e={err.lastName} />
              <Input label="Téléphone" v={f.phone} on={(v) => setF({ ...f, phone: v })} e={err.phone} />
              <Input label="Email" type="email" v={f.email} on={(v) => setF({ ...f, email: v })} e={err.email} />
            </div>

            <button
              type="submit"
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground"
            >
              <Check className="h-4 w-4" /> Envoyer la demande
            </button>
          </form>
        )}
      </section>
    </PageShell>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="text-sm font-medium">{children}</label>;
}
function Input({
  label, v, on, e, type = "text",
}: { label: string; v: string; on: (v: string) => void; e?: string; type?: string }) {
  return (
    <div>
      <Label>{label}</Label>
      <input
        type={type}
        value={v}
        onChange={(ev) => on(ev.target.value)}
        className={`mt-2 w-full rounded-xl border bg-background px-3 py-2 text-sm ${e ? "border-destructive" : "border-input"}`}
      />
      {e && <p className="mt-1 text-xs text-destructive">{e}</p>}
    </div>
  );
}
