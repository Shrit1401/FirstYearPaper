create table if not exists public.payment_transactions (
  id bigserial primary key,
  user_id uuid not null references public.users (id) on delete cascade,
  transaction_id text not null,
  status text not null default 'submitted',
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create unique index if not exists payment_transactions_transaction_id_unique
on public.payment_transactions (transaction_id);

create index if not exists payment_transactions_user_created_idx
on public.payment_transactions (user_id, created_at desc);

alter table public.payment_transactions enable row level security;

drop policy if exists "payment_transactions_select_own" on public.payment_transactions;
create policy "payment_transactions_select_own"
on public.payment_transactions
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "payment_transactions_insert_own" on public.payment_transactions;
create policy "payment_transactions_insert_own"
on public.payment_transactions
for insert
to authenticated
with check (auth.uid() = user_id);

drop trigger if exists handle_payment_transactions_updated_at on public.payment_transactions;
create trigger handle_payment_transactions_updated_at
before update on public.payment_transactions
for each row
execute function extensions.moddatetime(updated_at);
