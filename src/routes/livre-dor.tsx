import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ExternalLink, Heart, Send, Star } from "lucide-react";
import { PageShell, PageHeader } from "@/components/page-shell";
import { useKafeSettings } from "@/lib/admin-data";
import { submitGuestbookEntry, usePublishedGuestbookEntries } from "@/lib/guestbook";

export const Route = createFileRoute("/livre-dor")({
  head: () => ({
    meta: [
      { title: "Livre d'or - Kafé Céramik" },
      {
        name: "description",
        content: "Laisse un petit mot après ton expérience au Kafé Céramik.",
      },
    ],
  }),
  component: LivreDorPage,
});

function LivreDorPage() {
  const [settings] = useKafeSettings();
  const { entries, loading } = usePublishedGuestbookEntries();
  const [author, setAuthor] = useState("");
  const [message, setMessage] = useState("");
  const [rating, setRating] = useState(5);
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState("");
  const canSend = useMemo(
    () => author.trim().length >= 2 && message.trim().length >= 4,
    [author, message],
  );

  async function submit() {
    if (!canSend || sending) return;
    setSending(true);
    setNotice("");
    try {
      await submitGuestbookEntry({ author, message, rating });
      setAuthor("");
      setMessage("");
      setRating(5);
      setNotice("Merci ! Ton message a bien été envoyé à l'équipe avant publication.");
    } catch {
      setNotice("Le message n'a pas pu être envoyé. Réessaie dans un instant.");
    } finally {
      setSending(false);
    }
  }

  return (
    <PageShell>
      <PageHeader
        eyebrow="Livre d'or"
        title="Un petit mot pour le Kafé ?"
        description="Partage ton expérience, ton coup de cœur ou le souvenir de ta création. L'équipe lit chaque message avant sa publication."
      />

      <section className="mx-auto grid max-w-6xl gap-8 px-4 py-12 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="rounded-3xl border border-border bg-card p-5 sm:p-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1.5 text-sm font-medium">
            <Heart className="h-4 w-4 text-primary" /> Ton expérience
          </div>
          <h2 className="mt-4 font-display text-3xl">Écris dans le livre d'or</h2>

          <label className="mt-5 block">
            <span className="mb-1.5 block text-sm font-medium">Prénom ou nom</span>
            <input
              value={author}
              onChange={(event) => setAuthor(event.target.value)}
              maxLength={80}
              className="w-full rounded-xl border border-input bg-background px-3 py-2.5 outline-none focus:ring-2 focus:ring-ring"
            />
          </label>

          <div className="mt-4">
            <span className="mb-2 block text-sm font-medium">Ta note</span>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRating(value)}
                  className="grid h-10 w-10 place-items-center rounded-full hover:bg-secondary"
                  aria-label={`${value} étoile${value > 1 ? "s" : ""}`}
                >
                  <Star
                    className={`h-6 w-6 ${
                      value <= rating ? "fill-[#f0ad19] text-[#f0ad19]" : "text-border"
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          <label className="mt-4 block">
            <span className="mb-1.5 block text-sm font-medium">Ton message</span>
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              maxLength={800}
              rows={6}
              className="w-full rounded-xl border border-input bg-background px-3 py-2.5 outline-none focus:ring-2 focus:ring-ring"
            />
          </label>

          <button
            type="button"
            disabled={!canSend || sending}
            onClick={() => void submit()}
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 font-medium text-primary-foreground disabled:opacity-45"
          >
            <Send className="h-4 w-4" />
            {sending ? "Envoi..." : "Envoyer mon message"}
          </button>
          {notice && <p className="mt-3 text-sm leading-6 text-muted-foreground">{notice}</p>}

          {settings.googleReviewUrl && (
            <a
              href={settings.googleReviewUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-primary underline underline-offset-4"
            >
              Laisser aussi un avis Google <ExternalLink className="h-4 w-4" />
            </a>
          )}
        </div>

        <div>
          <div className="flex items-end justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-primary">Vos mots doux</div>
              <h2 className="mt-2 font-display text-3xl">Les derniers messages</h2>
            </div>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {entries.map((entry) => (
              <article key={entry.id} className="rounded-3xl border border-border bg-card p-5">
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }, (_, index) => (
                    <Star
                      key={index}
                      className={`h-4 w-4 ${
                        index < entry.rating ? "fill-[#f0ad19] text-[#f0ad19]" : "text-border"
                      }`}
                    />
                  ))}
                </div>
                <p className="mt-4 leading-7">“{entry.message}”</p>
                <div className="mt-4 text-sm font-medium">
                  {entry.author}
                  {entry.source === "google" && (
                    <span className="ml-2 text-xs text-muted-foreground">Avis Google</span>
                  )}
                </div>
              </article>
            ))}
          </div>
          {!loading && entries.length === 0 && (
            <div className="mt-5 rounded-3xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              Les premiers messages apparaîtront ici après validation de l'équipe.
            </div>
          )}
        </div>
      </section>
    </PageShell>
  );
}
