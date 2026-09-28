-- Phase 12: Execution Intelligence & Decision Center.
-- Additive only. No existing data is modified or dropped.
--
-- 1. tasks.track — mirrors the existing milestones.track column so tasks can be
--    attributed to a business track (E-Commerce / YouTube Automation /
--    Operating System) for the track breakdown. Nullable; existing rows are
--    unaffected (the intelligence loader infers track from import_key as a
--    fallback for the seeded Week 1 tasks).
-- 2. decision_notes — a lightweight store for the user's own reasoning during
--    reviews (observation / evidence / decision / reason / follow-up). No
--    existing table represents this structure.

alter table public.tasks add column track text;

create table public.decision_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  observation text,
  evidence text,
  decision text,
  reason text,
  follow_up text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index decision_notes_user_created_idx on public.decision_notes (user_id, created_at desc);

create trigger decision_notes_set_updated_at before update on public.decision_notes
for each row execute function public.set_updated_at();

alter table public.decision_notes enable row level security;

create policy "decision notes owner access" on public.decision_notes
for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());
