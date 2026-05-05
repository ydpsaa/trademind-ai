-- Stage 12.0 Product Data Model Upgrade
-- Safe foundation patch only. Do not drop existing tables or data.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.ai_usage_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  feature text not null,
  provider text,
  model text,
  generation_source text,
  input_tokens integer,
  output_tokens integer,
  estimated_cost numeric,
  status text default 'success',
  error_message text,
  created_at timestamptz default now()
);

alter table if exists public.ai_usage_logs
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists feature text,
  add column if not exists provider text,
  add column if not exists model text,
  add column if not exists generation_source text,
  add column if not exists input_tokens integer,
  add column if not exists output_tokens integer,
  add column if not exists estimated_cost numeric,
  add column if not exists status text default 'success',
  add column if not exists error_message text,
  add column if not exists created_at timestamptz default now();

create table if not exists public.trade_psychology (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  trade_id uuid references public.trades(id) on delete cascade,
  emotion_before text,
  emotion_after text,
  confidence_level integer,
  stress_level integer,
  fomo_score integer,
  discipline_note text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table if exists public.trade_psychology
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists trade_id uuid references public.trades(id) on delete cascade,
  add column if not exists emotion_before text,
  add column if not exists emotion_after text,
  add column if not exists confidence_level integer,
  add column if not exists stress_level integer,
  add column if not exists fomo_score integer,
  add column if not exists discipline_note text,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

create table if not exists public.discipline_scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  period_type text not null,
  period_start timestamptz not null,
  period_end timestamptz not null,
  rule_adherence numeric,
  risk_control numeric,
  emotion_balance numeric,
  revenge_avoidance numeric,
  time_discipline numeric,
  total_score numeric,
  created_at timestamptz default now()
);

alter table if exists public.discipline_scores
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists period_type text,
  add column if not exists period_start timestamptz,
  add column if not exists period_end timestamptz,
  add column if not exists rule_adherence numeric,
  add column if not exists risk_control numeric,
  add column if not exists emotion_balance numeric,
  add column if not exists revenge_avoidance numeric,
  add column if not exists time_discipline numeric,
  add column if not exists total_score numeric,
  add column if not exists created_at timestamptz default now();

create table if not exists public.revenge_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  previous_trade_id uuid references public.trades(id) on delete set null,
  next_trade_id uuid references public.trades(id) on delete set null,
  revenge_score numeric,
  gap_minutes numeric,
  size_increase_ratio numeric,
  triggered_rules text[],
  created_at timestamptz default now()
);

alter table if exists public.revenge_events
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists previous_trade_id uuid references public.trades(id) on delete set null,
  add column if not exists next_trade_id uuid references public.trades(id) on delete set null,
  add column if not exists revenge_score numeric,
  add column if not exists gap_minutes numeric,
  add column if not exists size_increase_ratio numeric,
  add column if not exists triggered_rules text[],
  add column if not exists created_at timestamptz default now();

create table if not exists public.trading_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  text text not null,
  type text default 'manual_check',
  auto_condition jsonb,
  active boolean default true,
  violation_count integer default 0,
  streak_days integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table if exists public.trading_rules
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists text text,
  add column if not exists type text default 'manual_check',
  add column if not exists auto_condition jsonb,
  add column if not exists active boolean default true,
  add column if not exists violation_count integer default 0,
  add column if not exists streak_days integer default 0,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

create table if not exists public.trade_rule_checks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  trade_id uuid references public.trades(id) on delete cascade,
  rule_id uuid references public.trading_rules(id) on delete cascade,
  passed boolean,
  violation_reason text,
  created_at timestamptz default now()
);

alter table if exists public.trade_rule_checks
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists trade_id uuid references public.trades(id) on delete cascade,
  add column if not exists rule_id uuid references public.trading_rules(id) on delete cascade,
  add column if not exists passed boolean,
  add column if not exists violation_reason text,
  add column if not exists created_at timestamptz default now();

-- pgvector is optional in this phase. If the extension cannot be installed,
-- trade_embeddings is still created without the embedding column so future
-- app code can safely target the table after enabling vector later.
do $$
begin
  begin
    create extension if not exists vector;
  exception
    when others then
      raise notice 'pgvector extension is not available in this database. trade_embeddings will be created without embedding vector column.';
  end;

  if to_regtype('vector') is not null then
    execute '
      create table if not exists public.trade_embeddings (
        id uuid primary key default gen_random_uuid(),
        user_id uuid references auth.users(id) on delete cascade,
        trade_id uuid references public.trades(id) on delete cascade,
        embedding vector(1536),
        embedding_model text,
        content_hash text,
        created_at timestamptz default now()
      )
    ';
    execute 'alter table if exists public.trade_embeddings add column if not exists embedding vector(1536)';
  else
    create table if not exists public.trade_embeddings (
      id uuid primary key default gen_random_uuid(),
      user_id uuid references auth.users(id) on delete cascade,
      trade_id uuid references public.trades(id) on delete cascade,
      embedding_model text,
      content_hash text,
      created_at timestamptz default now()
    );
  end if;
end $$;

alter table if exists public.trade_embeddings
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists trade_id uuid references public.trades(id) on delete cascade,
  add column if not exists embedding_model text,
  add column if not exists content_hash text,
  add column if not exists created_at timestamptz default now();

create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  price_monthly numeric default 0,
  trade_limit integer,
  ai_reviews_limit integer,
  vector_memory_enabled boolean default false,
  revenge_index_enabled boolean default false,
  ocr_enabled boolean default false,
  backtest_enabled boolean default false,
  team_enabled boolean default false,
  created_at timestamptz default now()
);

alter table if exists public.plans
  add column if not exists name text,
  add column if not exists price_monthly numeric default 0,
  add column if not exists trade_limit integer,
  add column if not exists ai_reviews_limit integer,
  add column if not exists vector_memory_enabled boolean default false,
  add column if not exists revenge_index_enabled boolean default false,
  add column if not exists ocr_enabled boolean default false,
  add column if not exists backtest_enabled boolean default false,
  add column if not exists team_enabled boolean default false,
  add column if not exists created_at timestamptz default now();

create unique index if not exists plans_name_unique_idx on public.plans (name);

create table if not exists public.user_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  period_start timestamptz not null,
  period_end timestamptz not null,
  trades_count integer default 0,
  ai_reviews_count integer default 0,
  ocr_count integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table if exists public.user_usage
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists period_start timestamptz,
  add column if not exists period_end timestamptz,
  add column if not exists trades_count integer default 0,
  add column if not exists ai_reviews_count integer default 0,
  add column if not exists ocr_count integer default 0,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

insert into public.plans (
  name,
  price_monthly,
  trade_limit,
  ai_reviews_limit,
  vector_memory_enabled,
  revenge_index_enabled,
  ocr_enabled,
  backtest_enabled,
  team_enabled
) values
  ('Free', 0, 50, 10, false, false, false, false, false),
  ('Pro', 29, 500, 100, true, true, false, true, false),
  ('Trader+', 79, null, 500, true, true, true, true, false),
  ('Team', 199, null, null, true, true, true, true, true)
on conflict (name) do nothing;

create index if not exists ai_usage_logs_user_id_idx on public.ai_usage_logs (user_id);
create index if not exists ai_usage_logs_feature_idx on public.ai_usage_logs (feature);
create index if not exists ai_usage_logs_created_at_idx on public.ai_usage_logs (created_at desc);
create index if not exists trade_psychology_user_id_idx on public.trade_psychology (user_id);
create index if not exists trade_psychology_trade_id_idx on public.trade_psychology (trade_id);
create index if not exists discipline_scores_user_period_idx on public.discipline_scores (user_id, period_type, period_start, period_end);
create index if not exists revenge_events_user_id_idx on public.revenge_events (user_id);
create index if not exists revenge_events_previous_trade_idx on public.revenge_events (previous_trade_id);
create index if not exists revenge_events_next_trade_idx on public.revenge_events (next_trade_id);
create index if not exists trading_rules_user_active_idx on public.trading_rules (user_id, active);
create index if not exists trade_rule_checks_user_trade_idx on public.trade_rule_checks (user_id, trade_id);
create index if not exists trade_embeddings_user_trade_idx on public.trade_embeddings (user_id, trade_id);
create index if not exists trade_embeddings_content_hash_idx on public.trade_embeddings (content_hash);
create index if not exists user_usage_user_period_idx on public.user_usage (user_id, period_start, period_end);

drop trigger if exists set_trade_psychology_updated_at on public.trade_psychology;
create trigger set_trade_psychology_updated_at
  before update on public.trade_psychology
  for each row execute function public.set_updated_at();

drop trigger if exists set_trading_rules_updated_at on public.trading_rules;
create trigger set_trading_rules_updated_at
  before update on public.trading_rules
  for each row execute function public.set_updated_at();

drop trigger if exists set_user_usage_updated_at on public.user_usage;
create trigger set_user_usage_updated_at
  before update on public.user_usage
  for each row execute function public.set_updated_at();

alter table public.ai_usage_logs enable row level security;
alter table public.trade_psychology enable row level security;
alter table public.discipline_scores enable row level security;
alter table public.revenge_events enable row level security;
alter table public.trading_rules enable row level security;
alter table public.trade_rule_checks enable row level security;
alter table public.trade_embeddings enable row level security;
alter table public.user_usage enable row level security;
alter table public.plans enable row level security;

do $$
declare
  owned_table text;
begin
  foreach owned_table in array array[
    'ai_usage_logs',
    'trade_psychology',
    'discipline_scores',
    'revenge_events',
    'trading_rules',
    'trade_rule_checks',
    'trade_embeddings',
    'user_usage'
  ]
  loop
    if not exists (
      select 1 from pg_policies
      where schemaname = 'public'
        and tablename = owned_table
        and policyname = format('Users can select own %s', owned_table)
    ) then
      execute format('create policy %I on public.%I for select using (auth.uid() = user_id)', format('Users can select own %s', owned_table), owned_table);
    end if;

    if not exists (
      select 1 from pg_policies
      where schemaname = 'public'
        and tablename = owned_table
        and policyname = format('Users can insert own %s', owned_table)
    ) then
      execute format('create policy %I on public.%I for insert with check (auth.uid() = user_id)', format('Users can insert own %s', owned_table), owned_table);
    end if;

    if not exists (
      select 1 from pg_policies
      where schemaname = 'public'
        and tablename = owned_table
        and policyname = format('Users can update own %s', owned_table)
    ) then
      execute format('create policy %I on public.%I for update using (auth.uid() = user_id) with check (auth.uid() = user_id)', format('Users can update own %s', owned_table), owned_table);
    end if;

    if not exists (
      select 1 from pg_policies
      where schemaname = 'public'
        and tablename = owned_table
        and policyname = format('Users can delete own %s', owned_table)
    ) then
      execute format('create policy %I on public.%I for delete using (auth.uid() = user_id)', format('Users can delete own %s', owned_table), owned_table);
    end if;
  end loop;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'plans'
      and policyname = 'Authenticated users can select plans'
  ) then
    create policy "Authenticated users can select plans"
      on public.plans
      for select
      using (auth.role() = 'authenticated');
  end if;
end $$;
