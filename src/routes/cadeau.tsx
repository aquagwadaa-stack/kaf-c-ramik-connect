import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  Gift,
  LoaderCircle,
  Mail,
  Sparkles,
} from "lucide-react";
import { PageShell } from "@/components/page-shell";
import {
  getPageImage,
  useKafeSettings,
  type GiftCardOption,
  type GiftCardVisual,
} from "@/lib/admin-data";
import { createGiftCardCheckout, readGiftCardStatus, type GiftCardOrder } from "@/lib/gift-cards";

export const Route = createFileRoute("/cadeau")({
  ssr: false,
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
  confetti: "Fête colorée",
};

type PublicGiftStatus = Pick<
  GiftCardOrder,
  "code" | "amount" | "recipientName" | "recipientEmail" | "status" | "expiresAt"
>;

function CadeauPage() {
  const [settings] = useKafeSettings();
  const heroImage = getPageImage(settings, "gift-hero");
  const options = settings.giftCardOptions.filter((option) => option.visible);
  const [selectedId, setSelectedId] = useState(options[0]?.id ?? "custom");
  const [customAmount, setCustomAmount] = useState(settings.giftCardCustomMin);
  const [visual, setVisual] = useState<GiftCardVisual>(options[0]?.visual ?? "rose");
  const [recipient, setRecipient] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [sender, setSender] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState("");
  const [returnedOrder, setReturnedOrder] = useState<PublicGiftStatus | null>(null);
  const selected = options.find((option) => option.id === selectedId);
  const amount = selected?.amount ?? customAmount;
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail.trim());
  const formValid =
    amount >= settings.giftCardCustomMin &&
    recipient.trim().length >= 2 &&
    sender.trim().length >= 2 &&
    emailValid;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("giftToken");
    if (token === null) return;
    const giftToken = token;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let attempts = 0;

    async function refreshStatus() {
      try {
        const result = await readGiftCardStatus(giftToken);
        if (stopped) return;
        setReturnedOrder(result.order ?? null);
        attempts += 1;
        if (result.order?.status === "pending" && attempts < 10) {
          timer = setTimeout(() => void refreshStatus(), 2500);
        }
      } catch {
        if (!stopped) setReturnedOrder(null);
      }
    }

    void refreshStatus();
    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
    };
  }, []);

  const mailHref = useMemo(() => {
    const subject = encodeURIComponent(`Carte cadeau Kafé Céramik - ${amount} €`);
    const body = encodeURIComponent(
      [
        "Bonjour,",
        "",
        `Je souhaite une carte cadeau de ${amount} €.`,
        `Pour : ${recipient || "à préciser"}`,
        `Email d'envoi : ${recipientEmail || "à préciser"}`,
        `De la part de : ${sender || "à préciser"}`,
        `Visuel : ${visualLabels[visual]}`,
        `Message : ${message || "aucun message"}`,
        "",
        "Merci !",
      ].join("\n"),
    );
    return `mailto:${settings.giftCardContactEmail}?subject=${subject}&body=${body}`;
  }, [amount, message, recipient, recipientEmail, sender, settings.giftCardContactEmail, visual]);

  async function startPayment() {
    if (!formValid || submitting) return;
    setSubmitting(true);
    setNotice("");
    try {
      const result = await createGiftCardCheckout({
        amount,
        recipientName: recipient.trim(),
        recipientEmail: recipientEmail.trim(),
        senderName: sender.trim(),
        message: message.trim(),
        visual,
        siteUrl: window.location.origin,
      });
      if (!result.configured || !result.checkoutUrl) {
        setNotice(
          result.reason || "Le paiement sécurisé est en cours d'activation par l'équipe du Kafé.",
        );
        return;
      }
      window.location.assign(result.checkoutUrl);
    } catch {
      setNotice("Le paiement n'a pas pu être ouvert. Réessaie ou contacte le Kafé.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PageShell>
      <section className="relative isolate min-h-[560px] overflow-hidden">
        <img
          src={heroImage.imageUrl}
          alt={heroImage.alt}
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-[#2f1620]/52" />
        <div className="absolute inset-y-0 left-0 w-4 bg-[#a85f73]" />
        <div className="relative mx-auto flex min-h-[560px] max-w-6xl items-end px-4 pb-16 pt-28 text-white">
          <div className="max-w-3xl">
            <div className="kafe-poster-label inline-flex items-center gap-2 bg-[#fef3b0] text-[#2f1620]">
              <Gift className="h-4 w-4" /> À offrir, à peindre, à savourer
            </div>
            <h1 className="mt-6 max-w-3xl font-display text-4xl leading-[1.12] sm:text-7xl sm:leading-[1.08]">
              La carte cadeau Kafé Céramik
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/90">
              Choisis un montant, personnalise ta carte, puis reçois son PDF après le paiement. Elle
              reste valable {settings.giftCardValidityMonths} mois.
            </p>
          </div>
        </div>
      </section>

      <div className="grid h-5 grid-cols-5 border-y-2 border-ink" aria-hidden="true">
        <span className="bg-[#a85f73]" />
        <span className="bg-[#fef3b0]" />
        <span className="bg-[#dce6f7]" />
        <span className="bg-[#d6ead4]" />
        <span className="bg-[#ffc1b6]" />
      </div>

      {returnedOrder && (
        <section className="border-b border-border bg-[#d6ead4] px-4 py-6">
          <div className="mx-auto flex max-w-6xl items-start gap-3 rounded-3xl bg-[#fffaf1] p-5 text-[#301c1a]">
            <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-[#315d39]" />
            <div>
              <h2 className="font-display text-2xl">
                {returnedOrder.status === "paid" ? "Paiement confirmé" : "Paiement en vérification"}
              </h2>
              <p className="mt-1 text-sm leading-6">
                {returnedOrder.status === "paid"
                  ? `La carte ${returnedOrder.code} a été envoyée à ${returnedOrder.recipientEmail}.`
                  : "La confirmation peut prendre quelques instants. Le PDF sera envoyé automatiquement dès validation du paiement."}
              </p>
            </div>
          </div>
        </section>
      )}

      <section className="border-b-2 border-ink bg-[#ffd6a5] px-4 py-14 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-3xl">
            <div className="text-sm font-semibold text-primary">1. Choisis une formule</div>
            <h2 className="mt-2 font-display text-4xl">
              Une suggestion ou le montant de ton choix.
            </h2>
            <p className="mt-3 leading-7 text-muted-foreground">
              Ces exemples sont indicatifs. Le bénéficiaire utilise librement le montant de sa carte
              au Kafé Céramik ou chez Mala Madre.
            </p>
          </div>

          <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
                    ? "border-primary bg-[#f7e1e6] ring-2 ring-primary/20"
                    : "border-border bg-card hover:border-primary/40"
                }`}
              >
                <div className="text-sm font-medium text-primary">Montant libre</div>
                <div className="mt-3 font-display text-4xl">
                  {`Dès ${settings.giftCardCustomMin}\u00a0€`}
                </div>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  Aucun plafond imposé : choisis simplement le budget à offrir.
                </p>
              </button>
            )}
          </div>

          {selectedId === "custom" && settings.giftCardCustomEnabled && (
            <label className="mt-5 block max-w-sm rounded-2xl border border-border bg-card p-4">
              <span className="text-sm font-medium">Montant de la carte</span>
              <div className="mt-3 flex items-center gap-3">
                <input
                  type="number"
                  min={settings.giftCardCustomMin}
                  step={1}
                  value={customAmount}
                  onChange={(event) => setCustomAmount(Number(event.target.value))}
                  className="min-w-0 flex-1 rounded-xl border border-input bg-background px-3 py-2.5 outline-none focus:ring-2 focus:ring-ring"
                />
                <span className="font-display text-2xl">€</span>
              </div>
            </label>
          )}
        </div>
      </section>

      <section className="checker-strong border-b-2 border-ink px-4 py-14 sm:py-20">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
          <div className="lg:sticky lg:top-28">
            <div className="text-sm font-semibold text-primary">2. Personnalise-la</div>
            <GiftPreview
              amount={amount}
              recipient={recipient}
              sender={sender}
              message={message}
              visual={visual}
              validityMonths={settings.giftCardValidityMonths}
            />
          </div>

          <div className="kafe-block-link bg-card p-5 sm:p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <GiftField label="Pour" value={recipient} onChange={setRecipient} required />
              <GiftField label="De la part de" value={sender} onChange={setSender} required />
              <div className="sm:col-span-2">
                <GiftField
                  label="Email d'envoi de la carte"
                  value={recipientEmail}
                  onChange={setRecipientEmail}
                  type="email"
                  required
                />
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Le PDF personnalisé sera envoyé à cette adresse dès confirmation du paiement.
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
              La carte est valable {settings.giftCardValidityMonths} mois à compter de son achat et
              peut être utilisée au Kafé Céramik comme chez Mala Madre. Son code, son montant et sa
              date d'expiration apparaîtront dans le PDF.
            </div>

            {notice && (
              <div className="mt-4 rounded-2xl border border-mustard/40 bg-mustard/10 p-4 text-sm leading-6">
                {notice}
              </div>
            )}

            <div className="mt-5 flex flex-wrap gap-3">
              {settings.giftCardPaymentsEnabled ? (
                <button
                  type="button"
                  disabled={!formValid || submitting}
                  onClick={() => void startPayment()}
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 font-medium text-primary-foreground disabled:opacity-45"
                >
                  {submitting ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <ExternalLink className="h-4 w-4" />
                  )}
                  {`Payer ${amount}\u00a0€`}
                </button>
              ) : (
                <button
                  type="button"
                  disabled
                  className="rounded-full bg-primary px-5 py-3 font-medium text-primary-foreground opacity-55"
                >
                  Paiement bientôt disponible
                </button>
              )}
              <a
                href={mailHref}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-5 py-3 font-medium hover:bg-secondary"
              >
                <Mail className="h-4 w-4" /> Contacter le Kafé
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#d6ead4] px-4 py-12 text-[#301c1a]">
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
      className={`kafe-block-link p-5 text-left transition ${
        selected
          ? "border-primary bg-[#f7e1e6] ring-2 ring-primary/20"
          : "border-border bg-card hover:border-primary/40"
      }`}
    >
      <div className="text-sm font-medium text-primary">{option.title}</div>
      <div className="mt-3 font-display text-4xl">{`${option.amount}\u00a0€`}</div>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        {formatEuroText(option.description)}
      </p>
    </button>
  );
}

function GiftPreview({
  amount,
  recipient,
  sender,
  message,
  visual,
  validityMonths,
}: {
  amount: number;
  recipient: string;
  sender: string;
  message: string;
  visual: GiftCardVisual;
  validityMonths: number;
}) {
  const backgrounds: Record<GiftCardVisual, string> = {
    rose: "checker-pink bg-[#f7e1e6]",
    tropical: "brand-stripes bg-[#d6ead4]",
    confetti: "checker-strong bg-[#fef3b0]",
  };
  return (
    <div
      className={`relative mt-5 min-h-[330px] overflow-hidden rounded-3xl border-2 border-ink p-4 shadow-[4px_4px_0_rgba(62,42,49,0.86)] sm:min-h-[350px] sm:p-6 ${backgrounds[visual]}`}
    >
      <div className="relative flex min-h-[298px] flex-col justify-between rounded-2xl border border-white/70 bg-[#fffaf1]/92 p-4 sm:min-h-[302px] sm:p-5">
        <div>
          <div className="text-xs font-semibold uppercase text-primary">Bon cadeau</div>
          <div className="mt-1 font-display text-2xl sm:text-3xl">Kafé Céramik</div>
        </div>
        <div>
          <div className="font-display text-4xl leading-[1.12] sm:text-5xl">{`${amount}\u00a0€`}</div>
          <p className="mt-2 line-clamp-2 text-xs sm:text-sm">
            {message || "Un moment créatif et gourmand rien que pour toi."}
          </p>
        </div>
        <div className="space-y-2 text-[10px] sm:text-xs">
          <div className="break-words">Pour {recipient || "..."}</div>
          <div className="break-words">De {sender || "..."}</div>
          <div className="pt-1 text-[9px] text-muted-foreground">Valable {validityMonths} mois</div>
        </div>
      </div>
    </div>
  );
}

function formatEuroText(value: string) {
  return value.replace(/(\d)\s*€/g, "$1\u00a0€");
}

function GiftField({
  label,
  value,
  onChange,
  type = "text",
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "email";
  required?: boolean;
}) {
  return (
    <label>
      <span className="mb-1.5 block text-sm font-medium">
        {label} {required && <span className="text-primary">*</span>}
      </span>
      <input
        type={type}
        value={value}
        required={required}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-input bg-background px-3 py-2.5 outline-none focus:ring-2 focus:ring-ring"
      />
    </label>
  );
}
