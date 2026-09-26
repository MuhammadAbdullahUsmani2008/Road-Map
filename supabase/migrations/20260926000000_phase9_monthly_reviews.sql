-- Phase 9: Monthly review support.
-- Adds a single additive table for monthly reflection. No existing data is modified.

create table public.monthly_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  month_start date not null,
  wins text,
  misses text,
  blockers text,
  lessons text,
  next_objective text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, month_start)
);

create index monthly_reviews_user_month_idx on public.monthly_reviews (user_id, month_start);

create trigger monthly_reviews_set_updated_at before update on public.monthly_reviews
for each row execute function public.set_updated_at();

alter table public.monthly_reviews enable row level security;

create policy "monthly reviews owner access" on public.monthly_reviews
for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());
