alter table public.payment_transactions
  alter column transaction_id drop not null;

alter table public.payment_transactions
  alter column status set default 'needs_manual_review';

alter table public.payment_transactions
  add column if not exists proof_path text,
  add column if not exists verification_source text not null default 'manual',
  add column if not exists verification_confidence double precision,
  add column if not exists verification_score double precision,
  add column if not exists verification_notes text,
  add column if not exists ai_payload jsonb;

insert into storage.buckets (id, name, public)
values ('payment-proofs', 'payment-proofs', false)
on conflict (id) do nothing;
