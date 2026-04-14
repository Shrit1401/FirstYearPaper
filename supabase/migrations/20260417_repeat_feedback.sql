create table if not exists public.repeat_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete set null,
  session_id text not null,
  subject_key text,
  query_text text,
  answer_id text not null,
  value text not null,
  cluster_id text,
  created_at timestamptz not null default now()
);

alter table public.repeat_feedback enable row level security;
