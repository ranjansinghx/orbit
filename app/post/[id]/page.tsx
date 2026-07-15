import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import PostDetailClient from "@/components/PostDetailClient";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data: post } = await supabase
    .from("posts")
    .select("caption, type, media_urls, profiles(display_name, username)")
    .eq("id", id)
    .maybeSingle();

  if (!post) {
    return { title: "Orbit", description: "Video, photo, and text — unified." };
  }

  const author = post.profiles as unknown as { display_name: string; username: string } | null;
  const title = author ? `${author.display_name} (@${author.username}) on Orbit` : "Orbit";
  const description = post.caption?.trim()
    ? post.caption.slice(0, 200)
    : "Video, photo, and text — unified.";
  // Videos don't make a good static preview image without a separate
  // thumbnail (which the app doesn't generate), so those and text posts
  // fall back to the branded default card.
  const image = post.type === "photo" && post.media_urls?.[0] ? post.media_urls[0] : "/og-default.png";

  return {
    title,
    description,
    openGraph: { title, description, images: [image], type: "article" },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

export default function PostDetailPage() {
  return <PostDetailClient />;
}
