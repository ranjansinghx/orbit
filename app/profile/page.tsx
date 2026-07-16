"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCurrentProfile } from "@/lib/supabase/useAuth";
import OrbitMark from "@/components/OrbitMark";

export default function ProfileRootPage() {
  const router = useRouter();
  const { profile, userId } = useCurrentProfile();

  useEffect(() => {
    if (profile) {
      router.replace(`/profile/${profile.username}`);
    }
  }, [profile, router]);

  // Only reachable for a moment — while the profile hook is still resolving,
  // e.g. from a nav link clicked right after login before the profile fetch
  // finishes. userId === null (not undefined) means "signed out", which
  // shouldn't happen here since this route is auth-gated, but if it ever
  // does, send them to login rather than hang on a spinner forever.
  useEffect(() => {
    if (userId === null) {
      router.replace("/login");
    }
  }, [userId, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <OrbitMark size={32} spin />
    </div>
  );
}
