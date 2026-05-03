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

alter table if exists public.strategies
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists name text,
  add column if not exists description text,
  add column if not exists rules_json jsonb,
  add column if not exists is_active boolean default true,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

create index if not exists strategies_user_id_idx on public.strategies (user_id);
create index if not exists strategies_is_active_idx on public.strategies (is_active);

alter table public.strategies enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'strategies'
      and policyname = 'Users can select own strategies'
  ) then
    create policy "Users can select own strategies" on public.strategies for select using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'strategies'
      and policyname = 'Users can insert own strategies'
  ) then
    create policy "Users can insert own strategies" on public.strategies for insert with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'strategies'
      and policyname = 'Users can update own strategies'
  ) then
    create policy "Users can update own strategies" on public.strategies for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'strategies'
      and policyname = 'Users can delete own strategies'
  ) then
    create policy "Users can delete own strategies" on public.strategies for delete using (auth.uid() = user_id);
  end if;
end;
$$;
