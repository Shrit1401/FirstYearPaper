-- Supabase blocks DELETE without WHERE; truncating only `repeat_papers` hits FK errors.
-- Truncating both tables in one statement satisfies FKs and avoids unconstrained DELETE.

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
