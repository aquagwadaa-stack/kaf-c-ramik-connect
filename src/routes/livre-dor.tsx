import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  BookHeart,
  ExternalLink,
  Heart,
  ImagePlus,
  Quote,
  Send,
  Sparkles,
  Star,
  X,
} from "lucide-react";
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

const noteTones = ["bg-[#fffaf0]", "bg-[#f7e1e6]", "bg-[#dce6f7]", "bg-[#d6ead4]"];
const noteRotations = ["rotate-[-1deg]", "rotate-[1deg]", "rotate-[0.5deg]", "rotate-[-0.5deg]"];

function LivreDorPage() {
  const [settings] = useKafeSettings();
  const { entries, loading } = usePublishedGuestbookEntries();
  const [author, setAuthor] = useState("");
  const [message, setMessage] = useState("");
  const [rating, setRating] = useState(5);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const [imageError, setImageError] = useState("");
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState("");
  const canSend = useMemo(
    () => author.trim().length >= 2 && message.trim().length >= 4 && !imageError,
    [author, imageError, message],
  );
  const average = useMemo(() => {
    if (!entries.length) return null;
    return (entries.reduce((total, entry) => total + entry.rating, 0) / entries.length).toFixed(1);
  }, [entries]);

  useEffect(() => {
    if (!imageFile) {
      setImagePreview("");
      return;
    }
    const previewUrl = URL.createObjectURL(imageFile);
    setImagePreview(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [imageFile]);

  function chooseImage(file?: File) {
    setImageError("");
    if (!file) {
      setImageFile(null);
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setImageFile(null);
      setImageError("Choisis une image JPG, PNG ou WebP.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setImageFile(null);
      setImageError("La photo doit peser moins de 5 Mo.");
      return;
    }
    setImageFile(file);
  }

  async function submit() {
    if (!canSend || sending) return;
    setSending(true);
    setNotice("");
    try {
      const result = await submitGuestbookEntry({ author, message, rating, image: imageFile });
      setAuthor("");
      setMessage("");
      setRating(5);
      setImageFile(null);
      setNotice(
        result.imageUploaded
          ? "Merci ! Ton souvenir a bien été envoyé à l'équipe pour validation."
          : "Ton message a bien été envoyé, mais la photo n'a pas pu être ajoutée.",
      );
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
        title="Les mots doux du Kafé"
        description="Un souvenir, un coup de cœur, une création dont tu es fier·e ? Laisse une trace de ton passage dans notre livre collectif."
      />

      <section className="border-b-2 border-ink bg-[#fef3b0] px-4 py-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <span className="grid h-14 w-14 place-items-center rounded-full border-2 border-ink bg-[#a85f73] text-[#fffaf0] shadow-[3px_3px_0_#2f1620]">
              <BookHeart className="h-7 w-7" />
            </span>
            <div>
              <div className="font-display text-2xl">Vos souvenirs vivent ici.</div>
              <p className="mt-1 text-sm text-ink/70">
                Chaque message est lu par l'équipe après publication.
              </p>
            </div>
          </div>
          {average && (
            <div className="kafe-poster-label rotate-1 bg-[#fffaf0] text-ink">
              {average}/5 · {entries.length} mot{entries.length > 1 ? "s" : ""}
            </div>
          )}
        </div>
      </section>

      <section className="border-b-2 border-ink bg-[#ffc1b6] px-4 py-12 sm:py-16">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
          <div className="kafe-note-paper bg-[#fffdf8] p-5 sm:p-7">
            <div className="inline-flex items-center gap-2 font-poster text-lg font-extrabold uppercase text-[#98566b]">
              <Heart className="h-5 w-5 fill-current" /> À ton tour
            </div>
            <h2 className="mt-3 font-display text-3xl">Écris dans le livre d'or</h2>

            <label className="mt-5 block">
              <span className="mb-1.5 block text-sm font-bold">Prénom ou nom</span>
              <input
                value={author}
                onChange={(event) => setAuthor(event.target.value)}
                maxLength={80}
                className="w-full rounded-lg border-2 border-ink px-3 py-2.5 outline-none focus:ring-2 focus:ring-[#a85f73]"
              />
            </label>

            <div className="mt-4">
              <span className="mb-2 block text-sm font-bold">Ta note</span>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setRating(value)}
                    className="grid h-10 w-10 place-items-center rounded-lg hover:bg-[#f7e1e6]"
                    aria-label={`${value} étoile${value > 1 ? "s" : ""}`}
                  >
                    <Star
                      className={`h-7 w-7 ${
                        value <= rating ? "fill-[#f0ad19] text-[#2f1620]" : "text-border"
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            <label className="mt-4 block">
              <span className="mb-1.5 block text-sm font-bold">Ton message</span>
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                maxLength={800}
                rows={6}
                className="w-full rounded-lg border-2 border-ink px-3 py-2.5 outline-none focus:ring-2 focus:ring-[#a85f73]"
                placeholder="Raconte-nous ton moment préféré..."
              />
            </label>

            <div className="mt-4 rounded-xl border-2 border-dashed border-ink/35 bg-[#fffaf0]/45 p-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-bold">Une photo souvenir ?</div>
                  <p className="mt-0.5 text-xs text-ink/65">
                    Facultatif · JPG, PNG ou WebP · 5 Mo max.
                  </p>
                </div>
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border-2 border-ink bg-white px-4 py-2 text-sm font-bold shadow-[2px_2px_0_#2f1620] hover:-translate-y-0.5">
                  <ImagePlus className="h-4 w-4" /> Ajouter
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="sr-only"
                    onChange={(event) => chooseImage(event.currentTarget.files?.[0])}
                  />
                </label>
              </div>
              {imagePreview && (
                <div className="relative mt-3 overflow-hidden rounded-xl border-2 border-ink bg-white">
                  <img
                    src={imagePreview}
                    alt="Aperçu de la photo souvenir"
                    className="aspect-[4/3] w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => chooseImage()}
                    className="absolute right-2 top-2 grid h-9 w-9 place-items-center rounded-full border-2 border-ink bg-white shadow-[2px_2px_0_#2f1620]"
                    aria-label="Retirer la photo"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
              {imageError && (
                <p className="mt-2 text-sm font-medium text-destructive">{imageError}</p>
              )}
            </div>

            <button
              type="button"
              disabled={!canSend || sending}
              onClick={() => void submit()}
              className="kafe-block-link mt-4 inline-flex items-center gap-2 bg-[#a85f73] px-5 py-3 font-bold text-[#fffaf0] disabled:opacity-45"
            >
              <Send className="h-4 w-4" />
              {sending ? "Envoi..." : "Déposer mon message"}
            </button>
            {notice && <p className="mt-3 text-sm leading-6 text-muted-foreground">{notice}</p>}
          </div>

          <div>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <div className="kafe-poster-label -rotate-1 bg-[#d6ead4] text-ink">
                  Vos mots doux
                </div>
                <h2 className="mt-5 font-display text-4xl text-ink sm:text-5xl">
                  Les pages déjà remplies
                </h2>
              </div>
              <Quote className="h-14 w-14 rotate-6 text-[#fffaf0]" />
            </div>
            <div className="mt-7 grid gap-5 sm:grid-cols-2">
              {entries.map((entry, index) => (
                <article
                  key={entry.id}
                  className={`kafe-note-paper overflow-hidden text-ink ${noteTones[index % noteTones.length]} ${noteRotations[index % noteRotations.length]}`}
                >
                  {entry.imageUrl && (
                    <img
                      src={entry.imageUrl}
                      alt={`Souvenir partagé par ${entry.author}`}
                      className="aspect-[4/3] w-full border-b-2 border-ink object-cover"
                      loading="lazy"
                    />
                  )}
                  <div className="p-5">
                    <div className="flex gap-0.5">
                      {Array.from({ length: 5 }, (_, starIndex) => (
                        <Star
                          key={starIndex}
                          className={`h-4 w-4 ${
                            starIndex < entry.rating ? "fill-[#f0ad19] text-ink" : "text-ink/25"
                          }`}
                        />
                      ))}
                    </div>
                    <p className="mt-4 leading-7">“{entry.message}”</p>
                    <div className="mt-4 flex flex-wrap items-center gap-2 text-sm font-bold">
                      {entry.author}
                      {entry.source === "google" && (
                        <span className="rounded-full border border-ink/25 bg-[#fffdf8]/70 px-2 py-0.5 text-xs font-medium">
                          Avis Google
                        </span>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
            {!loading && entries.length === 0 && (
              <div className="kafe-note-paper mt-7 bg-[#fffaf0] p-8 text-center text-sm text-ink/70">
                Les premiers messages apparaîtront ici après validation de l'équipe.
              </div>
            )}
          </div>
        </div>
      </section>

      {settings.googleReviewUrl && (
        <section className="checker-strong border-b-2 border-ink px-4 py-12">
          <div className="mx-auto flex max-w-4xl flex-col items-center text-center">
            <Sparkles className="h-9 w-9 text-[#98566b]" />
            <h2 className="mt-3 font-display text-3xl sm:text-4xl">
              Envie de partager ton avis plus largement ?
            </h2>
            <p className="mt-3 max-w-2xl leading-7 text-ink/75">
              Tu peux aussi raconter ton expérience sur Google. Cela aide d'autres artistes à
              découvrir le Kafé.
            </p>
            <a
              href={settings.googleReviewUrl}
              target="_blank"
              rel="noreferrer"
              className="kafe-block-link mt-6 inline-flex items-center gap-2 bg-[#98566b] px-5 py-3 font-bold text-[#fffaf0]"
            >
              Laisser un avis Google <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        </section>
      )}
    </PageShell>
  );
}
