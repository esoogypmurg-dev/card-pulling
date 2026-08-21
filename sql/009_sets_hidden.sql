-- Adds a hidden flag to `sets` so new sets can be staged before going live.
-- Run once in the Supabase SQL Editor. Safe to re-run.
alter table public.sets add column if not exists hidden boolean not null default false;

-- Only touches UPDATE permission; does not change existing SELECT policies or
-- enable/disable RLS. Harmless if `sets` doesn't already use RLS.
drop policy if exists "sets_admin_update" on public.sets;
create policy "sets_admin_update" on public.sets for update to authenticated
using (exists (select 1 from public.profiles p where p.id=auth.uid() and p.is_admin=true))
with check (exists (select 1 from public.profiles p where p.id=auth.uid() and p.is_admin=true));
