-- =========================================================================
-- Orbit — add 'mention' notification type
-- Run this BEFORE 0006_mentions.sql, as its own statement/transaction.
-- (Postgres doesn't allow a newly added enum value to be used in the same
-- transaction that added it, so this is split into two migration files.)
-- =========================================================================

alter type public.notification_type add value if not exists 'mention';
