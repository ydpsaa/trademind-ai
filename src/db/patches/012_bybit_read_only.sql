-- Stage 19 - Bybit Read-Only
-- Stores encrypted connection credentials server-side and tracks safe import runs.

alter table if exists public.trading_accounts
  add column if not exists external_account_id text,
  add column if not exists last_synced_at timestamptz;

create unique index if not exists trading_accounts_user_provider_external_unique_idx
  on public.trading_accounts (user_id, provider, external_account_id)
  where external_account_id is not null;

create table if not exists public.integration_credentials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('bybit')),
  environment text not null default 'mainnet' check (environment in ('mainnet', 'testnet')),
  encrypted_payload text not null,
  key_hint text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, provider)
);

create table if not exists public.integration_sync_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  trading_account_id uuid references public.trading_accounts(id) on delete set null,
  provider text not null,
  status text not null default 'running'
    check (status in ('running', 'completed', 'failed')),
  range_start timestamptz,
  range_end timestamptz,
  fetched_count integer not null default 0,
  imported_count integer not null default 0,
  skipped_count integer not null default 0,
  error_count integer not null default 0,
  last_error text,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists integration_credentials_user_provider_idx
  on public.integration_credentials (user_id, provider);
create index if not exists integration_sync_runs_user_created_idx
  on public.integration_sync_runs (user_id, created_at desc);
create index if not exists integration_sync_runs_account_created_idx
  on public.integration_sync_runs (trading_account_id, created_at desc);
create index if not exists integration_sync_runs_user_status_idx
  on public.integration_sync_runs (user_id, status);

alter table public.integration_credentials enable row level security;
alter table public.integration_sync_runs enable row level security;

-- Credentials are intentionally unavailable to browser roles. Server-side service
-- code authenticates the user first, then accesses only that user's encrypted row.
revoke all on public.integration_credentials from anon, authenticated;
grant select, insert, update, delete on public.integration_credentials to service_role;

revoke all on public.integration_sync_runs from anon;
revoke insert, update, delete on public.integration_sync_runs from authenticated;
grant select on public.integration_sync_runs to authenticated;
grant select, insert, update, delete on public.integration_sync_runs to service_role;

drop policy if exists "Users can select own integration sync runs" on public.integration_sync_runs;
create policy "Users can select own integration sync runs"
  on public.integration_sync_runs for select to authenticated
  using ((select auth.uid()) = user_id);

drop trigger if exists set_integration_credentials_updated_at on public.integration_credentials;
create trigger set_integration_credentials_updated_at
  before update on public.integration_credentials
  for each row execute function public.set_updated_at();
