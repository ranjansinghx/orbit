"use client";

import { useState } from "react";
import { useUIStore } from "@/lib/store/useUIStore";
import { useCurrentProfile } from "@/lib/supabase/useAuth";
import { submitReport } from "@/lib/supabase/actions";
import { CloseIcon } from "@/components/icons";

const REASONS = [
  "Spam",
  "Harassment or bullying",
  "Hate speech",
  "Nudity or sexual content",
  "Violence or dangerous content",
  "Something else",
];

export default function ReportModal() {
  const target = useUIStore((s) => s.reportTarget);
  const close = useUIStore((s) => s.closeReport);
  const showToast = useUIStore((s) => s.showToast);
  const { userId } = useCurrentProfile();

  const [reason, setReason] = useState<string | null>(null);
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!target) return null;

  async function handleClose() {
    close();
    // reset after the close animation would run, so it doesn't flash
    // "reported" content on the next open
    setTimeout(() => {
      setReason(null);
      setDetails("");
      setSubmitted(false);
    }, 200);
  }

  async function submit() {
    if (!reason || !userId || !target) return;
    setSubmitting(true);
    try {
      await submitReport({
        reporterId: userId,
        targetType: target.type,
        targetId: target.id,
        reason,
        details: details.trim() || undefined,
      });
      setSubmitted(true);
    } catch (err) {
      console.error(err);
      showToast("Couldn't submit report — try again");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/70 animate-fade-in" onClick={handleClose}>
      <div
        className="w-full md:w-[420px] md:rounded-2xl bg-surface border border-line rounded-t-2xl animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-line">
          <h2 className="font-display italic text-xl">
            {submitted ? "Report submitted" : `Report ${target.type === "post" ? "post" : "account"}`}
          </h2>
          <button onClick={handleClose} aria-label="Close">
            <CloseIcon />
          </button>
        </div>

        {submitted ? (
          <div className="px-5 py-6">
            <p className="text-sm text-paper/90">
              Thanks — this has been sent for review. It doesn&apos;t notify the account you reported.
            </p>
            <button
              onClick={handleClose}
              className="w-full bg-paper text-ink font-semibold rounded-full py-2.5 mt-5 hover:opacity-90 transition-opacity"
            >
              Done
            </button>
          </div>
        ) : (
          <>
            <div className="px-5 py-4 flex flex-col gap-1.5">
              {REASONS.map((r) => (
                <button
                  key={r}
                  onClick={() => setReason(r)}
                  className={`text-left px-3.5 py-2.5 rounded-lg text-sm border transition-colors ${
                    reason === r ? "border-video bg-video/10 text-paper" : "border-line text-paper/85 hover:border-muted"
                  }`}
                >
                  {r}
                </button>
              ))}
              <textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Add details (optional)"
                rows={3}
                maxLength={300}
                className="w-full bg-surface2 rounded-xl p-3 text-sm placeholder:text-muted outline-none resize-none mt-2 border border-line focus:border-muted"
              />
            </div>
            <div className="px-5 pb-5">
              <button
                onClick={submit}
                disabled={!reason || submitting}
                className="w-full bg-paper text-ink font-semibold rounded-full py-2.5 hover:opacity-90 transition-opacity disabled:opacity-40"
              >
                {submitting ? "Submitting..." : "Submit report"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
