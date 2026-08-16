-- Stage 17 - Vector Memory
-- Extends the existing trade_embeddings foundation without deleting data.

create extension if not exists vector;

alter table if exists public.trade_embeddings
  add column if not exists content text not null default '',
  add column if not exists summary text,
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists updated_at timestamptz not null default now();

create unique index if not exists trade_embeddings_user_trade_unique_idx
  on public.trade_embeddings (user_id, trade_id);

create index if not exists trade_embeddings_trade_id_idx
  on public.trade_embeddings (trade_id);

create index if not exists trade_embeddings_embedding_hnsw_idx
  on public.trade_embeddings
  using hnsw (embedding vector_cosine_ops)
  where embedding is not null;

alter table public.trade_embeddings enable row level security;

grant select, insert, update, delete on public.trade_embeddings to authenticated;

drop policy if exists "Users can select own trade_embeddings" on public.trade_embeddings;
drop policy if exists "Users can insert own trade_embeddings" on public.trade_embeddings;
drop policy if exists "Users can update own trade_embeddings" on public.trade_embeddings;
drop policy if exists "Users can delete own trade_embeddings" on public.trade_embeddings;

create policy "Users can select own trade_embeddings"
  on public.trade_embeddings for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can insert own trade_embeddings"
  on public.trade_embeddings for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update own trade_embeddings"
  on public.trade_embeddings for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete own trade_embeddings"
  on public.trade_embeddings for delete
  to authenticated
  using ((select auth.uid()) = user_id);

create or replace function public.match_trade_memories_for_trade(
  p_trade_id uuid,
  p_match_count integer default 3,
  p_match_threshold double precision default 0.45
)
returns table (
  memory_id uuid,
  trade_id uuid,
  similarity double precision,
  summary text,
  metadata jsonb,
  embedding_model text,
  created_at timestamptz
)
language sql
stable
security invoker
set search_path = ''
as $$
  with query_memory as (
    select source.embedding
    from public.trade_embeddings as source
    where source.trade_id = p_trade_id
      and source.user_id = (select auth.uid())
      and source.embedding is not null
    limit 1
  )
  select
    candidate.id as memory_id,
    candidate.trade_id,
    1 - (candidate.embedding OPERATOR(public.<=>) query_memory.embedding) as similarity,
    candidate.summary,
    candidate.metadata,
    candidate.embedding_model,
    candidate.created_at
  from public.trade_embeddings as candidate
  cross join query_memory
  where candidate.user_id = (select auth.uid())
    and candidate.trade_id <> p_trade_id
    and candidate.embedding is not null
    and 1 - (candidate.embedding OPERATOR(public.<=>) query_memory.embedding) >= greatest(0, least(1, p_match_threshold))
  order by candidate.embedding OPERATOR(public.<=>) query_memory.embedding
  limit least(greatest(coalesce(p_match_count, 3), 1), 10);
$$;

revoke all on function public.match_trade_memories_for_trade(uuid, integer, double precision) from public;
grant execute on function public.match_trade_memories_for_trade(uuid, integer, double precision) to authenticated;
