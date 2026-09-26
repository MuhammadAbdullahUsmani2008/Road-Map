create table public.user_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  device_name text not null check (char_length(trim(device_name)) between 1 and 80),
  device_type text not null check (device_type in ('laptop', 'phone', 'other')),
  credential_hash text not null unique,
  created_at timestamptz not null default timezone('utc', now()),
  last_seen_at timestamptz not null default timezone('utc', now()),
  revoked_at timestamptz
);

create index user_devices_user_active_idx on public.user_devices (user_id, revoked_at);
create index user_devices_user_last_seen_idx on public.user_devices (user_id, last_seen_at desc);

create or replace function public.enforce_user_device_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  active_device_count integer;
begin
  if new.revoked_at is null then
    perform pg_advisory_xact_lock(hashtextextended(new.user_id::text, 0));

    select count(*)
      into active_device_count
      from public.user_devices
     where user_id = new.user_id
       and revoked_at is null
       and id <> new.id;

    if active_device_count >= 2 then
      raise exception 'A maximum of two active devices is allowed.' using errcode = 'check_violation';
    end if;
  end if;

  return new;
end;
$$;

create trigger user_devices_enforce_limit
before insert or update of revoked_at on public.user_devices
for each row execute function public.enforce_user_device_limit();

alter table public.user_devices enable row level security;

create policy "user devices owner access" on public.user_devices
for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());