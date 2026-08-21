-- Adds the columns the admin "Publish update notice" and "Force refresh all
-- players" panels write to. Both were added in js/notifications.js without a
-- matching migration, so shop_settings.id=1 upserts were silently failing
-- (or throwing "column does not exist") whenever an admin tried to publish
-- one — this is why players never saw the notice.
alter table shop_settings add column if not exists app_notice jsonb;
alter table shop_settings add column if not exists force_refresh_at timestamptz;
