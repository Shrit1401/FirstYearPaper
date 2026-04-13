-- Repeat index tables: server reads via service_role only. RLS is enabled with no policies for
-- anon/authenticated, but revoking explicit table privileges is defense in depth if defaults change.

revoke all on table public.repeat_index_meta from anon, authenticated;
revoke all on table public.repeat_papers from anon, authenticated;
revoke all on table public.repeat_chunks from anon, authenticated;
