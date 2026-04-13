-- Repeat: PDF storage bucket, paper metadata, chunk embeddings (pgvector), and similarity RPC.
-- Default dimension 4096 matches Qwen3-Embedding-8B full output; change vector(4096) if your embedding model differs.

create extension if not exists vector with schema extensions;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'papers',
  'papers',
  true,
  52428800,
  array['application/pdf']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "papers_public_read" on storage.objects;
create policy "papers_public_read"
on storage.objects
for select
to public
using (bucket_id = 'papers');

create table if not exists public.repeat_index_meta (
  id smallint primary key default 1 check (id = 1),
  version smallint not null default 3,
  generated_at timestamptz not null,
  embedding_model text not null,
  embedding_dims integer not null default 4096,
  failures jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.repeat_papers (
  paper_id text primary key,
  href text not null,
  paper_name text not null,
  normalized_year integer,
  source_type text not null,
  subject_key text not null,
  subject_name text not null,
  subject_label text not null,
  collection_label text not null,
  year_label text,
  sem_label text,
  branch_name text,
  exam_type text,
  stream_name text,
  page_count integer not null default 0,
  extraction_method text not null default 'pdf-text',
  full_text text,
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.repeat_chunks (
  chunk_id text primary key,
  paper_id text not null references public.repeat_papers (paper_id) on delete cascade,
  href text not null,
  page_start integer not null,
  page_end integer not null,
  chunk_index integer not null,
  text text not null,
  chunk_type text,
  diagram_signals text[],
  visual_context text,
  question_type text,
  answer_mode text,
  topic text,
  subtopic text,
  marks_band text,
  cluster_id text,
  occurrence_count integer not null default 1,
  embedding extensions.vector(4096) not null,
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists repeat_chunks_paper_id_idx on public.repeat_chunks (paper_id);

-- Note: pgvector HNSW currently caps at 2000 dims for type `vector`; these embeddings are 4096 (Qwen3-Embedding-8B).
-- Without an ANN index, similarity search uses a sequential scan (fine for modest chunk counts). For large corpora,
-- consider `halfvec(4096)` + HNSW or a lower-dimensional embedding model.

alter table public.repeat_index_meta enable row level security;
alter table public.repeat_papers enable row level security;
alter table public.repeat_chunks enable row level security;

-- No policies: only service_role (bypasses RLS) and postgres can access from the app server.

create or replace function public.match_repeat_chunks(
  query_embedding extensions.vector(4096),
  filter_paper_ids text[],
  match_count integer
)
returns table (
  chunk_id text,
  similarity double precision
)
language sql
stable
set search_path = public, extensions
as $$
  select
    c.chunk_id,
    (1 - (c.embedding <=> query_embedding))::double precision as similarity
  from public.repeat_chunks c
  where c.paper_id = any(filter_paper_ids)
  order by c.embedding <=> query_embedding
  limit least(coalesce(match_count, 500), 5000);
$$;

grant execute on function public.match_repeat_chunks(extensions.vector(4096), text[], integer) to service_role;

-- Full re-sync from the Node script (service role only).
create or replace function public.repeat_truncate_for_sync()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- One TRUNCATE lists both tables so FK between them is satisfied (avoids bare DELETE without WHERE on Supabase).
  truncate table public.repeat_chunks, public.repeat_papers;
end;
$$;

grant execute on function public.repeat_truncate_for_sync() to service_role;
