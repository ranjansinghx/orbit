import { FeedPost } from "@/lib/supabase/hooks";

export const RANKING_WEIGHTS = {
  like: 1,
  comment: 2,
  share: 3,
  watchTime: 5,
  ageDecay: 0.12,
  followedBoost: 1.15,
};

function ageInHours(createdAt: string) {
  return (Date.now() - new Date(createdAt).getTime()) / 3_600_000;
}

export function scoreFeedPost(post: FeedPost, isFollowedAuthor: boolean) {
  const { like, comment, share, watchTime, ageDecay, followedBoost } = RANKING_WEIGHTS;
  const base =
    post.like_count * like +
    post.comment_count * comment +
    post.share_count * share +
    post.watch_time_ratio * watchTime * 100 -
    ageInHours(post.created_at) * ageDecay;
  return isFollowedAuthor ? base * followedBoost : base;
}

export function sortForYou(posts: FeedPost[], followingIds: Set<string>) {
  return [...posts]
    .filter((p) => p.type === "video" || p.type === "photo")
    .sort(
      (a, b) =>
        scoreFeedPost(b, followingIds.has(b.author_id)) - scoreFeedPost(a, followingIds.has(a.author_id))
    );
}
