alter table if exists public.trading_accounts
  add column if not exists metadata jsonb default '{}'::jsonb;

alter table if exists public.trading_accounts
  alter column provider set default 'manual',
  alter column account_name set default 'Manual Journal',
  alter column account_type set default 'manual',
  alter column status set default 'active';

create index if not exists trading_accounts_user_id_idx on public.trading_accounts(user_id);
create index if not exists trading_accounts_provider_idx on public.trading_accounts(provider);
create index if not exists trading_accounts_status_idx on public.trading_accounts(status);

alter table if exists public.trading_accounts enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'trading_accounts'
      and policyname = 'Users can select own trading accounts'
  ) then
    create policy "Users can select own trading accounts"
      on public.trading_accounts for select
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'trading_accounts'
      and policyname = 'Users can insert own trading accounts'
  ) then
    create policy "Users can insert own trading accounts"
      on public.trading_accounts for insert
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'trading_accounts'
      and policyname = 'Users can update own trading accounts'
  ) then
    create policy "Users can update own trading accounts"
      on public.trading_accounts for update
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'trading_accounts'
      and policyname = 'Users can delete own trading accounts'
  ) then
    create policy "Users can delete own trading accounts"
      on public.trading_accounts for delete
      using (auth.uid() = user_id);
  end if;
end $$;
