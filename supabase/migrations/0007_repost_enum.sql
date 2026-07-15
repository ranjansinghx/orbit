-- =========================================================================
-- Orbit — add 'repost' notification type
-- Run BEFORE 0008_reposts.sql, as its own statement/transaction.
-- =========================================================================

alter type public.notification_type add value if not exists 'repost';
