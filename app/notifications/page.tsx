"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useCurrentProfile } from "@/lib/supabase/useAuth";
import { useNotifications, useProfilesMap, usePost } from "@/lib/supabase/hooks";
import { markNotificationsRead, acceptFollowRequest, rejectFollowRequest } from "@/lib/supabase/actions";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";
import Avatar from "@/components/Avatar";
import { timeAgo } from "@/lib/format";
import { HeartIcon, CommentIcon, ProfileIcon, VideoIcon, AtIcon, RepostIcon, LockIcon } from "@/components/icons";
import clsx from "clsx";

function copyFor(type: string) {
  switch (type) {
    case "like":
      return "liked your post";
    case "comment":
      return "commented on your post";
    case "follow":
      return "started following you";
    case "follow_request":
      return "requested to follow you";
    case "new_post":
      return "shared a new post";
    case "mention":
      return "mentioned you";
    case "repost":
      return "reposted your post";
    default:
      return "";
  }
}

function NotificationIcon({ type }: { type: string }) {
  if (type === "like") return <HeartIcon filled size={18} />;
  if (type === "comment") return <CommentIcon size={18} />;
  if (type === "follow") return <ProfileIcon active size={18} />;
  if (type === "follow_request") return <LockIcon size={15} />;
  if (type === "mention") return <AtIcon size={16} className="text-paper" />;
  if (type === "repost") return <RepostIcon active size={16} />;
  return <VideoIcon size={18} />;
}

interface NotificationGroup {
  id: string; // key of the first notification in the group
  type: string;
  postId: string | null;
  actorIds: string[];
  createdAt: string;
  allRead: boolean;
}

const GROUPABLE_TYPES = new Set(["like", "repost"]);

/** Merges consecutive same-type-same-post notifications ("like" and
 * "repost" only — every other type stays one row per event since each
 * genuinely needs its own attention, e.g. a follow request or a specific
 * comment). Consecutive-only keeps this a cheap linear pass with no
 * re-sorting, and matches how the feed already arrives newest-first. */
function groupNotifications(notifications: any[]): NotificationGroup[] {
  const groups: NotificationGroup[] = [];
  for (const n of notifications) {
    const last = groups[groups.length - 1];
    if (last && GROUPABLE_TYPES.has(n.type) && last.type === n.type && last.postId === n.post_id) {
      last.actorIds.push(n.actor_id);
      last.allRead = last.allRead && !!n.read_at;
      continue;
    }
    groups.push({
      id: n.id,
      type: n.type,
      postId: n.post_id,
      actorIds: [n.actor_id],
      createdAt: n.created_at,
      allRead: !!n.read_at,
    });
  }
  return groups;
}

function GroupedNotificationRow({ group }: { group: NotificationGroup }) {
  const actors = useProfilesMap(group.actorIds);
  const { post } = usePost(group.postId ?? undefined, null);
  const primary = actors[group.actorIds[0]];
  if (!primary) return null;

  const others = group.actorIds.length - 1;
  const verb = group.type === "like" ? "liked your post" : "reposted your post";
  const href = group.postId ? `/post/${group.postId}` : "#";

  return (
    <Link
      href={href}
      className={clsx(
        "flex items-center gap-3 px-5 py-4 border-b border-line hover:bg-surface/40 transition-colors",
        !group.allRead && "bg-surface/30"
      )}
    >
      <div className="relative shrink-0 flex items-center">
        {group.actorIds.slice(0, 3).map((id, i) => {
          const a = actors[id];
          if (!a) return null;
          return (
            <div key={id} style={{ marginLeft: i === 0 ? 0 : -14, zIndex: 3 - i }} className="relative">
              <Avatar src={a.avatar_url} alt={a.display_name} size={i === 0 ? 44 : 30} />
            </div>
          );
        })}
        <span className="absolute -bottom-1 -right-1 bg-surface2 rounded-full p-1 border border-line">
          <NotificationIcon type={group.type} />
        </span>
      </div>
      <p className="text-sm flex-1">
        <span className="font-semibold">{primary.display_name}</span>
        {others > 0 && <span className="text-paper/85"> and {others} other{others === 1 ? "" : "s"}</span>}{" "}
        <span className="text-paper/85">{verb}</span>
        {post && (
          <span className="text-muted"> · {post.caption.slice(0, 40)}</span>
        )}
      </p>
      {post && post.type === "photo" && post.media_urls[0] && (
        <img src={post.media_urls[0]} alt="" className="w-11 h-11 rounded-md object-cover shrink-0" />
      )}
      <span className="text-[11px] text-muted font-mono shrink-0">{timeAgo(group.createdAt)}</span>
      {!group.allRead && <span className="w-2 h-2 rounded-full bg-video shrink-0" />}
    </Link>
  );
}

function NotificationRow({ n, actorId, postId }: { n: any; actorId: string; postId: string | null }) {
  const actors = useProfilesMap([actorId]);
  const actor = actors[actorId];
  const { post } = usePost(postId ?? undefined, null);
  const [resolved, setResolved] = useState<"accepted" | "rejected" | null>(null);
  const [busy, setBusy] = useState(false);

  if (!actor) return null;
  const href = n.type === "follow" || n.type === "follow_request" ? `/profile/${actor.username}` : postId ? `/post/${postId}` : "#";

  async function handleAccept(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setBusy(true);
    try {
      await acceptFollowRequest(actorId);
      setResolved("accepted");
    } catch (err) {
      console.error(err);
    } finally {
      setBusy(false);
    }
  }

  async function handleReject(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setBusy(true);
    try {
      await rejectFollowRequest(actorId);
      setResolved("rejected");
    } catch (err) {
      console.error(err);
    } finally {
      setBusy(false);
    }
  }

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
      {n.type === "follow_request" && !resolved && (
        <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.preventDefault()}>
          <button
            onClick={handleReject}
            disabled={busy}
            className="px-3 py-1.5 rounded-full border border-line text-xs font-medium hover:border-muted transition-colors disabled:opacity-50"
          >
            Decline
          </button>
          <button
            onClick={handleAccept}
            disabled={busy}
            className="px-3 py-1.5 rounded-full bg-paper text-ink text-xs font-semibold disabled:opacity-50"
          >
            Accept
          </button>
        </div>
      )}
      {n.type === "follow_request" && resolved && (
        <span className="text-xs text-muted shrink-0">{resolved === "accepted" ? "Accepted" : "Declined"}</span>
      )}
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
  const groups = groupNotifications(notifications);

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
        <EmptyState
          title="Nothing yet"
          body="Likes, comments, and new followers will show up here."
        />
      )}
      {groups.map((g) =>
        g.actorIds.length > 1 ? (
          <GroupedNotificationRow key={g.id} group={g} />
        ) : (
          <NotificationRow key={g.id} n={notifications.find((n) => n.id === g.id)} actorId={g.actorIds[0]} postId={g.postId} />
        )
      )}
    </div>
  );
}
