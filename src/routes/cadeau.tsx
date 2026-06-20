import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Gift, Heart, Check } from "lucide-react";
import { PageShell, PageHeader } from "@/components/page-shell";

export const Route = createFileRoute("/cadeau")({
  head: () => ({
    meta: [
      { title: "Carte cadeau — Kafé Céramik" },
      { name: "description", content: "Offrez un moment créatif au Kafé Céramik. Cartes cadeaux à partir de 25 €." },
    ],
  }),
  component: CadeauPage,
});

const AMOUNTS = [25, 40, 60];

function CadeauPage() {
  const [amount, setAmount] = useState<number | "custom">(40);
  const [custom, setCustom] = useState<number>(50);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [msg, setMsg] = useState("");
  const [done, setDone] = useState(false);

  const value = amount === "custom" ? custom : amount;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setDone(true);
  }

  if (done) {
    return (
      <PageShell>
        <PageHeader eyebrow="Carte cadeau" title="C'est offert 🎁" />
        <section className="mx-auto max-w-2xl px-4 py-10">
          <div className="rounded-3xl border border-border bg-card p-8 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-sage/20 text-sage">
              <Check className="h-7 w-7" />
            </div>
            <h2 className="mt-4 text-2xl">Carte de {value} € envoyée à {to || "votre destinataire"}</h2>
            <p className="mt-2 text-muted-foreground">
              Un email avec le code cadeau lui a été transmis. Paiement simulé pour la démo.
            </p>
            <GiftCardPreview amount={value} from={from} to={to} msg={msg} />
          </div>
        </section>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader
        eyebrow="Offrir"
        title="Carte cadeau Kafé Céramik"
        description="Le cadeau parfait pour qui aime créer, ralentir, et bien manger."
      />
      <section className="mx-auto max-w-4xl px-4 py-10">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
          <form onSubmit={submit} className="rounded-3xl border border-border bg-card p-6 sm:p-8 space-y-6">
            <div>
              <div className="text-sm font-medium">Montant</div>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {AMOUNTS.map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => setAmount(a)}
                    className={`rounded-2xl border p-4 text-center transition ${
                      amount === a ? "border-primary bg-primary/5 ring-2 ring-primary/30" : "border-border hover:bg-secondary"
                    }`}
                  >
                    <div className="font-display text-2xl">{a} €</div>
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setAmount("custom")}
                  className={`rounded-2xl border p-4 text-center transition ${
                    amount === "custom" ? "border-primary bg-primary/5 ring-2 ring-primary/30" : "border-border hover:bg-secondary"
                  }`}
                >
                  <div className="text-sm">Libre</div>
                </button>
              </div>
              {amount === "custom" && (
                <input
                  type="number"
                  min={10}
                  value={custom}
                  onChange={(e) => setCustom(Number(e.target.value))}
                  className="mt-3 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
                />
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="De la part de" v={from} on={setFrom} />
              <Input label="Pour" v={to} on={setTo} />
              <div className="sm:col-span-2">
                <label className="text-sm font-medium">Petit mot</label>
                <textarea
                  rows={3}
                  value={msg}
                  onChange={(e) => setMsg(e.target.value)}
                  placeholder="Joyeux anniversaire ! Profite bien ✨"
                  className="mt-2 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground"
            >
              <Gift className="h-4 w-4" /> Offrir une carte cadeau · {value} €
            </button>
            <p className="text-center text-xs text-muted-foreground">Paiement simulé pour la démo.</p>
          </form>

          <GiftCardPreview amount={value} from={from} to={to} msg={msg} />
        </div>
      </section>
    </PageShell>
  );
}

function Input({ label, v, on }: { label: string; v: string; on: (v: string) => void }) {
  return (
    <div>
      <label className="text-sm font-medium">{label}</label>
      <input
        value={v}
        onChange={(e) => on(e.target.value)}
        className="mt-2 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
      />
    </div>
  );
}

function GiftCardPreview({
  amount, from, to, msg,
}: { amount: number; from: string; to: string; msg: string }) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-rose via-cream to-apricot/60 p-6 sm:p-8 text-foreground">
      <div className="blob -right-10 -top-10 h-40 w-40 bg-sage/60" />
      <div className="relative">
        <div className="flex items-center gap-2 text-xs uppercase tracking-widest">
          <Heart className="h-3.5 w-3.5" /> Carte cadeau
        </div>
        <div className="mt-2 font-display text-3xl">Kafé Céramik</div>
        <div className="mt-6 font-display text-6xl">{amount} €</div>
        <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-xs uppercase text-foreground/60">De</div>
            <div className="truncate font-medium">{from || "—"}</div>
          </div>
          <div>
            <div className="text-xs uppercase text-foreground/60">Pour</div>
            <div className="truncate font-medium">{to || "—"}</div>
          </div>
        </div>
        {msg && <p className="mt-5 italic text-foreground/80">"{msg}"</p>}
      </div>
    </div>
  );
}
