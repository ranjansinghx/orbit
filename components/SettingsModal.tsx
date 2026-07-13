"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUIStore } from "@/lib/store/useUIStore";
import { useCurrentProfile } from "@/lib/supabase/useAuth";
import { useBlockedProfiles } from "@/lib/supabase/hooks";
import { updateProfile, signOut, toggleBlock } from "@/lib/supabase/actions";
import Avatar from "@/components/Avatar";
import { CloseIcon } from "@/components/icons";

const USERNAME_PATTERN = /^[a-z0-9_.]{3,20}$/;

export default function SettingsModal() {
  const open = useUIStore((s) => s.settingsOpen);
  const close = useUIStore((s) => s.closeSettings);
  const showToast = useUIStore((s) => s.showToast);
  const { profile, userId, mutate } = useCurrentProfile();
  const router = useRouter();

  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [saving, setSaving] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [notifLikes, setNotifLikes] = useState(true);
  const [notifComments, setNotifComments] = useState(true);
  const [notifFollows, setNotifFollows] = useState(true);
  const [tab, setTab] = useState<"profile" | "password" | "notifications" | "blocked">("profile");
  const { blocked, mutate: mutateBlocked } = useBlockedProfiles(userId);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name);
      setUsername(profile.username);
      setBio(profile.bio);
    }
  }, [profile]);

  if (!open || !profile || !userId) return null;

  async function save() {
    const cleanUsername = username.trim().toLowerCase();
    if (!USERNAME_PATTERN.test(cleanUsername)) {
      setUsernameError("3-20 characters: lowercase letters, numbers, underscore, or period");
      setTab("profile");
      return;
    }
    setUsernameError(null);
    setSaving(true);
    const usernameChanged = cleanUsername !== profile!.username;
    try {
      await updateProfile(userId!, { display_name: displayName, bio, username: cleanUsername });
      mutate();
      showToast("Settings saved");
      close();
      if (usernameChanged) {
        router.push(`/profile/${cleanUsername}`);
      }
    } catch (err: any) {
      console.error(err);
      if (err?.code === "23505") {
        setUsernameError("That username is already taken");
        setTab("profile");
      } else {
        showToast("Couldn't save — try again");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/70 animate-fade-in" onClick={close}>
      <div
        className="w-full md:w-[520px] md:rounded-2xl bg-surface border border-line rounded-t-2xl max-h-[90vh] overflow-y-auto animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-line sticky top-0 bg-surface z-10">
          <h2 className="font-display italic text-xl">Settings</h2>
          <button onClick={close} aria-label="Close settings">
            <CloseIcon />
          </button>
        </div>

        <div className="flex gap-1 px-5 pt-4">
          {(["profile", "password", "notifications", "blocked"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3.5 py-1.5 rounded-full text-sm capitalize transition-colors ${
                tab === t ? "bg-paper text-ink font-medium" : "text-muted"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="px-5 py-5">
          {tab === "profile" && (
            <div className="flex flex-col gap-4">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs text-muted font-mono">Username</span>
                <div className="flex items-center gap-1.5 bg-surface2 border border-line rounded-lg px-3 py-2.5 focus-within:border-muted">
                  <span className="text-muted">@</span>
                  <input
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value.toLowerCase());
                      setUsernameError(null);
                    }}
                    className="bg-transparent outline-none flex-1 min-w-0"
                    maxLength={20}
                  />
                </div>
                {usernameError && <span className="text-danger text-xs">{usernameError}</span>}
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs text-muted font-mono">Display name</span>
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="bg-surface2 border border-line rounded-lg px-3 py-2.5 outline-none focus:border-muted"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs text-muted font-mono">Bio</span>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                  className="bg-surface2 border border-line rounded-lg px-3 py-2.5 outline-none resize-none focus:border-muted"
                />
              </label>
              <button onClick={signOut} className="text-danger text-sm font-medium text-left mt-2">
                Log out
              </button>
            </div>
          )}

          {tab === "password" && (
            <div className="flex flex-col gap-4">
              <p className="text-sm text-muted">
                Password changes go through Supabase Auth&apos;s{" "}
                <code className="font-mono text-xs">updateUser</code> call — wire a form here that
                calls <code className="font-mono text-xs">supabase.auth.updateUser({"{"} password {"}"})</code>.
              </p>
            </div>
          )}

          {tab === "notifications" && (
            <div className="flex flex-col gap-4">
              {[
                { label: "Likes", state: notifLikes, set: setNotifLikes },
                { label: "Comments", state: notifComments, set: setNotifComments },
                { label: "New followers", state: notifFollows, set: setNotifFollows },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between">
                  <span className="text-sm">{row.label}</span>
                  <button
                    onClick={() => row.set(!row.state)}
                    className={`w-11 h-6 rounded-full relative transition-colors ${
                      row.state ? "bg-text" : "bg-surface2 border border-line"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 w-5 h-5 rounded-full bg-paper transition-transform ${
                        row.state ? "translate-x-5" : "translate-x-0.5"
                      }`}
                    />
                  </button>
                </div>
              ))}
              <p className="text-xs text-muted">
                These are UI-only for now — persist them to a `notification_preferences` table keyed
                by user id when you&apos;re ready to enforce them server-side.
              </p>
            </div>
          )}
          {tab === "blocked" && (
            <div className="flex flex-col gap-1">
              {blocked.length === 0 ? (
                <p className="text-sm text-muted">You haven&apos;t blocked anyone.</p>
              ) : (
                blocked.map((b) => (
                  <div key={b.id} className="flex items-center gap-3 py-2.5">
                    <Avatar src={b.avatar_url || `https://i.pravatar.cc/150?u=${b.id}`} alt={b.display_name} size={38} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{b.display_name}</p>
                      <p className="text-xs text-muted truncate">@{b.username}</p>
                    </div>
                    <button
                      onClick={async () => {
                        try {
                          await toggleBlock(b.id);
                          mutateBlocked();
                        } catch (err) {
                          console.error(err);
                        }
                      }}
                      className="px-3 py-1.5 rounded-full border border-line text-xs font-medium hover:border-muted transition-colors shrink-0"
                    >
                      Unblock
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {(tab === "profile" || tab === "notifications") && (
          <div className="px-5 pb-5">
            <button
              onClick={save}
              disabled={saving}
              className="w-full bg-paper text-ink font-semibold rounded-full py-2.5 hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save changes"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
