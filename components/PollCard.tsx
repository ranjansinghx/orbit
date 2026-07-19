"use client";

import { useState } from "react";
import { usePollResults } from "@/lib/supabase/hooks";
import { castPollVote } from "@/lib/supabase/actions";
import { CheckIcon } from "@/components/icons";

function timeLeft(closesAt: string) {
  const ms = new Date(closesAt).getTime() - Date.now();
  if (ms <= 0) return "Voting closed";
  const hours = Math.round(ms / (1000 * 60 * 60));
  if (hours < 24) return `${hours}h left`;
  return `${Math.round(hours / 24)}d left`;
}

export default function PollCard({ postId }: { postId: string }) {
  const { results, mutate } = usePollResults(postId);
  const [voting, setVoting] = useState<string | null>(null);

  if (results.length === 0) return null;

  const closesAt = results[0].closes_at;
  const isClosed = !!closesAt && new Date(closesAt).getTime() < Date.now();
  const hasVoted = results.some((r) => r.my_vote);
  const showResults = hasVoted || isClosed;
  const total = results[0].total_votes;

  async function handleVote(optionId: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (isClosed || voting) return;
    setVoting(optionId);
    const prev = results;
    mutate(
      results.map((r) => ({ ...r, my_vote: r.option_id === optionId, vote_count: r.vote_count + (r.option_id === optionId ? 1 : 0), total_votes: r.total_votes + 1 })),
      { revalidate: false }
    );
    try {
      await castPollVote(optionId);
      mutate();
    } catch (err) {
      console.error(err);
      mutate(prev, { revalidate: false });
    } finally {
      setVoting(null);
    }
  }

  return (
    <div className="flex flex-col gap-2 mt-2" onClick={(e) => e.preventDefault()}>
      {results.map((r) => {
        const pct = total > 0 ? Math.round((r.vote_count / total) * 100) : 0;
        return (
          <button
            key={r.option_id}
            onClick={(e) => handleVote(r.option_id, e)}
            disabled={isClosed || !!voting}
            className="relative w-full text-left border border-line rounded-lg overflow-hidden disabled:cursor-default"
          >
            {showResults && (
              <div
                className="absolute inset-y-0 left-0 bg-surface2 transition-all"
                style={{ width: `${pct}%` }}
              />
            )}
            <div className="relative flex items-center justify-between px-3 py-2 text-sm">
              <span className="flex items-center gap-1.5">
                {r.my_vote && <CheckIcon size={13} />}
                {r.label}
              </span>
              {showResults && <span className="text-muted font-mono text-xs">{pct}%</span>}
            </div>
          </button>
        );
      })}
      <p className="text-xs text-muted">
        {total} vote{total === 1 ? "" : "s"}
        {closesAt && <> · {timeLeft(closesAt)}</>}
      </p>
    </div>
  );
}
