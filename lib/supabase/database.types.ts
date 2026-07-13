export type PostType = "video" | "photo" | "text";
export type NotificationType = "like" | "comment" | "follow" | "new_post";

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
        };
        Insert: Partial<Database["public"]["Tables"]["profiles"]["Row"]> & { id: string; username: string };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Row"]>;
      };
      follows: {
        Row: { follower_id: string; followee_id: string; created_at: string };
        Insert: { follower_id: string; followee_id: string };
        Update: never;
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
        };
        Insert: {
          author_id: string;
          type: PostType;
          media_urls?: string[];
          caption?: string;
          watch_time_ratio?: number;
        };
        Update: Partial<Database["public"]["Tables"]["posts"]["Row"]>;
      };
      comments: {
        Row: { id: string; post_id: string; author_id: string; body: string; created_at: string };
        Insert: { post_id: string; author_id: string; body: string };
        Update: never;
      };
      likes: {
        Row: { user_id: string; post_id: string; created_at: string };
        Insert: { user_id: string; post_id: string };
        Update: never;
      };
      conversations: {
        Row: { id: string; user_a_id: string; user_b_id: string; last_message_at: string };
        Insert: { user_a_id: string; user_b_id: string };
        Update: never;
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
        Row: { user_id: string; post_id: string; created_at: string };
        Insert: { user_id: string; post_id: string };
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
