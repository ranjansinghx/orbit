import { createClient } from "@/lib/supabase/client";

/**
 * Uploads a file straight to Supabase Storage using a signed upload URL, so
 * the bytes never pass through a Next.js API route (avoids serverless
 * payload/timeout limits on larger video files). Returns the public URL.
 */
export async function uploadMedia(file: File, userId: string): Promise<string> {
  const supabase = createClient();
  const ext = file.name.split(".").pop() ?? "bin";
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;

  const { data: signed, error: signError } = await supabase.storage
    .from("media")
    .createSignedUploadUrl(path);
  if (signError) throw signError;

  const { error: uploadError } = await supabase.storage
    .from("media")
    .uploadToSignedUrl(signed.path, signed.token, file);
  if (uploadError) throw uploadError;

  const { data: publicUrl } = supabase.storage.from("media").getPublicUrl(path);
  return publicUrl.publicUrl;
}
