"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useUIStore } from "@/lib/store/useUIStore";
import { useThemeStore } from "@/lib/store/useThemeStore";
import { useCurrentProfile } from "@/lib/supabase/useAuth";
import { useBlockedProfiles, useNotificationPreferences } from "@/lib/supabase/hooks";
import { updateProfile, signOut, toggleBlock, changePassword, updateNotificationPreferences } from "@/lib/supabase/actions";
import { uploadMedia } from "@/lib/supabase/upload";
import { isPushSupported, getPushPermissionState, enablePush, disablePush } from "@/lib/push";
import Avatar from "@/components/Avatar";
import { CloseIcon, ImageIcon } from "@/components/icons";

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
  const [avatarUrl, setAvatarUrl] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [savingPassword, setSavingPassword] = useState(false);

  const { preferences, mutate: mutatePrefs } = useNotificationPreferences(userId);
  const [savingPrefs, setSavingPrefs] = useState<string | null>(null);

  const [tab, setTab] = useState<"profile" | "password" | "notifications" | "blocked">("profile");
  const { blocked, mutate: mutateBlocked } = useBlockedProfiles(userId);

  const { theme, setTheme } = useThemeStore();

  const [pushState, setPushState] = useState<"unsupported" | "default" | "granted" | "denied">("default");
  const [pushBusy, setPushBusy] = useState(false);

  useEffect(() => {
    getPushPermissionState().then((state) => {
      if (state === "unsupported") setPushState("unsupported");
      else setPushState(state as "default" | "granted" | "denied");
    });
  }, []);

  async function handlePushToggle() {
    if (!userId) return;
    setPushBusy(true);
    try {
      if (pushState === "granted") {
        await disablePush();
        setPushState("default");
        showToast("Push notifications turned off");
      } else {
        await enablePush(userId);
        setPushState("granted");
        showToast("Push notifications turned on");
      }
    } catch (err: any) {
      console.error(err);
      showToast(err?.message ?? "Couldn't update push notifications");
    } finally {
      setPushBusy(false);
    }
  }

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name);
      setUsername(profile.username);
      setBio(profile.bio);
      setAvatarUrl(profile.avatar_url);
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
      await updateProfile(userId!, { display_name: displayName, bio, username: cleanUsername, avatar_url: avatarUrl });
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

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !userId) return;
    setUploadingAvatar(true);
    try {
      const url = await uploadMedia(file, userId);
      setAvatarUrl(url);
      // Save immediately rather than waiting for "Save changes" — a new
      // photo is a distinct action from editing text fields, and this
      // avoids losing the upload if the person navigates away.
      await updateProfile(userId, { avatar_url: url });
      mutate();
      showToast("Profile photo updated");
    } catch (err) {
      console.error(err);
      showToast("Couldn't upload photo — try again");
    } finally {
      setUploadingAvatar(false);
      if (avatarInputRef.current) avatarInputRef.current.value = "";
    }
  }

  async function savePassword() {
    setPasswordError(null);
    if (newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords don't match");
      return;
    }
    setSavingPassword(true);
    try {
      await changePassword(newPassword);
      showToast("Password updated");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      console.error(err);
      setPasswordError(err?.message ?? "Couldn't update password — try again");
    } finally {
      setSavingPassword(false);
    }
  }

  async function togglePref(key: "likes" | "comments" | "follows" | "new_post" | "mentions") {
    if (!preferences) return;
    const next = !preferences[key];
    setSavingPrefs(key);
    mutatePrefs({ ...preferences, [key]: next }, { revalidate: false });
    try {
      await updateNotificationPreferences(userId!, { [key]: next });
    } catch (err) {
      console.error(err);
      mutatePrefs({ ...preferences, [key]: !next }, { revalidate: false });
      showToast("Couldn't save — try again");
    } finally {
      setSavingPrefs(null);
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
              <div className="flex items-center gap-4">
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
                <button
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="relative shrink-0 disabled:opacity-60"
                  aria-label="Change profile photo"
                >
                  <Avatar
                    src={avatarUrl}
                    alt={displayName}
                    size={64}
                  />
                  <span className="absolute -bottom-1 -right-1 bg-paper text-ink rounded-full p-1.5 border-2 border-surface">
                    <ImageIcon size={13} className="opacity-100" />
                  </span>
                </button>
                <div className="flex flex-col gap-0.5">
                  <button
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={uploadingAvatar}
                    className="text-sm font-medium text-text disabled:opacity-60"
                  >
                    {uploadingAvatar ? "Uploading..." : "Change photo"}
                  </button>
                  <span className="text-xs text-muted">JPG or PNG</span>
                </div>
              </div>
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
              <div className="flex flex-col gap-1.5">
                <span className="text-xs text-muted font-mono">Appearance</span>
                <div className="flex gap-2">
                  {(["dark", "light"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setTheme(t)}
                      className={`flex-1 py-2 rounded-lg text-sm capitalize border transition-colors ${
                        theme === t ? "border-text bg-text/10 text-text" : "border-line text-muted"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={signOut} className="text-danger text-sm font-medium text-left mt-2">
                Log out
              </button>
            </div>
          )}

          {tab === "password" && (
            <div className="flex flex-col gap-4">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs text-muted font-mono">New password</span>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    setPasswordError(null);
                  }}
                  minLength={6}
                  className="bg-surface2 border border-line rounded-lg px-3 py-2.5 outline-none focus:border-muted"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs text-muted font-mono">Confirm new password</span>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setPasswordError(null);
                  }}
                  minLength={6}
                  className="bg-surface2 border border-line rounded-lg px-3 py-2.5 outline-none focus:border-muted"
                />
              </label>
              {passwordError && <span className="text-danger text-xs">{passwordError}</span>}
              <button
                onClick={savePassword}
                disabled={savingPassword || !newPassword || !confirmPassword}
                className="bg-paper text-ink font-semibold rounded-full py-2.5 hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {savingPassword ? "Updating..." : "Update password"}
              </button>
            </div>
          )}

          {tab === "notifications" && (
            <div className="flex flex-col gap-4">
              {pushState !== "unsupported" && (
                <div className="flex items-center justify-between pb-3 border-b border-line">
                  <div>
                    <span className="text-sm block">Push notifications</span>
                    <span className="text-xs text-muted">
                      {pushState === "denied"
                        ? "Blocked in your browser settings"
                        : "Get notified even when Orbit isn't open"}
                    </span>
                  </div>
                  <button
                    onClick={handlePushToggle}
                    disabled={pushBusy || pushState === "denied"}
                    className={`w-11 h-6 rounded-full relative transition-colors disabled:opacity-40 shrink-0 ${
                      pushState === "granted" ? "bg-text" : "bg-surface2 border border-line"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 w-5 h-5 rounded-full bg-paper transition-transform ${
                        pushState === "granted" ? "translate-x-5" : "translate-x-0.5"
                      }`}
                    />
                  </button>
                </div>
              )}
              {preferences ? (
                (
                  [
                    { key: "likes" as const, label: "Likes" },
                    { key: "comments" as const, label: "Comments" },
                    { key: "follows" as const, label: "New followers" },
                    { key: "new_post" as const, label: "New posts from people you follow" },
                    { key: "mentions" as const, label: "Mentions" },
                  ]
                ).map((row) => (
                  <div key={row.key} className="flex items-center justify-between">
                    <span className="text-sm">{row.label}</span>
                    <button
                      onClick={() => togglePref(row.key)}
                      disabled={savingPrefs === row.key}
                      className={`w-11 h-6 rounded-full relative transition-colors disabled:opacity-60 ${
                        preferences[row.key] ? "bg-text" : "bg-surface2 border border-line"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 w-5 h-5 rounded-full bg-paper transition-transform ${
                          preferences[row.key] ? "translate-x-5" : "translate-x-0.5"
                        }`}
                      />
                    </button>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted">Loading...</p>
              )}
              <p className="text-xs text-muted">
                Turning one off stops that notification from being created at all — it&apos;s enforced
                server-side, not just hidden in this app.
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
                    <Avatar src={b.avatar_url} alt={b.display_name} size={38} />
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

        {tab === "profile" && (
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
