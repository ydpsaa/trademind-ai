create extension if not exists pgcrypto;

create table if not exists public.signals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  strategy_id uuid references public.strategies(id) on delete set null,
  symbol text not null,
  market_type text,
  direction text not null,
  entry_zone text,
  stop_loss numeric,
  take_profit numeric,
  confidence numeric,
  reasoning text,
  status text default 'watching',
  news_risk text,
  setup_type text,
  timeframe text,
  engine_type text default 'simulated',
  scanner_snapshot jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.signals
  add column if not exists strategy_id uuid references public.strategies(id) on delete set null,
  add column if not exists market_type text,
  add column if not exists direction text,
  add column if not exists entry_zone text,
  add column if not exists stop_loss numeric,
  add column if not exists take_profit numeric,
  add column if not exists confidence numeric,
  add column if not exists reasoning text,
  add column if not exists status text default 'watching',
  add column if not exists news_risk text,
  add column if not exists setup_type text,
  add column if not exists timeframe text,
  add column if not exists engine_type text default 'simulated',
  add column if not exists scanner_snapshot jsonb,
  add column if not exists updated_at timestamptz default now();

create index if not exists signals_user_created_at_idx on public.signals (user_id, created_at desc);
create index if not exists signals_user_symbol_idx on public.signals (user_id, symbol);
create index if not exists signals_user_status_idx on public.signals (user_id, status);

alter table public.signals enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'signals' and policyname = 'Users can select own signals') then
    create policy "Users can select own signals" on public.signals for select using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'signals' and policyname = 'Users can insert own signals') then
    create policy "Users can insert own signals" on public.signals for insert with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'signals' and policyname = 'Users can update own signals') then
    create policy "Users can update own signals" on public.signals for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'signals' and policyname = 'Users can delete own signals') then
    create policy "Users can delete own signals" on public.signals for delete using (auth.uid() = user_id);
  end if;
end $$;
