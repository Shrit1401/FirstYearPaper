create table if not exists public.user_stats (
  user_id uuid primary key references public.users (id) on delete cascade,
  session_count integer not null default 0,
  total_time_spent_seconds integer not null default 0,
  papers_this_week integer not null default 0,
  total_unique_papers integer not null default 0,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.user_paper_views (
  user_id uuid not null references public.users (id) on delete cascade,
  href text not null,
  name text not null,
  count integer not null default 1,
  first_viewed_at timestamptz not null,
  last_viewed_at timestamptz not null,
  viewed_at jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  primary key (user_id, href)
);

alter table public.user_stats enable row level security;
alter table public.user_paper_views enable row level security;

drop policy if exists "user_stats_select_own_row" on public.user_stats;
create policy "user_stats_select_own_row"
on public.user_stats
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "user_stats_insert_own_row" on public.user_stats;
create policy "user_stats_insert_own_row"
on public.user_stats
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "user_stats_update_own_row" on public.user_stats;
create policy "user_stats_update_own_row"
on public.user_stats
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "user_paper_views_select_own_rows" on public.user_paper_views;
create policy "user_paper_views_select_own_rows"
on public.user_paper_views
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "user_paper_views_insert_own_rows" on public.user_paper_views;
create policy "user_paper_views_insert_own_rows"
on public.user_paper_views
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "user_paper_views_update_own_rows" on public.user_paper_views;
create policy "user_paper_views_update_own_rows"
on public.user_paper_views
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop trigger if exists handle_user_stats_updated_at on public.user_stats;
create trigger handle_user_stats_updated_at
before update on public.user_stats
for each row
execute function extensions.moddatetime(updated_at);

drop trigger if exists handle_user_paper_views_updated_at on public.user_paper_views;
create trigger handle_user_paper_views_updated_at
before update on public.user_paper_views
for each row
execute function extensions.moddatetime(updated_at);
