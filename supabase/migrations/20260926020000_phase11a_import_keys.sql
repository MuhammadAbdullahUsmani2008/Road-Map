-- Phase 11A: Master roadmap seeding / import infrastructure.
-- Additive only. No existing data is modified or dropped.
--
-- Adds a nullable `import_key` column to the roadmap hierarchy tables (plus
-- tasks and milestones) so the importer can upsert idempotently. A partial
-- unique index per table enforces uniqueness only when import_key is present,
-- so existing rows (with NULL import_key) are unaffected.

alter table public.goals add column import_key text;
alter table public.roadmap_years add column import_key text;
alter table public.roadmap_phases add column import_key text;
alter table public.roadmap_months add column import_key text;
alter table public.roadmap_weeks add column import_key text;
alter table public.tasks add column import_key text;
alter table public.milestones add column import_key text;

create unique index goals_user_import_key_idx on public.goals (user_id, import_key) where import_key is not null;
create unique index roadmap_years_user_import_key_idx on public.roadmap_years (user_id, import_key) where import_key is not null;
create unique index roadmap_phases_user_import_key_idx on public.roadmap_phases (user_id, import_key) where import_key is not null;
create unique index roadmap_months_user_import_key_idx on public.roadmap_months (user_id, import_key) where import_key is not null;
create unique index roadmap_weeks_user_import_key_idx on public.roadmap_weeks (user_id, import_key) where import_key is not null;
create unique index tasks_user_import_key_idx on public.tasks (user_id, import_key) where import_key is not null;
create unique index milestones_user_import_key_idx on public.milestones (user_id, import_key) where import_key is not null;
