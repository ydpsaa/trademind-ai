create extension if not exists pgcrypto;

create table if not exists public.backtests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  strategy_id uuid references public.strategies(id) on delete set null,
  symbol text,
  timeframe text,
  period_start timestamptz,
  period_end timestamptz,
  initial_balance numeric,
  final_balance numeric,
  total_trades integer,
  winrate numeric,
  profit_factor numeric,
  max_drawdown numeric,
  avg_rr numeric,
  report_json jsonb,
  created_at timestamptz default now()
);

alter table public.backtests
  add column if not exists status text default 'completed',
  add column if not exists engine_type text default 'simulated',
  add column if not exists risk_per_trade numeric,
  add column if not exists market_type text;

create index if not exists backtests_user_created_at_idx on public.backtests (user_id, created_at desc);
create index if not exists backtests_user_strategy_idx on public.backtests (user_id, strategy_id);

alter table public.backtests enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'backtests' and policyname = 'Users can select own backtests'
  ) then
    create policy "Users can select own backtests" on public.backtests for select using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'backtests' and policyname = 'Users can insert own backtests'
  ) then
    create policy "Users can insert own backtests" on public.backtests for insert with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'backtests' and policyname = 'Users can update own backtests'
  ) then
    create policy "Users can update own backtests" on public.backtests for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'backtests' and policyname = 'Users can delete own backtests'
  ) then
    create policy "Users can delete own backtests" on public.backtests for delete using (auth.uid() = user_id);
  end if;
end $$;
