"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { createClient } from "@/lib/supabase/client";
import { Database } from "@/lib/supabase/database.types";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];

/** The logged-in user's auth id, kept in sync with Supabase auth state changes. */
export function useAuthUserId() {
  const supabase = createClient();
  const [userId, setUserId] = useState<string | null | undefined>(undefined); // undefined = loading

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
    });
    return () => sub.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return userId;
}

/** The logged-in user's full profile row. */
export function useCurrentProfile() {
  const userId = useAuthUserId();
  const supabase = createClient();
  const { data, mutate } = useSWR(userId ? ["profile", userId] : null, async () => {
    const { data, error } = await supabase.from("profiles").select("*").eq("id", userId!).single();
    if (error) throw error;
    return data;
  });
  return { profile: data as Profile | undefined, userId, mutate };
}
