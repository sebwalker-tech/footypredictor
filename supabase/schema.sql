create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  app_user_id text not null unique,
  full_name text not null,
  email text not null unique,
  is_admin boolean not null default false,
  total_points integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Players can read profiles" on public.profiles;
create policy "Players can read profiles"
on public.profiles
for select
to authenticated
using (true);

drop policy if exists "Players can update their own profile" on public.profiles;
create policy "Players can update their own profile"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "Admins can manage profiles" on public.profiles;
create policy "Admins can manage profiles"
on public.profiles
for all
to authenticated
using (
  exists (
    select 1
    from public.profiles admin_profile
    where admin_profile.id = auth.uid()
      and admin_profile.is_admin = true
  )
)
with check (
  exists (
    select 1
    from public.profiles admin_profile
    where admin_profile.id = auth.uid()
      and admin_profile.is_admin = true
  )
);
