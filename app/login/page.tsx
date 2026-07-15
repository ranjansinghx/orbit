"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import OrbitMark from "@/components/OrbitMark";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

type Mode = "signin" | "signup" | "forgot";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [mode, setMode] = useState<Mode>("signin");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const supabase = createClient();

  async function handleGoogle() {
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    if (error) setError(error.message);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          setError(error.message);
          return;
        }
        router.push(next);
        router.refresh();
      } else if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { username },
            emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
          },
        });
        if (error) {
          setError(error.message);
          return;
        }
        setCheckEmail(true);
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth/reset-password`,
        });
        if (error) {
          setError(error.message);
          return;
        }
        setResetSent(true);
      }
    } finally {
      setLoading(false);
    }
  }

  function switchMode(m: Mode) {
    setMode(m);
    setError(null);
    setResetSent(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <OrbitMark size={44} />
          <h1 className="font-display italic text-3xl mt-3">Orbit</h1>
          <p className="text-muted text-sm mt-1">Video, photo, and text — one orbit.</p>
        </div>

        {checkEmail ? (
          <div className="text-center border border-line rounded-xl p-5">
            <p className="text-sm">
              Check <b>{email}</b> for a confirmation link to finish creating your account.
            </p>
          </div>
        ) : resetSent ? (
          <div className="text-center border border-line rounded-xl p-5">
            <p className="text-sm">
              If <b>{email}</b> has an Orbit account, we&apos;ve sent a password reset link to it.
            </p>
            <button
              onClick={() => switchMode("signin")}
              className="text-sm text-text mt-4 hover:underline"
            >
              Back to sign in
            </button>
          </div>
        ) : (
          <>
            {mode !== "forgot" && (
              <>
                <button
                  onClick={handleGoogle}
                  className="w-full flex items-center justify-center gap-2 border border-line rounded-full py-2.5 mb-4 hover:border-muted transition-colors text-sm font-medium"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82Z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.07 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24Z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29A11.96 11.96 0 0 0 0 12c0 1.93.46 3.76 1.29 5.38l3.98-3.09Z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.94 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75Z"
                    />
                  </svg>
                  Continue with Google
                </button>

                <div className="flex items-center gap-3 mb-4">
                  <div className="h-px bg-line flex-1" />
                  <span className="text-xs text-muted font-mono">or</span>
                  <div className="h-px bg-line flex-1" />
                </div>
              </>
            )}

            {mode === "forgot" && (
              <p className="text-sm text-muted mb-4">
                Enter the email on your account and we&apos;ll send you a link to reset your password.
              </p>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              {mode === "signup" && (
                <input
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Username"
                  pattern="[a-zA-Z0-9_.]+"
                  className="bg-surface2 border border-line rounded-lg px-4 py-2.5 text-sm outline-none placeholder:text-muted focus:border-muted"
                />
              )}
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                className="bg-surface2 border border-line rounded-lg px-4 py-2.5 text-sm outline-none placeholder:text-muted focus:border-muted"
              />
              {mode !== "forgot" && (
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="bg-surface2 border border-line rounded-lg px-4 py-2.5 text-sm outline-none placeholder:text-muted focus:border-muted"
                />
              )}
              {mode === "signin" && (
                <button
                  type="button"
                  onClick={() => switchMode("forgot")}
                  className="text-xs text-muted text-right hover:text-paper transition-colors -mt-1"
                >
                  Forgot password?
                </button>
              )}
              {error && <p className="text-danger text-sm">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="bg-paper text-ink font-semibold rounded-full py-2.5 mt-1 hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {loading
                  ? "Please wait..."
                  : mode === "signin"
                  ? "Sign in"
                  : mode === "signup"
                  ? "Create account"
                  : "Send reset link"}
              </button>
            </form>

            {mode === "forgot" ? (
              <button
                onClick={() => switchMode("signin")}
                className="text-sm text-muted mt-5 w-full text-center hover:text-paper transition-colors"
              >
                Back to sign in
              </button>
            ) : (
              <button
                onClick={() => switchMode(mode === "signin" ? "signup" : "signin")}
                className="text-sm text-muted mt-5 w-full text-center hover:text-paper transition-colors"
              >
                {mode === "signin" ? "New to Orbit? Create an account" : "Already have an account? Sign in"}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
