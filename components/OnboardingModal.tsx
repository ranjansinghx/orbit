"use client";

import { useState } from "react";
import Link from "next/link";
import { useCurrentProfile } from "@/lib/supabase/useAuth";
import { useSuggestedFollows } from "@/lib/supabase/hooks";
import { updateProfile } from "@/lib/supabase/actions";
import Avatar from "@/components/Avatar";
import FollowButton from "@/components/FollowButton";
import OrbitMark from "@/components/OrbitMark";
import { HomeIcon, TextIcon } from "@/components/icons";

export default function OnboardingModal() {
  const { profile, userId, mutate } = useCurrentProfile();
  const { people } = useSuggestedFollows(userId, 6);
  const [step, setStep] = useState<"welcome" | "follow">("welcome");
  const [finishing, setFinishing] = useState(false);
  const [dismissedLocally, setDismissedLocally] = useState(false);

  // Strict === false on purpose: if the onboarded column doesn't exist yet
  // (migration not run) this reads as undefined, which must NOT trigger a
  // full-screen modal that can never be dismissed. Fail safe, not blocking.
  if (!profile || profile.onboarded !== false || dismissedLocally) return null;

  // Always works, even if the database write below fails for any reason —
  // nobody should ever be permanently stuck behind this modal.
  function skip() {
    setDismissedLocally(true);
    if (userId) updateProfile(userId, { onboarded: true }).catch(() => {});
  }

  async function finish() {
    if (!userId) return;
    setFinishing(true);
    try {
      await updateProfile(userId, { onboarded: true });
      mutate();
    } catch (err) {
      console.error(err);
      // Don't trap someone in onboarding over a network blip — let them
      // through; worst case they see this again next load.
      mutate();
    } finally {
      setFinishing(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 px-4 animate-fade-in">
      <div className="w-full max-w-sm bg-surface border border-line rounded-2xl overflow-hidden animate-slide-up relative">
        <button
          onClick={skip}
          className="absolute top-3 right-3 text-xs text-muted hover:text-paper transition-colors z-10 px-2 py-1"
        >
          Skip
        </button>
        {step === "welcome" ? (
          <div className="px-6 py-8 flex flex-col items-center text-center">
            <OrbitMark size={44} spin />
            <h1 className="font-display italic text-2xl mt-4">Welcome to Orbit</h1>
            <p className="text-sm text-muted mt-2 mb-6">
              Two feeds, one account — here&apos;s the difference.
            </p>

            <div className="w-full flex flex-col gap-3 text-left mb-6">
              <div className="flex gap-3 border border-line rounded-xl p-3.5">
                <HomeIcon active size={22} />
                <div>
                  <p className="text-sm font-semibold">Home</p>
                  <p className="text-xs text-muted mt-0.5">
                    Video and photo, ranked by what&apos;s popular — like a For You page. You&apos;ll see posts
                    from people you don&apos;t follow yet too.
                  </p>
                </div>
              </div>
              <div className="flex gap-3 border border-line rounded-xl p-3.5">
                <TextIcon active size={22} />
                <div>
                  <p className="text-sm font-semibold">Text</p>
                  <p className="text-xs text-muted mt-0.5">
                    Text posts only, in order, only from people you follow — no ranking, no surprises.
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setStep("follow")}
              className="w-full bg-paper text-ink font-semibold rounded-full py-2.5 hover:opacity-90 transition-opacity"
            >
              Continue
            </button>
          </div>
        ) : (
          <div className="px-6 py-8">
            <h2 className="font-display italic text-2xl text-center">Follow a few people</h2>
            <p className="text-sm text-muted text-center mt-2 mb-5">
              Your Text feed only shows posts from accounts you follow — it starts empty otherwise.
            </p>

            {people.length === 0 ? (
              <p className="text-sm text-muted text-center py-6">
                No suggestions yet — you can find people any time from Home.
              </p>
            ) : (
              <div className="flex flex-col divide-y divide-line max-h-64 overflow-y-auto mb-5">
                {people.map((p) => (
                  <div key={p.id} className="flex items-center gap-3 py-2.5">
                    <Link href={`/profile/${p.username}`}>
                      <Avatar src={p.avatar_url} alt={p.display_name} size={40} />
                    </Link>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{p.display_name}</p>
                      <p className="text-xs text-muted truncate">@{p.username}</p>
                    </div>
                    <FollowButton userId={p.id} size="sm" />
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={finish}
              disabled={finishing}
              className="w-full bg-paper text-ink font-semibold rounded-full py-2.5 hover:opacity-90 transition-opacity disabled:opacity-60"
            >
              {finishing ? "..." : "Done"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
