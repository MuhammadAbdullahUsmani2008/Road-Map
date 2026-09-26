-- Phase 10: YouTube Automation business track.
-- Additive only. No existing data is modified or dropped.
--
-- Design notes:
--  * youtube_channels holds channel/project info AND strategy fields (both are
--    single-row-per-user singletons, so one table avoids duplicate concepts).
--  * youtube_videos is the content pipeline / video-ideas store. A video idea is
--    a content item that moves through pipeline stages, so one table covers both.
--  * youtube_metrics is a dedicated metrics table rather than reusing
--    business_metrics, because business_metrics has a (user_id, metric_date, name)
--    unique constraint and feeds the generic e-commerce "Business snapshot" on the
--    dashboard. Mixing YouTube metrics there would risk unique-constraint collisions
--    and pollute the e-commerce snapshot.
--  * milestones is reused via an additive nullable "track" column so YouTube
--    milestones can be distinguished from e-commerce milestones.

create table public.youtube_channels (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  channel_name text,
  channel_url text,
  niche text,
  target_audience text,
  content_format text,
  primary_objective text,
  publishing_cadence text,
  status text not null default 'planning' check (status in ('planning', 'active', 'paused', 'archived')),
  notes text,
  content_angle text,
  value_proposition text,
  production_workflow text,
  monetization_plan text,
  strategic_focus text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id)
);

create table public.youtube_videos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  notes text,
  stage text not null default 'idea' check (stage in ('idea', 'research', 'script', 'voice', 'edit', 'thumbnail', 'ready', 'published')),
  priority smallint not null default 3 check (priority between 1 and 5),
  target_publish_date date,
  task_id uuid references public.tasks(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.youtube_metrics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  metric_date date not null,
  name text not null,
  value numeric not null,
  unit text,
  note text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, metric_date, name)
);

alter table public.milestones add column track text;

create index youtube_videos_user_stage_idx on public.youtube_videos (user_id, stage);
create index youtube_videos_user_created_idx on public.youtube_videos (user_id, created_at desc);
create index youtube_metrics_user_date_idx on public.youtube_metrics (user_id, metric_date);

create trigger youtube_channels_set_updated_at before update on public.youtube_channels
for each row execute function public.set_updated_at();
create trigger youtube_videos_set_updated_at before update on public.youtube_videos
for each row execute function public.set_updated_at();
create trigger youtube_metrics_set_updated_at before update on public.youtube_metrics
for each row execute function public.set_updated_at();

alter table public.youtube_channels enable row level security;
alter table public.youtube_videos enable row level security;
alter table public.youtube_metrics enable row level security;

create policy "youtube channels owner access" on public.youtube_channels
for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "youtube videos owner access" on public.youtube_videos
for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "youtube metrics owner access" on public.youtube_metrics
for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());
