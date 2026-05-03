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

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  plan text default 'free',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.trading_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  experience_level text,
  trading_style text,
  preferred_markets text[],
  preferred_sessions text[],
  max_daily_risk numeric,
  max_trade_risk numeric,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.trading_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text,
  account_name text,
  account_type text,
  currency text default 'USD',
  status text default 'mock',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.strategies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  rules_json jsonb,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.trades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  trading_account_id uuid references public.trading_accounts(id) on delete set null,
  source text default 'manual',
  symbol text not null,
  market_type text,
  direction text not null,
  entry_price numeric,
  exit_price numeric,
  stop_loss numeric,
  take_profit numeric,
  position_size numeric,
  risk_percent numeric,
  rr numeric,
  pnl numeric,
  fees numeric,
  result text,
  session text,
  strategy_id uuid references public.strategies(id) on delete set null,
  opened_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.trade_journal_entries (
  id uuid primary key default gen_random_uuid(),
  trade_id uuid not null references public.trades(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  reason_for_entry text,
  emotion_before text,
  emotion_after text,
  screenshot_url text,
  notes_before text,
  notes_after text,
  mistake_tags text[],
  setup_tags text[],
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.ai_trade_reviews (
  id uuid primary key default gen_random_uuid(),
  trade_id uuid not null references public.trades(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  total_score numeric,
  structure_score numeric,
  liquidity_score numeric,
  ict_score numeric,
  risk_score numeric,
  news_score numeric,
  psychology_score numeric,
  summary text,
  strengths text[],
  weaknesses text[],
  recommendations text[],
  generation_source text default 'rules',
  model text,
  created_at timestamptz default now()
);

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
  status text default 'completed',
  engine_type text default 'simulated',
  risk_per_trade numeric,
  market_type text,
  report_json jsonb,
  created_at timestamptz default now()
);

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

create table if not exists public.integration_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  status text default 'not_connected',
  mode text,
  display_name text,
  metadata jsonb,
  last_checked_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.journal_period_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  period_type text,
  period_start timestamptz,
  period_end timestamptz,
  total_trades integer,
  winrate numeric,
  pnl numeric,
  profit_factor numeric,
  max_drawdown numeric,
  best_symbol text,
  worst_symbol text,
  best_strategy text,
  main_mistake text,
  ai_summary text,
  created_at timestamptz default now()
);

create table if not exists public.economic_events (
  id uuid primary key default gen_random_uuid(),
  currency text not null,
  title text not null,
  impact text not null check (impact in ('Low', 'Medium', 'High')),
  event_time timestamptz not null,
  actual text,
  forecast text,
  previous text,
  source text default 'manual',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists economic_events_event_time_idx on public.economic_events (event_time);
create index if not exists economic_events_currency_idx on public.economic_events (currency);
create index if not exists economic_events_impact_idx on public.economic_events (impact);
create index if not exists integration_connections_user_id_idx on public.integration_connections (user_id);
create index if not exists integration_connections_provider_idx on public.integration_connections (provider);
create index if not exists integration_connections_status_idx on public.integration_connections (status);
create unique index if not exists integration_connections_user_provider_idx on public.integration_connections (user_id, provider);

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists set_trading_profiles_updated_at on public.trading_profiles;
create trigger set_trading_profiles_updated_at
  before update on public.trading_profiles
  for each row execute function public.set_updated_at();

drop trigger if exists set_trading_accounts_updated_at on public.trading_accounts;
create trigger set_trading_accounts_updated_at
  before update on public.trading_accounts
  for each row execute function public.set_updated_at();

drop trigger if exists set_strategies_updated_at on public.strategies;
create trigger set_strategies_updated_at
  before update on public.strategies
  for each row execute function public.set_updated_at();

drop trigger if exists set_trades_updated_at on public.trades;
create trigger set_trades_updated_at
  before update on public.trades
  for each row execute function public.set_updated_at();

drop trigger if exists set_trade_journal_entries_updated_at on public.trade_journal_entries;
create trigger set_trade_journal_entries_updated_at
  before update on public.trade_journal_entries
  for each row execute function public.set_updated_at();

drop trigger if exists set_integration_connections_updated_at on public.integration_connections;
create trigger set_integration_connections_updated_at
  before update on public.integration_connections
  for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.trading_profiles enable row level security;
alter table public.trading_accounts enable row level security;
alter table public.trades enable row level security;
alter table public.trade_journal_entries enable row level security;
alter table public.ai_trade_reviews enable row level security;
alter table public.strategies enable row level security;
alter table public.backtests enable row level security;
alter table public.signals enable row level security;
alter table public.integration_connections enable row level security;
alter table public.journal_period_reports enable row level security;
alter table public.economic_events enable row level security;

create policy "Users can select own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

create policy "Users can select own trading profiles" on public.trading_profiles for select using (auth.uid() = user_id);
create policy "Users can insert own trading profiles" on public.trading_profiles for insert with check (auth.uid() = user_id);
create policy "Users can update own trading profiles" on public.trading_profiles for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own trading profiles" on public.trading_profiles for delete using (auth.uid() = user_id);

create policy "Users can select own trading accounts" on public.trading_accounts for select using (auth.uid() = user_id);
create policy "Users can insert own trading accounts" on public.trading_accounts for insert with check (auth.uid() = user_id);
create policy "Users can update own trading accounts" on public.trading_accounts for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own trading accounts" on public.trading_accounts for delete using (auth.uid() = user_id);

create policy "Users can select own trades" on public.trades for select using (auth.uid() = user_id);
create policy "Users can insert own trades" on public.trades for insert with check (auth.uid() = user_id);
create policy "Users can update own trades" on public.trades for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own trades" on public.trades for delete using (auth.uid() = user_id);

create policy "Users can select own journal entries" on public.trade_journal_entries for select using (auth.uid() = user_id);
create policy "Users can insert own journal entries" on public.trade_journal_entries for insert with check (auth.uid() = user_id);
create policy "Users can update own journal entries" on public.trade_journal_entries for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own journal entries" on public.trade_journal_entries for delete using (auth.uid() = user_id);

create policy "Users can select own AI reviews" on public.ai_trade_reviews for select using (auth.uid() = user_id);
create policy "Users can insert own AI reviews" on public.ai_trade_reviews for insert with check (auth.uid() = user_id);
create policy "Users can update own AI reviews" on public.ai_trade_reviews for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own AI reviews" on public.ai_trade_reviews for delete using (auth.uid() = user_id);

create policy "Users can select own strategies" on public.strategies for select using (auth.uid() = user_id);
create policy "Users can insert own strategies" on public.strategies for insert with check (auth.uid() = user_id);
create policy "Users can update own strategies" on public.strategies for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own strategies" on public.strategies for delete using (auth.uid() = user_id);

create policy "Users can select own backtests" on public.backtests for select using (auth.uid() = user_id);
create policy "Users can insert own backtests" on public.backtests for insert with check (auth.uid() = user_id);
create policy "Users can update own backtests" on public.backtests for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own backtests" on public.backtests for delete using (auth.uid() = user_id);

create policy "Users can select own signals" on public.signals for select using (auth.uid() = user_id);
create policy "Users can insert own signals" on public.signals for insert with check (auth.uid() = user_id);
create policy "Users can update own signals" on public.signals for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own signals" on public.signals for delete using (auth.uid() = user_id);

create policy "Users can select own integration connections" on public.integration_connections for select using (auth.uid() = user_id);
create policy "Users can insert own integration connections" on public.integration_connections for insert with check (auth.uid() = user_id);
create policy "Users can update own integration connections" on public.integration_connections for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own integration connections" on public.integration_connections for delete using (auth.uid() = user_id);

create policy "Users can select own journal reports" on public.journal_period_reports for select using (auth.uid() = user_id);
create policy "Users can insert own journal reports" on public.journal_period_reports for insert with check (auth.uid() = user_id);
create policy "Users can update own journal reports" on public.journal_period_reports for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete own journal reports" on public.journal_period_reports for delete using (auth.uid() = user_id);

create policy "Authenticated users can select economic events" on public.economic_events for select to authenticated using (true);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
