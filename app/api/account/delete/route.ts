import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const admin = createAdminClient();

  // Clean up storage first — deleting the auth user cascades through every
  // table via `on delete cascade` FKs, but Storage is a separate system
  // Postgres cascades don't reach, so files would otherwise be orphaned.
  try {
    const { data: files } = await admin.storage.from("media").list(user.id);
    if (files && files.length > 0) {
      const paths = files.map((f) => `${user.id}/${f.name}`);
      await admin.storage.from("media").remove(paths);
    }
  } catch (err) {
    // Don't block account deletion on storage cleanup failing — a few
    // orphaned files is a much smaller problem than a stuck delete.
    console.error("Storage cleanup failed during account deletion:", err);
  }

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
