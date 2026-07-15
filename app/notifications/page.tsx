"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useCurrentProfile } from "@/lib/supabase/useAuth";
import { useNotifications, useProfilesMap, usePost } from "@/lib/supabase/hooks";
import { markNotificationsRead } from "@/lib/supabase/actions";
import PageHeader from "@/components/PageHeader";
import Avatar from "@/components/Avatar";
import { timeAgo } from "@/lib/format";
import { HeartIcon, CommentIcon, ProfileIcon, VideoIcon, AtIcon } from "@/components/icons";
import clsx from "clsx";

function copyFor(type: string) {
  switch (type) {
    case "like":
      return "liked your post";
    case "comment":
      return "commented on your post";
    case "follow":
      return "started following you";
    case "new_post":
      return "shared a new post";
    case "mention":
      return "mentioned you";
    default:
      return "";
  }
}

function NotificationIcon({ type }: { type: string }) {
  if (type === "like") return <HeartIcon filled size={18} />;
  if (type === "comment") return <CommentIcon size={18} />;
  if (type === "follow") return <ProfileIcon active size={18} />;
  if (type === "mention") return <AtIcon size={16} className="text-paper" />;
  return <VideoIcon size={18} />;
}

function NotificationRow({ n, actorId, postId }: { n: any; actorId: string; postId: string | null }) {
  const actors = useProfilesMap([actorId]);
  const actor = actors[actorId];
  const { post } = usePost(postId ?? undefined, null);

  if (!actor) return null;
  const href = n.type === "follow" ? `/profile/${actor.username}` : postId ? `/post/${postId}` : "#";

  return (
    <Link
      href={href}
      className={clsx(
        "flex items-center gap-3 px-5 py-4 border-b border-line hover:bg-surface/40 transition-colors",
        !n.read_at && "bg-surface/30"
      )}
    >
      <div className="relative shrink-0">
        <Avatar src={actor.avatar_url} alt={actor.display_name} size={44} />
        <span className="absolute -bottom-1 -right-1 bg-surface2 rounded-full p-1 border border-line">
          <NotificationIcon type={n.type} />
        </span>
      </div>
      <p className="text-sm flex-1">
        <span className="font-semibold">{actor.display_name}</span>{" "}
        <span className="text-paper/85">{copyFor(n.type)}</span>
        {post && (post.type !== "text" || n.type === "mention") && (
          <span className="text-muted"> · {post.caption.slice(0, 40)}</span>
        )}
      </p>
      {post && post.type === "photo" && post.media_urls[0] && (
        <img src={post.media_urls[0]} alt="" className="w-11 h-11 rounded-md object-cover shrink-0" />
      )}
      <span className="text-[11px] text-muted font-mono shrink-0">{timeAgo(n.created_at)}</span>
      {!n.read_at && <span className="w-2 h-2 rounded-full bg-video shrink-0" />}
    </Link>
  );
}

export default function NotificationsPage() {
  const { userId } = useCurrentProfile();
  const { notifications, mutate } = useNotifications(userId);

  useEffect(() => {
    if (!userId) return;
    const t = setTimeout(async () => {
      await markNotificationsRead(userId);
      mutate();
    }, 900);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  return (
    <div className="max-w-2xl mx-auto border-x border-line min-h-screen">
      <PageHeader title="Notifications" />
      {notifications.length === 0 && (
        <p className="text-center text-muted py-16">Nothing yet — you&apos;ll see likes, comments, and new followers here.</p>
      )}
      {notifications.map((n) => (
        <NotificationRow key={n.id} n={n} actorId={n.actor_id} postId={n.post_id} />
      ))}
    </div>
  );
}
