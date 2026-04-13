create extension if not exists moddatetime schema extensions;

create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  year text,
  semester text,
  is_paid boolean not null default false,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

alter table public.users enable row level security;

drop policy if exists "users_select_own_row" on public.users;
create policy "users_select_own_row"
on public.users
for select
to authenticated
using (auth.uid() = id);

drop policy if exists "users_insert_own_row" on public.users;
create policy "users_insert_own_row"
on public.users
for insert
to authenticated
with check (auth.uid() = id);

drop policy if exists "users_update_own_non_paid_fields" on public.users;
create policy "users_update_own_non_paid_fields"
on public.users
for update
to authenticated
using (auth.uid() = id)
with check (
  auth.uid() = id
  and is_paid = (select u.is_paid from public.users as u where u.id = auth.uid())
);

drop trigger if exists handle_users_updated_at on public.users;
create trigger handle_users_updated_at
before update on public.users
for each row
execute function extensions.moddatetime(updated_at);

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, full_name)
  values (
    new.id,
    new.email,
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), '')
  )
  on conflict (id) do update
  set
    email = excluded.email,
    full_name = coalesce(excluded.full_name, public.users.full_name);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_auth_user();
