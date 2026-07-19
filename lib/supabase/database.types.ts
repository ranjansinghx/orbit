export type PostType = "video" | "photo" | "text";
export type NotificationType = "like" | "comment" | "follow" | "new_post" | "mention" | "repost" | "follow_request";
export type FollowStatus = "pending" | "accepted";
export type PostAudience = "everyone" | "followers" | "close_friends";
export type ReplyPermission = "everyone" | "followers" | "mentioned";

export interface Database {
  public: {
    Views: {
      hashtag_counts: {
        Row: { tag: string; post_count: number };
      };
    };
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          display_name: string;
          avatar_url: string;
          bio: string;
          created_at: string;
          is_admin: boolean;
          onboarded: boolean;
          is_private: boolean;
          pinned_post_id: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["profiles"]["Row"]> & { id: string; username: string };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Row"]>;
      };
      follows: {
        Row: { follower_id: string; followee_id: string; created_at: string; status: FollowStatus };
        Insert: { follower_id: string; followee_id: string; status?: FollowStatus };
        Update: Partial<{ status: FollowStatus }>;
      };
      posts: {
        Row: {
          id: string;
          author_id: string;
          type: PostType;
          media_urls: string[];
          caption: string;
          created_at: string;
          view_count: number;
          like_count: number;
          comment_count: number;
          share_count: number;
          watch_time_ratio: number;
          watch_sample_count: number;
          repost_count: number;
          edited_at: string | null;
          audience: PostAudience;
          reply_permission: ReplyPermission;
        };
        Insert: {
          author_id: string;
          type: PostType;
          media_urls?: string[];
          caption?: string;
          watch_time_ratio?: number;
          audience?: PostAudience;
          reply_permission?: ReplyPermission;
        };
        Update: Partial<Database["public"]["Tables"]["posts"]["Row"]>;
      };
      comments: {
        Row: {
          id: string;
          post_id: string;
          author_id: string;
          body: string;
          created_at: string;
          parent_comment_id: string | null;
          reply_count: number;
          like_count: number;
        };
        Insert: { post_id: string; author_id: string; body: string; parent_comment_id?: string | null };
        Update: never;
      };
      comment_likes: {
        Row: { user_id: string; comment_id: string; created_at: string };
        Insert: { user_id: string; comment_id: string };
        Update: never;
      };
      mutes: {
        Row: { user_id: string; muted_id: string; created_at: string };
        Insert: { user_id: string; muted_id: string };
        Update: never;
      };
      close_friends: {
        Row: { owner_id: string; friend_id: string; created_at: string };
        Insert: { owner_id: string; friend_id: string };
        Update: never;
      };
      polls: {
        Row: { id: string; post_id: string; closes_at: string | null; created_at: string };
        Insert: { post_id: string; closes_at?: string | null };
        Update: never;
      };
      poll_options: {
        Row: { id: string; poll_id: string; position: number; label: string; vote_count: number };
        Insert: { poll_id: string; position: number; label: string };
        Update: never;
      };
      poll_votes: {
        Row: { poll_id: string; option_id: string; user_id: string; created_at: string };
        Insert: { poll_id: string; option_id: string; user_id: string };
        Update: Partial<{ option_id: string }>;
      };
      collections: {
        Row: { id: string; user_id: string; name: string; created_at: string };
        Insert: { user_id: string; name: string };
        Update: Partial<{ name: string }>;
      };
      conversation_participants: {
        Row: { conversation_id: string; user_id: string; joined_at: string };
        Insert: { conversation_id: string; user_id: string };
        Update: never;
      };
      likes: {
        Row: { user_id: string; post_id: string; created_at: string };
        Insert: { user_id: string; post_id: string };
        Update: never;
      };
      conversations: {
        Row: {
          id: string;
          user_a_id: string;
          user_b_id: string | null;
          last_message_at: string;
          is_group: boolean;
          title: string | null;
          created_by: string | null;
        };
        Insert: { user_a_id: string; user_b_id: string };
        Update: Partial<{ title: string | null }>;
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          sender_id: string;
          body: string | null;
          media_url: string | null;
          created_at: string;
          delivered_at: string | null;
          read_at: string | null;
        };
        Insert: {
          conversation_id: string;
          sender_id: string;
          body?: string | null;
          media_url?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["messages"]["Row"]>;
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: NotificationType;
          actor_id: string;
          post_id: string | null;
          created_at: string;
          read_at: string | null;
        };
        Insert: never;
        Update: Partial<Database["public"]["Tables"]["notifications"]["Row"]>;
      };
      hashtags: {
        Row: { id: string; tag: string };
        Insert: { tag: string };
        Update: never;
      };
      post_hashtags: {
        Row: { post_id: string; hashtag_id: string };
        Insert: { post_id: string; hashtag_id: string };
        Update: never;
      };
      blocks: {
        Row: { blocker_id: string; blocked_id: string; created_at: string };
        Insert: { blocker_id: string; blocked_id: string };
        Update: never;
      };
      saved_posts: {
        Row: { user_id: string; post_id: string; created_at: string; collection_id: string | null };
        Insert: { user_id: string; post_id: string; collection_id?: string | null };
        Update: Partial<{ collection_id: string | null }>;
      };
      notification_preferences: {
        Row: {
          user_id: string;
          likes: boolean;
          comments: boolean;
          follows: boolean;
          new_post: boolean;
          mentions: boolean;
          reposts: boolean;
        };
        Insert: {
          user_id: string;
          likes?: boolean;
          comments?: boolean;
          follows?: boolean;
          new_post?: boolean;
          mentions?: boolean;
          reposts?: boolean;
        };
        Update: Partial<{
          likes: boolean;
          comments: boolean;
          follows: boolean;
          new_post: boolean;
          mentions: boolean;
          reposts: boolean;
        }>;
      };
      reports: {
        Row: {
          id: string;
          reporter_id: string;
          target_type: "post" | "user";
          target_id: string;
          reason: string;
          details: string | null;
          created_at: string;
          status: string;
        };
        Insert: {
          reporter_id: string;
          target_type: "post" | "user";
          target_id: string;
          reason: string;
          details?: string | null;
        };
        Update: { status?: string };
      };
      reposts: {
        Row: { user_id: string; post_id: string; created_at: string; quote: string | null };
        Insert: { user_id: string; post_id: string; quote?: string | null };
        Update: never;
      };
      drafts: {
        Row: {
          id: string;
          user_id: string;
          type: PostType;
          caption: string;
          media_urls: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: { user_id: string; type: PostType; caption?: string; media_urls?: string[] };
        Update: Partial<{ type: PostType; caption: string; media_urls: string[]; updated_at: string }>;
      };
      push_subscriptions: {
        Row: { id: string; user_id: string; endpoint: string; p256dh: string; auth: string; created_at: string };
        Insert: { user_id: string; endpoint: string; p256dh: string; auth: string };
        Update: never;
      };
    };
    Functions: {
      toggle_like: { Args: { p_post_id: string }; Returns: boolean };
      toggle_follow: { Args: { p_target_id: string }; Returns: boolean };
      record_watch_time: { Args: { p_post_id: string; p_ratio: number }; Returns: void };
      toggle_block: { Args: { p_target_id: string }; Returns: boolean };
      toggle_save: { Args: { p_post_id: string }; Returns: boolean };
      increment_view_count: { Args: { p_post_id: string }; Returns: void };
      increment_share_count: { Args: { p_post_id: string }; Returns: void };
      get_or_create_conversation: { Args: { p_other_id: string }; Returns: string };
      toggle_repost: { Args: { p_post_id: string; p_quote?: string | null }; Returns: boolean };
      toggle_mute: { Args: { p_target_id: string }; Returns: boolean };
      toggle_comment_like: { Args: { p_comment_id: string }; Returns: boolean };
      set_pinned_post: { Args: { p_post_id: string | null }; Returns: void };
      toggle_close_friend: { Args: { p_friend_id: string }; Returns: boolean };
      set_post_audience: { Args: { p_post_id: string; p_audience: PostAudience }; Returns: void };
      set_post_reply_permission: { Args: { p_post_id: string; p_permission: ReplyPermission }; Returns: void };
      create_poll: { Args: { p_post_id: string; p_options: string[]; p_closes_at?: string | null }; Returns: string };
      cast_poll_vote: { Args: { p_option_id: string }; Returns: void };
      get_poll_results: {
        Args: { p_post_id: string };
        Returns: {
          poll_id: string;
          closes_at: string | null;
          option_id: string;
          label: string;
          vote_count: number;
          total_votes: number;
          my_vote: boolean;
        }[];
      };
      create_collection: { Args: { p_name: string }; Returns: string };
      move_saved_post: { Args: { p_post_id: string; p_collection_id: string | null }; Returns: void };
      accept_follow_request: { Args: { p_follower_id: string }; Returns: void };
      reject_follow_request: { Args: { p_follower_id: string }; Returns: void };
      create_group_conversation: { Args: { p_title: string | null; p_member_ids: string[] }; Returns: string };
      leave_group_conversation: { Args: { p_conversation_id: string }; Returns: void };
      get_my_conversations: {
        Args: Record<string, never>;
        Returns: {
          id: string;
          is_group: boolean;
          title: string | null;
          last_message_at: string;
          other_user_id: string | null;
          member_count: number;
        }[];
      };
      get_following_feed: {
        Args: {
          p_viewer_id: string;
          p_cursor_ts?: string | null;
          p_cursor_id?: string | null;
          p_limit?: number;
        };
        Returns: {
          id: string;
          author_id: string;
          type: PostType;
          media_urls: string[];
          caption: string;
          created_at: string;
          view_count: number;
          like_count: number;
          comment_count: number;
          share_count: number;
          repost_count: number;
          watch_time_ratio: number;
          edited_at: string | null;
          effective_time: string;
          reposted_by: string | null;
          quote: string | null;
        }[];
      };
      get_for_you_feed: {
        Args: {
          p_viewer_id: string;
          p_cursor_score?: number | null;
          p_cursor_id?: string | null;
          p_limit?: number;
        };
        Returns: {
          id: string;
          author_id: string;
          type: PostType;
          media_urls: string[];
          caption: string;
          created_at: string;
          view_count: number;
          like_count: number;
          comment_count: number;
          share_count: number;
          watch_time_ratio: number;
          score: number;
        }[];
      };
    };
  };
}
