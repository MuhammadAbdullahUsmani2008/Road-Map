-- Phase 16A: Live Motivation Engine
-- Persistent storage for cached external motivation content and shown-history tracking.
-- Both tables follow the existing private-user architecture with RLS.

-- Cached live motivation items from external sources
create table public.live_motivation_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  source text not null,
  source_url text,
  author text,
  external_id text,
  content_hash text not null,
  published_at timestamptz,
  fetched_at timestamptz not null default timezone('utc', now()),
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- Tracks which live items have been shown to the user (for long-term deduplication)
create table public.live_motivation_shown (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  live_item_id uuid not null references public.live_motivation_items(id) on delete cascade,
  shown_on date not null,
  created_at timestamptz not null default timezone('utc', now())
);

-- Indexes for common queries
create index live_motivation_items_user_id_idx on public.live_motivation_items (user_id);
create index live_motivation_items_content_hash_idx on public.live_motivation_items (content_hash);
create index live_motivation_items_fetched_at_idx on public.live_motivation_items (fetched_at);
create index live_motivation_shown_user_item_idx on public.live_motivation_shown (user_id, live_item_id);
create index live_motivation_shown_user_shown_on_idx on public.live_motivation_shown (user_id, shown_on desc);

-- Triggers for updated_at
create trigger live_motivation_items_set_updated_at before update on public.live_motivation_items
for each row execute function public.set_updated_at();

-- Enable RLS
alter table public.live_motivation_items enable row level security;
alter table public.live_motivation_shown enable row level security;

-- RLS policies: owner-only access (matching existing pattern)
create policy "live motivation items owner access" on public.live_motivation_items
for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "live motivation shown owner access" on public.live_motivation_shown
for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
