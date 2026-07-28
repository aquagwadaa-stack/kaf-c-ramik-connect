import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowRight, ExternalLink, Gift, Mail, Sparkles } from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { useKafeSettings, type GiftCardOption, type GiftCardVisual } from "@/lib/admin-data";

export const Route = createFileRoute("/cadeau")({
  head: () => ({
    meta: [
      { title: "Carte cadeau - Kafé Céramik" },
      {
        name: "description",
        content: "Offre un moment créatif et gourmand au Kafé Céramik de Saint-François.",
      },
    ],
  }),
  component: CadeauPage,
});

const visualLabels: Record<GiftCardVisual, string> = {
  rose: "Rose Kafé",
  tropical: "Tropicale",
  confetti: "Confettis",
};

function CadeauPage() {
  const [settings] = useKafeSettings();
  const options = settings.giftCardOptions.filter((option) => option.visible);
  const [selectedId, setSelectedId] = useState(options[0]?.id ?? "custom");
  const [customAmount, setCustomAmount] = useState(settings.giftCardCustomMin);
  const [visual, setVisual] = useState<GiftCardVisual>(options[0]?.visual ?? "rose");
  const [recipient, setRecipient] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [sender, setSender] = useState("");
  const [message, setMessage] = useState("");
  const selected = options.find((option) => option.id === selectedId);
  const amount = selected?.amount ?? customAmount;
  const paymentUrl = (selected?.paymentUrl || settings.giftCardPaymentUrl).trim();
  const mailHref = useMemo(() => {
    const subject = encodeURIComponent(`Carte cadeau Kafé Céramik - ${amount} €`);
    const body = encodeURIComponent(
      [
        "Bonjour,",
        "",
        `Je souhaite une carte cadeau de ${amount} €.`,
        `Pour : ${recipient || "à préciser"}`,
        `Email du bénéficiaire : ${recipientEmail || "à préciser"}`,
        `De la part de : ${sender || "à préciser"}`,
        `Visuel : ${visualLabels[visual]}`,
        `Message : ${message || "aucun message"}`,
        "",
        "Merci !",
      ].join("\n"),
    );
    return `mailto:${settings.giftCardContactEmail}?subject=${subject}&body=${body}`;
  }, [amount, message, recipient, recipientEmail, sender, settings.giftCardContactEmail, visual]);

  return (
    <PageShell>
      <section className="relative isolate min-h-[600px] overflow-hidden">
        <img
          src="/photos/atelier-mains.webp"
          alt="Peinture d'une tasse en céramique au Kafé"
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-[#301c1a]/58" />
        <div className="relative mx-auto flex min-h-[600px] max-w-6xl items-end px-4 pb-16 pt-28 text-white">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#f4b6cd] px-4 py-2 text-sm font-semibold text-[#401f1c]">
              <Gift className="h-4 w-4" /> À offrir, à peindre, à savourer
            </div>
            <h1 className="mt-6 max-w-3xl font-display text-5xl leading-[0.95] sm:text-7xl">
              La carte cadeau Kafé Céramik
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/90">
              Choisis un montant, un visuel et un petit mot. La carte sera préparée en PDF pour
              offrir une parenthèse créative et gourmande.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-[#fff8ef] px-4 py-14 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-3xl">
            <div className="text-sm font-semibold text-primary">1. Choisis une formule</div>
            <h2 className="mt-2 font-display text-4xl">Une suggestion ou un montant libre.</h2>
            <p className="mt-3 leading-7 text-muted-foreground">
              Les exemples donnent une idée du budget. Le bénéficiaire reste libre de choisir sa
              consommation et sa céramique sur place. La carte peut aussi être dépensée chez Mala
              Madre.
            </p>
          </div>

          <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {options.map((option) => (
              <GiftOptionCard
                key={option.id}
                option={option}
                selected={selectedId === option.id}
                onSelect={() => {
                  setSelectedId(option.id);
                  setVisual(option.visual);
                }}
              />
            ))}
            {settings.giftCardCustomEnabled && (
              <button
                type="button"
                onClick={() => setSelectedId("custom")}
                className={`rounded-3xl border p-5 text-left transition ${
                  selectedId === "custom"
                    ? "border-primary bg-[#f5cdd7] ring-2 ring-primary/20"
                    : "border-border bg-card hover:border-primary/40"
                }`}
              >
                <div className="text-sm font-medium text-primary">Montant libre</div>
                <div className="mt-3 font-display text-4xl">{customAmount} €</div>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  Compose la carte selon le budget que tu souhaites offrir.
                </p>
              </button>
            )}
          </div>

          {selectedId === "custom" && settings.giftCardCustomEnabled && (
            <label className="mt-5 block max-w-md rounded-2xl border border-border bg-card p-4">
              <span className="text-sm font-medium">Montant de la carte</span>
              <div className="mt-3 flex items-center gap-3">
                <input
                  type="range"
                  min={settings.giftCardCustomMin}
                  max={settings.giftCardCustomMax}
                  step={5}
                  value={customAmount}
                  onChange={(event) => setCustomAmount(Number(event.target.value))}
                  className="min-w-0 flex-1 accent-primary"
                />
                <span className="w-20 rounded-full bg-secondary px-3 py-2 text-center font-medium">
                  {customAmount} €
                </span>
              </div>
            </label>
          )}
        </div>
      </section>

      <section className="px-4 py-14 sm:py-20">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
          <div className="lg:sticky lg:top-28">
            <div className="text-sm font-semibold text-primary">2. Personnalise-la</div>
            <GiftPreview
              amount={amount}
              recipient={recipient}
              sender={sender}
              message={message}
              visual={visual}
            />
          </div>

          <div className="rounded-3xl border border-border bg-card p-5 sm:p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <GiftField label="Pour" value={recipient} onChange={setRecipient} />
              <GiftField label="De la part de" value={sender} onChange={setSender} />
              <div className="sm:col-span-2">
                <GiftField
                  label="Email du bénéficiaire"
                  value={recipientEmail}
                  onChange={setRecipientEmail}
                  type="email"
                />
                <p className="mt-1.5 text-xs text-muted-foreground">
                  La carte cadeau PDF sera envoyée à cette adresse après validation du paiement.
                </p>
              </div>
            </div>
            <label className="mt-4 block">
              <span className="mb-1.5 block text-sm font-medium">Petit mot (facultatif)</span>
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                rows={4}
                maxLength={240}
                className="w-full rounded-xl border border-input bg-background px-3 py-2.5 outline-none focus:ring-2 focus:ring-ring"
              />
            </label>
            <div className="mt-4">
              <span className="mb-2 block text-sm font-medium">Visuel de la carte</span>
              <div className="grid grid-cols-3 gap-2">
                {(Object.keys(visualLabels) as GiftCardVisual[]).map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setVisual(item)}
                    className={`rounded-xl border px-3 py-2 text-sm ${
                      visual === item
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border hover:bg-secondary"
                    }`}
                  >
                    {visualLabels[item]}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6 rounded-2xl bg-secondary/45 p-4 text-sm leading-6 text-muted-foreground">
              Après paiement, les informations ci-dessus servent à préparer la carte cadeau PDF. Les
              modalités automatiques seront activées avec le compte SumUp du Kafé.
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              {paymentUrl ? (
                <a
                  href={paymentUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 font-medium text-primary-foreground"
                >
                  Payer {amount} € <ExternalLink className="h-4 w-4" />
                </a>
              ) : (
                <button
                  type="button"
                  disabled
                  title="Le paiement SumUp sera activé prochainement"
                  className="rounded-full bg-primary px-5 py-3 font-medium text-primary-foreground opacity-55"
                >
                  Paiement bientôt disponible
                </button>
              )}
              <a
                href={mailHref}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-5 py-3 font-medium hover:bg-secondary"
              >
                <Mail className="h-4 w-4" /> Envoyer les détails
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#cfe6a5] px-4 py-12 text-[#301c1a]">
        <div className="mx-auto flex max-w-6xl flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Sparkles className="h-5 w-5" />
            <h2 className="mt-2 font-display text-3xl">Besoin d'inspiration avant d'offrir ?</h2>
          </div>
          <Link
            to="/creations"
            className="inline-flex w-fit items-center gap-2 rounded-full bg-[#301c1a] px-5 py-3 text-sm font-medium text-white"
          >
            Voir les créations <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </PageShell>
  );
}

function GiftOptionCard({
  option,
  selected,
  onSelect,
}: {
  option: GiftCardOption;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`rounded-3xl border p-5 text-left transition ${
        selected
          ? "border-primary bg-[#f5cdd7] ring-2 ring-primary/20"
          : "border-border bg-card hover:border-primary/40"
      }`}
    >
      <div className="text-sm font-medium text-primary">{option.title}</div>
      <div className="mt-3 font-display text-4xl">{option.amount} €</div>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">{option.description}</p>
    </button>
  );
}

function GiftPreview({
  amount,
  recipient,
  sender,
  message,
  visual,
}: {
  amount: number;
  recipient: string;
  sender: string;
  message: string;
  visual: GiftCardVisual;
}) {
  const backgrounds: Record<GiftCardVisual, string> = {
    rose: "checker-pink bg-[#f5cdd7]",
    tropical: "bg-[#cfe6a5]",
    confetti: "bg-[#fff0c7]",
  };
  return (
    <div
      className={`relative mt-5 aspect-[1.42/1] overflow-hidden rounded-3xl border border-border p-6 shadow-lg shadow-ink/10 ${backgrounds[visual]}`}
    >
      <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-[#e90061]/20" />
      <div className="absolute -bottom-10 -left-6 h-32 w-32 rounded-full bg-[#315d39]/20" />
      <div className="relative flex h-full flex-col justify-between rounded-2xl border border-white/65 bg-[#fff8ef]/90 p-5">
        <div>
          <div className="text-sm font-semibold text-primary">Kafé Céramik</div>
          <div className="mt-2 font-display text-3xl">Carte cadeau</div>
        </div>
        <div>
          <div className="font-display text-5xl">{amount} €</div>
          <p className="mt-2 line-clamp-2 text-sm">
            {message || "Un moment créatif rien que pour toi."}
          </p>
        </div>
        <div className="flex justify-between gap-3 text-xs">
          <span>Pour {recipient || "..."}</span>
          <span>De {sender || "..."}</span>
        </div>
      </div>
    </div>
  );
}

function GiftField({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "email";
}) {
  return (
    <label>
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-input bg-background px-3 py-2.5 outline-none focus:ring-2 focus:ring-ring"
      />
    </label>
  );
}
