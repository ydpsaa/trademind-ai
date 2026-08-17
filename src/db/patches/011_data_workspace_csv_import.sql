-- Stage 18 - CSV/XLSX Import + Data Workspace
-- Adds user-owned spreadsheet tables and resumable trade import batches.

alter table if exists public.trading_accounts
  add column if not exists metadata jsonb default '{}'::jsonb;

alter table if exists public.trading_accounts
  alter column provider set default 'manual',
  alter column account_name set default 'Manual Journal',
  alter column account_type set default 'manual',
  alter column status set default 'active';

create table if not exists public.workspace_tables (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  kind text not null default 'custom' check (kind in ('custom', 'trade_import')),
  columns_json jsonb not null default '[]'::jsonb,
  settings_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workspace_table_rows (
  id uuid primary key default gen_random_uuid(),
  table_id uuid not null references public.workspace_tables(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  position integer not null default 0,
  data_json jsonb not null default '{}'::jsonb,
  validation_status text not null default 'draft'
    check (validation_status in ('draft', 'valid', 'invalid', 'imported', 'skipped')),
  validation_errors jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.trade_import_batches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_table_id uuid references public.workspace_tables(id) on delete set null,
  trading_account_id uuid references public.trading_accounts(id) on delete set null,
  filename text,
  source_format text not null default 'clipboard'
    check (source_format in ('csv', 'xlsx', 'clipboard')),
  status text not null default 'draft'
    check (status in ('draft', 'validated', 'importing', 'completed', 'failed', 'rolled_back')),
  mapping_json jsonb not null default '{}'::jsonb,
  next_position integer not null default 0,
  total_rows integer not null default 0,
  valid_rows integer not null default 0,
  invalid_rows integer not null default 0,
  imported_count integer not null default 0,
  skipped_count integer not null default 0,
  error_count integer not null default 0,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  rolled_back_at timestamptz
);

alter table if exists public.trades
  add column if not exists import_batch_id uuid references public.trade_import_batches(id) on delete set null,
  add column if not exists external_trade_id text,
  add column if not exists import_row_hash text;

create index if not exists workspace_tables_user_created_idx
  on public.workspace_tables (user_id, created_at desc);
create index if not exists workspace_table_rows_table_position_idx
  on public.workspace_table_rows (table_id, position);
create index if not exists workspace_table_rows_user_status_idx
  on public.workspace_table_rows (user_id, validation_status);
create index if not exists trade_import_batches_user_created_idx
  on public.trade_import_batches (user_id, created_at desc);
create index if not exists trade_import_batches_user_status_idx
  on public.trade_import_batches (user_id, status);
create index if not exists trade_import_batches_workspace_table_id_idx
  on public.trade_import_batches (workspace_table_id);
create index if not exists trade_import_batches_trading_account_id_idx
  on public.trade_import_batches (trading_account_id);
create index if not exists trades_import_batch_id_idx
  on public.trades (import_batch_id);

create unique index if not exists trades_user_account_import_hash_unique_idx
  on public.trades (
    user_id,
    coalesce(trading_account_id, '00000000-0000-0000-0000-000000000000'::uuid),
    import_row_hash
  )
  where import_row_hash is not null;

alter table public.workspace_tables enable row level security;
alter table public.workspace_table_rows enable row level security;
alter table public.trade_import_batches enable row level security;

grant select, insert, update, delete on public.workspace_tables to authenticated;
grant select, insert, update, delete on public.workspace_table_rows to authenticated;
grant select, insert, update, delete on public.trade_import_batches to authenticated;

drop policy if exists "Users can select own workspace tables" on public.workspace_tables;
drop policy if exists "Users can insert own workspace tables" on public.workspace_tables;
drop policy if exists "Users can update own workspace tables" on public.workspace_tables;
drop policy if exists "Users can delete own workspace tables" on public.workspace_tables;

create policy "Users can select own workspace tables"
  on public.workspace_tables for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Users can insert own workspace tables"
  on public.workspace_tables for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "Users can update own workspace tables"
  on public.workspace_tables for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "Users can delete own workspace tables"
  on public.workspace_tables for delete to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can select own workspace rows" on public.workspace_table_rows;
drop policy if exists "Users can insert own workspace rows" on public.workspace_table_rows;
drop policy if exists "Users can update own workspace rows" on public.workspace_table_rows;
drop policy if exists "Users can delete own workspace rows" on public.workspace_table_rows;

create policy "Users can select own workspace rows"
  on public.workspace_table_rows for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Users can insert own workspace rows"
  on public.workspace_table_rows for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and table_id in (
      select id from public.workspace_tables where user_id = (select auth.uid())
    )
  );
create policy "Users can update own workspace rows"
  on public.workspace_table_rows for update to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and table_id in (
      select id from public.workspace_tables where user_id = (select auth.uid())
    )
  );
create policy "Users can delete own workspace rows"
  on public.workspace_table_rows for delete to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can select own trade import batches" on public.trade_import_batches;
drop policy if exists "Users can insert own trade import batches" on public.trade_import_batches;
drop policy if exists "Users can update own trade import batches" on public.trade_import_batches;
drop policy if exists "Users can delete own trade import batches" on public.trade_import_batches;

create policy "Users can select own trade import batches"
  on public.trade_import_batches for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Users can insert own trade import batches"
  on public.trade_import_batches for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and (
      workspace_table_id is null
      or workspace_table_id in (
        select id from public.workspace_tables where user_id = (select auth.uid())
      )
    )
    and (
      trading_account_id is null
      or trading_account_id in (
        select id from public.trading_accounts where user_id = (select auth.uid())
      )
    )
  );
create policy "Users can update own trade import batches"
  on public.trade_import_batches for update to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and (
      workspace_table_id is null
      or workspace_table_id in (
        select id from public.workspace_tables where user_id = (select auth.uid())
      )
    )
    and (
      trading_account_id is null
      or trading_account_id in (
        select id from public.trading_accounts where user_id = (select auth.uid())
      )
    )
  );
create policy "Users can delete own trade import batches"
  on public.trade_import_batches for delete to authenticated
  using ((select auth.uid()) = user_id);
