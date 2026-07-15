"use client";

import Link from "next/link";
import { useCurrentProfile } from "@/lib/supabase/useAuth";
import { useReports, useProfileById, usePost, ReportRow } from "@/lib/supabase/hooks";
import { updateReportStatus } from "@/lib/supabase/actions";
import { useUIStore } from "@/lib/store/useUIStore";
import PageHeader from "@/components/PageHeader";
import Avatar from "@/components/Avatar";
import { timeAgo } from "@/lib/format";

function ReportCard({ report, onUpdated }: { report: ReportRow; onUpdated: () => void }) {
  const reporter = useProfileById(report.reporter_id);
  const targetUser = useProfileById(report.target_type === "user" ? report.target_id : undefined);
  const { post: targetPost } = usePost(report.target_type === "post" ? report.target_id : undefined, null);
  const showToast = useUIStore((s) => s.showToast);

  async function setStatus(status: "open" | "reviewed" | "dismissed") {
    try {
      await updateReportStatus(report.id, status);
      onUpdated();
    } catch (err) {
      console.error(err);
      showToast("Couldn't update — try again");
    }
  }

  return (
    <div className="border-b border-line px-5 py-4">
      <div className="flex items-center justify-between mb-2">
        <span
          className={`text-xs font-mono px-2 py-0.5 rounded-full ${
            report.status === "open"
              ? "bg-video/15 text-video"
              : report.status === "reviewed"
              ? "bg-text/15 text-text"
              : "bg-surface2 text-muted"
          }`}
        >
          {report.status}
        </span>
        <span className="text-xs text-muted font-mono">{timeAgo(report.created_at)}</span>
      </div>

      <p className="text-sm mb-1">
        <span className="text-muted">Reported by</span>{" "}
        {reporter ? (
          <Link href={`/profile/${reporter.username}`} className="font-medium hover:underline">
            @{reporter.username}
          </Link>
        ) : (
          "..."
        )}
      </p>
      <p className="text-sm mb-1">
        <span className="text-muted">Reason:</span> <b>{report.reason}</b>
      </p>
      {report.details && <p className="text-sm text-paper/80 mb-2">&ldquo;{report.details}&rdquo;</p>}

      <div className="mt-2 mb-3">
        {report.target_type === "user" && targetUser && (
          <Link href={`/profile/${targetUser.username}`} className="flex items-center gap-2 text-sm hover:underline w-fit">
            <Avatar src={targetUser.avatar_url} alt={targetUser.display_name} size={28} />
            Reported account: @{targetUser.username}
          </Link>
        )}
        {report.target_type === "post" && targetPost && (
          <Link href={`/post/${targetPost.id}`} className="text-sm text-text hover:underline">
            View reported post →
          </Link>
        )}
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setStatus("reviewed")}
          disabled={report.status === "reviewed"}
          className="px-3 py-1.5 rounded-full border border-line text-xs font-medium hover:border-muted disabled:opacity-40"
        >
          Mark reviewed
        </button>
        <button
          onClick={() => setStatus("dismissed")}
          disabled={report.status === "dismissed"}
          className="px-3 py-1.5 rounded-full border border-line text-xs font-medium hover:border-muted disabled:opacity-40"
        >
          Dismiss
        </button>
        {report.status !== "open" && (
          <button
            onClick={() => setStatus("open")}
            className="px-3 py-1.5 rounded-full border border-line text-xs font-medium hover:border-muted"
          >
            Reopen
          </button>
        )}
      </div>
    </div>
  );
}

export default function AdminReportsPage() {
  const { profile } = useCurrentProfile();
  const { reports, mutate } = useReports(profile?.is_admin);

  if (profile && !profile.is_admin) {
    return (
      <div className="max-w-2xl mx-auto px-5 py-16 text-center text-muted">
        <p>You don&apos;t have access to this page.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto border-x border-line min-h-screen">
      <PageHeader title="Reports" subtitle={`${reports.length} total`} />
      {reports.length === 0 ? (
        <p className="text-center text-muted py-16">No reports.</p>
      ) : (
        reports.map((r) => <ReportCard key={r.id} report={r} onUpdated={() => mutate()} />)
      )}
    </div>
  );
}
