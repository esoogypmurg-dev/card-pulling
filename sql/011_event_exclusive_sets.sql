-- Sets that are visible in Collection/Binder once owned, but can never be
-- bought, packed, or randomly won — only obtainable via their specific event
-- (e.g. Team Rocket). Distinct from `hidden`, which hides a set entirely.
alter table public.sets add column if not exists event_exclusive boolean not null default false;

update public.sets set hidden = false, event_exclusive = true where code = 'TR';
