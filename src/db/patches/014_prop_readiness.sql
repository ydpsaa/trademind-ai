-- Stage 21 - Prop Readiness
-- User-owned prop evaluation profiles, calculated snapshots, and deterministic violations.

create table if not exists public.prop_readiness_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  trading_account_id uuid references public.trading_accounts(id) on delete set null,
  account_scope text not null default 'manual',
  name text not null,
  initial_balance numeric not null,
  profit_target_percent numeric not null,
  max_daily_loss_percent numeric not null,
  max_total_drawdown_percent numeric not null,
  drawdown_type text not null default 'static',
  minimum_trading_days integer not null default 0,
  max_risk_per_trade_percent numeric not null default 1,
  consistency_rule_percent numeric,
  timezone text not null default 'UTC',
  trading_day_start_time time not null default '00:00',
  status text not null default 'active',
  started_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint prop_readiness_profiles_account_scope_check
    check (account_scope in ('manual', 'account')),
  constraint prop_readiness_profiles_account_link_check
    check (
      (account_scope = 'manual' and trading_account_id is null)
      or (account_scope = 'account' and trading_account_id is not null)
    ),
  constraint prop_readiness_profiles_initial_balance_check check (initial_balance > 0),
  constraint prop_readiness_profiles_profit_target_check check (profit_target_percent > 0),
  constraint prop_readiness_profiles_daily_loss_check check (max_daily_loss_percent > 0 and max_daily_loss_percent <= 100),
  constraint prop_readiness_profiles_drawdown_check check (max_total_drawdown_percent > 0 and max_total_drawdown_percent <= 100),
  constraint prop_readiness_profiles_drawdown_type_check check (drawdown_type in ('static', 'trailing')),
  constraint prop_readiness_profiles_minimum_days_check check (minimum_trading_days >= 0),
  constraint prop_readiness_profiles_trade_risk_check check (max_risk_per_trade_percent > 0 and max_risk_per_trade_percent <= 100),
  constraint prop_readiness_profiles_consistency_check check (consistency_rule_percent is null or (consistency_rule_percent > 0 and consistency_rule_percent <= 100)),
  constraint prop_readiness_profiles_status_check check (status in ('active', 'paused', 'completed', 'failed'))
);

create unique index if not exists prop_profiles_active_manual_unique
  on public.prop_readiness_profiles(user_id)
  where status = 'active' and account_scope = 'manual' and trading_account_id is null;

create unique index if not exists prop_profiles_active_account_unique
  on public.prop_readiness_profiles(user_id, trading_account_id)
  where status = 'active' and account_scope = 'account' and trading_account_id is not null;

create index if not exists prop_profiles_user_status_idx
  on public.prop_readiness_profiles(user_id, status, updated_at desc);
create index if not exists prop_profiles_account_idx
  on public.prop_readiness_profiles(user_id, trading_account_id);
create index if not exists prop_profiles_trading_account_fk_idx
  on public.prop_readiness_profiles(trading_account_id)
  where trading_account_id is not null;

create table if not exists public.prop_readiness_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  profile_id uuid not null references public.prop_readiness_profiles(id) on delete cascade,
  trading_account_id uuid references public.trading_accounts(id) on delete set null,
  snapshot_at timestamptz not null default now(),
  current_balance numeric not null,
  current_equity numeric not null,
  peak_balance numeric not null,
  total_pnl numeric not null default 0,
  today_pnl numeric not null default 0,
  profit_target_progress numeric not null default 0,
  daily_loss_used_percent numeric not null default 0,
  daily_loss_remaining numeric not null default 0,
  drawdown_used_percent numeric not null default 0,
  drawdown_remaining numeric not null default 0,
  trading_days_count integer not null default 0,
  consistency_score numeric,
  discipline_score numeric,
  revenge_risk numeric,
  readiness_score numeric,
  readiness_status text not null default 'not_enough_data',
  data_quality text not null default 'estimated',
  summary text,
  warnings text[] not null default '{}',
  recommendations text[] not null default '{}',
  created_at timestamptz not null default now(),
  constraint prop_snapshots_status_check
    check (readiness_status in ('ready', 'caution', 'high_risk', 'blocked', 'not_enough_data')),
  constraint prop_snapshots_quality_check
    check (data_quality in ('estimated', 'not_enough_data')),
  constraint prop_snapshots_score_check
    check (readiness_score is null or (readiness_score >= 0 and readiness_score <= 100))
);

create index if not exists prop_snapshots_user_created_idx
  on public.prop_readiness_snapshots(user_id, created_at desc);
create index if not exists prop_snapshots_profile_created_idx
  on public.prop_readiness_snapshots(profile_id, created_at desc);
create index if not exists prop_snapshots_account_idx
  on public.prop_readiness_snapshots(user_id, trading_account_id, created_at desc);
create index if not exists prop_snapshots_trading_account_fk_idx
  on public.prop_readiness_snapshots(trading_account_id)
  where trading_account_id is not null;

create table if not exists public.prop_rule_violations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  profile_id uuid not null references public.prop_readiness_profiles(id) on delete cascade,
  trading_account_id uuid references public.trading_accounts(id) on delete set null,
  trade_id uuid references public.trades(id) on delete set null,
  violation_key text not null,
  violation_type text not null,
  severity text not null,
  limit_value numeric,
  actual_value numeric,
  message text not null,
  occurred_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint prop_violations_type_check
    check (violation_type in ('daily_loss', 'max_drawdown', 'risk_per_trade', 'consistency')),
  constraint prop_violations_severity_check check (severity in ('warning', 'breach')),
  constraint prop_violations_profile_key_unique unique (profile_id, violation_key)
);

create index if not exists prop_violations_user_occurred_idx
  on public.prop_rule_violations(user_id, occurred_at desc);
create index if not exists prop_violations_profile_idx
  on public.prop_rule_violations(profile_id, severity, occurred_at desc);
create index if not exists prop_violations_trade_idx
  on public.prop_rule_violations(user_id, trade_id);
create index if not exists prop_violations_trade_fk_idx
  on public.prop_rule_violations(trade_id)
  where trade_id is not null;
create index if not exists prop_violations_trading_account_fk_idx
  on public.prop_rule_violations(trading_account_id)
  where trading_account_id is not null;

alter table public.prop_readiness_profiles enable row level security;
alter table public.prop_readiness_snapshots enable row level security;
alter table public.prop_rule_violations enable row level security;

grant select, insert, update, delete on public.prop_readiness_profiles to authenticated;
grant select, insert, update, delete on public.prop_readiness_snapshots to authenticated;
grant select, insert, update, delete on public.prop_rule_violations to authenticated;

drop policy if exists "Users manage own prop profiles" on public.prop_readiness_profiles;
create policy "Users manage own prop profiles"
  on public.prop_readiness_profiles for all to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and (
      trading_account_id is null
      or exists (
        select 1 from public.trading_accounts account
        where account.id = trading_account_id
          and account.user_id = (select auth.uid())
      )
    )
  );

drop policy if exists "Users manage own prop snapshots" on public.prop_readiness_snapshots;
create policy "Users manage own prop snapshots"
  on public.prop_readiness_snapshots for all to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.prop_readiness_profiles profile
      where profile.id = profile_id
        and profile.user_id = (select auth.uid())
    )
    and (
      trading_account_id is null
      or exists (
        select 1 from public.trading_accounts account
        where account.id = trading_account_id
          and account.user_id = (select auth.uid())
      )
    )
  );

drop policy if exists "Users manage own prop violations" on public.prop_rule_violations;
create policy "Users manage own prop violations"
  on public.prop_rule_violations for all to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.prop_readiness_profiles profile
      where profile.id = profile_id
        and profile.user_id = (select auth.uid())
    )
    and (
      trading_account_id is null
      or exists (
        select 1 from public.trading_accounts account
        where account.id = trading_account_id
          and account.user_id = (select auth.uid())
      )
    )
    and (
      trade_id is null
      or exists (
        select 1 from public.trades trade
        where trade.id = trade_id
          and trade.user_id = (select auth.uid())
      )
    )
  );

notify pgrst, 'reload schema';
