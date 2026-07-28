import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Heart, Trophy } from "lucide-react";
import { PageShell, PageHeader } from "@/components/page-shell";
import { useKafeSettings } from "@/lib/admin-data";
import { callRpc, isSupabaseConfigured } from "@/lib/supabase-rest";

export const Route = createFileRoute("/vote-du-mois")({
  head: () => ({
    meta: [
      { title: "Vote du mois - Kafé Céramik" },
      {
        name: "description",
        content: "Vote pour ta création préférée parmi la sélection du mois du Kafé Céramik.",
      },
    ],
  }),
  component: VoteDuMoisPage,
});

type VoteResult = {
  entry_id: string;
  vote_count: number;
};

function voterToken() {
  const key = "kafe-ceramik-voter-token";
  const existing = localStorage.getItem(key);
  if (existing) return existing;
  const token = crypto.randomUUID();
  localStorage.setItem(key, token);
  return token;
}

function VoteDuMoisPage() {
  const [settings, , ready] = useKafeSettings();
  const vote = settings.voteOfMonth;
  const entries = vote.entries.filter((entry) => entry.visible);
  const voteKey = `kafe-ceramik-vote-${vote.campaignId}`;
  const [selected, setSelected] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [results, setResults] = useState<VoteResult[]>([]);
  const totalVotes = useMemo(
    () => results.reduce((total, result) => total + Number(result.vote_count), 0),
    [results],
  );
  const today = new Date().toISOString().slice(0, 10);
  const open =
    vote.enabled &&
    Boolean(vote.startsAt) &&
    Boolean(vote.endsAt) &&
    today >= vote.startsAt &&
    today <= vote.endsAt;

  useEffect(() => {
    const previous = localStorage.getItem(voteKey);
    if (previous) {
      setSelected(previous);
      setSubmitted(true);
    }
  }, [voteKey]);

  useEffect(() => {
    if (!vote.showResults || !isSupabaseConfigured()) return;
    callRpc<VoteResult[]>("get_public_kafe_vote_results", {
      p_campaign_id: vote.campaignId,
    })
      .then(setResults)
      .catch(() => setResults([]));
  }, [submitted, vote.campaignId, vote.showResults]);

  async function submitVote() {
    if (!selected || !open || submitting) return;
    setSubmitting(true);
    setMessage("");
    try {
      if (isSupabaseConfigured()) {
        const result = await callRpc<{ accepted: boolean; duplicate?: boolean }>(
          "cast_kafe_monthly_vote",
          {
            p_campaign_id: vote.campaignId,
            p_entry_id: selected,
            p_voter_token: voterToken(),
          },
        );
        if (!result.accepted && !result.duplicate) throw new Error("VOTE_REJECTED");
      }
      localStorage.setItem(voteKey, selected);
      setSubmitted(true);
      setMessage("Ton vote est enregistré. Merci d'avoir participé !");
    } catch {
      setMessage("Le vote n'a pas pu être enregistré. Réessaie dans un instant.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!ready) {
    return (
      <PageShell>
        <div className="mx-auto max-w-6xl px-4 py-24 text-center">Chargement du vote...</div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader eyebrow="Vote du mois" title={vote.title} description={vote.introduction} />

      <section className="mx-auto max-w-6xl px-4 py-12">
        {!vote.enabled ? (
          <EmptyVote text="La prochaine sélection arrive bientôt." />
        ) : entries.length === 0 ? (
          <EmptyVote text="Les créations du mois seront bientôt dévoilées." />
        ) : (
          <>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <div className="inline-flex items-center gap-2 rounded-full bg-secondary px-4 py-2 text-sm">
                <Trophy className="h-4 w-4 text-primary" />
                Du {formatDate(vote.startsAt)} au {formatDate(vote.endsAt)}
              </div>
              <div className="text-sm text-muted-foreground">
                Un vote par appareil pour cette édition
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {entries.map((entry) => {
                const active = selected === entry.id;
                const count =
                  Number(results.find((result) => result.entry_id === entry.id)?.vote_count) || 0;
                const percent = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
                return (
                  <button
                    key={entry.id}
                    type="button"
                    disabled={submitted || !open}
                    onClick={() => setSelected(entry.id)}
                    className={`overflow-hidden rounded-3xl border bg-card text-left transition ${
                      active
                        ? "border-primary ring-2 ring-primary/25"
                        : "border-border hover:border-primary/40"
                    } disabled:cursor-default`}
                  >
                    <div className="aspect-[4/5] bg-secondary">
                      {entry.imageDataUrl || entry.imageUrl ? (
                        <img
                          src={entry.imageDataUrl || entry.imageUrl}
                          alt={entry.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="grid h-full place-items-center">
                          <Heart className="h-10 w-10 text-primary/45" />
                        </div>
                      )}
                    </div>
                    <div className="p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h2 className="font-display text-2xl leading-tight">{entry.title}</h2>
                          <p className="mt-1 text-sm font-medium text-primary">
                            par {entry.artistName}
                          </p>
                        </div>
                        <span
                          className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border ${
                            active
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border"
                          }`}
                        >
                          {active && <CheckCircle2 className="h-4 w-4" />}
                        </span>
                      </div>
                      {entry.description && (
                        <p className="mt-3 text-sm leading-6 text-muted-foreground">
                          {entry.description}
                        </p>
                      )}
                      {vote.showResults && submitted && (
                        <div className="mt-4">
                          <div className="h-2 overflow-hidden rounded-full bg-secondary">
                            <div
                              className="h-full rounded-full bg-primary"
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground">{percent} %</div>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-8 flex flex-col items-center gap-3">
              <button
                type="button"
                disabled={!selected || submitted || !open || submitting}
                onClick={() => void submitVote()}
                className="inline-flex min-w-52 items-center justify-center gap-2 rounded-full bg-primary px-6 py-3.5 font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-45"
              >
                <Heart className="h-4 w-4" />
                {submitted ? "Vote enregistré" : submitting ? "Enregistrement..." : "Je vote"}
              </button>
              {!open && (
                <p className="text-sm text-muted-foreground">Le vote est actuellement fermé.</p>
              )}
              {message && <p className="text-center text-sm text-muted-foreground">{message}</p>}
            </div>
          </>
        )}
      </section>
    </PageShell>
  );
}

function EmptyVote({ text }: { text: string }) {
  return (
    <div className="rounded-3xl border border-border bg-card p-10 text-center">
      <Trophy className="mx-auto h-10 w-10 text-primary" />
      <h2 className="mt-4 font-display text-3xl">{text}</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Repasse bientôt pour découvrir les artistes.
      </p>
    </div>
  );
}

function formatDate(value: string) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long" }).format(
    new Date(`${value}T12:00:00`),
  );
}
