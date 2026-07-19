"use client";

import { useUIStore } from "@/lib/store/useUIStore";
import { usePost } from "@/lib/supabase/hooks";
import { useCurrentProfile } from "@/lib/supabase/useAuth";
import { CloseIcon, ChartIcon } from "@/components/icons";
import { compactNumber } from "@/lib/format";

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="border border-line rounded-xl p-3.5">
      <p className="text-2xl font-display italic">{value}</p>
      <p className="text-xs text-muted mt-0.5">{label}</p>
    </div>
  );
}

export default function PostInsightsModal() {
  const postId = useUIStore((s) => s.insightsPostId);
  const close = useUIStore((s) => s.closeInsights);
  const { userId } = useCurrentProfile();
  const { post } = usePost(postId ?? undefined, userId);

  if (!postId || !post) return null;

  const engagements = post.like_count + post.comment_count + post.share_count + post.repost_count;
  const engagementRate = post.view_count > 0 ? ((engagements / post.view_count) * 100).toFixed(1) : "—";
  const watchPct = Math.round((post.watch_time_ratio ?? 0) * 100);

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/70 animate-fade-in" onClick={close}>
      <div
        className="w-full md:w-[440px] md:rounded-2xl bg-surface border border-line rounded-t-2xl animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-line">
          <h2 className="font-display italic text-xl flex items-center gap-2">
            <ChartIcon size={18} /> Insights
          </h2>
          <button onClick={close} aria-label="Close">
            <CloseIcon />
          </button>
        </div>

        <div className="px-5 py-5">
          <p className="text-xs text-muted mb-4">Only visible to you.</p>
          <div className="grid grid-cols-2 gap-3">
            <Stat label={post.type === "text" ? "Reads" : "Views"} value={compactNumber(post.view_count)} />
            <Stat label="Engagement rate" value={typeof engagementRate === "string" && engagementRate !== "—" ? `${engagementRate}%` : engagementRate} />
            <Stat label="Likes" value={compactNumber(post.like_count)} />
            <Stat label="Comments" value={compactNumber(post.comment_count)} />
            <Stat label="Reposts" value={compactNumber(post.repost_count)} />
            <Stat label="Shares" value={compactNumber(post.share_count)} />
            {post.type !== "text" && <Stat label="Avg. watch-through" value={`${watchPct}%`} />}
          </div>
        </div>
      </div>
    </div>
  );
}
