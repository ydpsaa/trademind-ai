create table if not exists public.integration_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  provider text not null,
  status text default 'not_connected',
  mode text,
  display_name text,
  metadata jsonb,
  last_checked_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table if exists public.integration_connections
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists provider text,
  add column if not exists status text default 'not_connected',
  add column if not exists mode text,
  add column if not exists display_name text,
  add column if not exists metadata jsonb,
  add column if not exists last_checked_at timestamptz,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

create index if not exists integration_connections_user_id_idx on public.integration_connections (user_id);
create index if not exists integration_connections_provider_idx on public.integration_connections (provider);
create index if not exists integration_connections_status_idx on public.integration_connections (status);
create unique index if not exists integration_connections_user_provider_idx on public.integration_connections (user_id, provider);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_integration_connections_updated_at on public.integration_connections;
create trigger set_integration_connections_updated_at
  before update on public.integration_connections
  for each row execute function public.set_updated_at();

alter table public.integration_connections enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'integration_connections'
      and policyname = 'Users can select own integration connections'
  ) then
    create policy "Users can select own integration connections"
      on public.integration_connections
      for select
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'integration_connections'
      and policyname = 'Users can insert own integration connections'
  ) then
    create policy "Users can insert own integration connections"
      on public.integration_connections
      for insert
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'integration_connections'
      and policyname = 'Users can update own integration connections'
  ) then
    create policy "Users can update own integration connections"
      on public.integration_connections
      for update
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'integration_connections'
      and policyname = 'Users can delete own integration connections'
  ) then
    create policy "Users can delete own integration connections"
      on public.integration_connections
      for delete
      using (auth.uid() = user_id);
  end if;
end $$;
