-- =========================================================================
-- Orbit — new notification type for private-account follow requests
-- Postgres won't let a new enum value be used in the same transaction that
-- created it, so this is split into its own file — same pattern as
-- 0005_mention_enum.sql / 0007_repost_enum.sql. Run this AFTER
-- 0014_pin_edit_quote.sql, then move on to 0016_private_accounts.sql.
-- =========================================================================

alter type public.notification_type add value if not exists 'follow_request';
