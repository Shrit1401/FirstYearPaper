-- Fix: TRUNCATE repeat_papers alone failed (FK from repeat_chunks).
-- Fix: bare DELETE without WHERE is blocked on Supabase — truncate both tables in one statement.

create or replace function public.repeat_truncate_for_sync()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  truncate table public.repeat_chunks, public.repeat_papers;
end;
$$;
