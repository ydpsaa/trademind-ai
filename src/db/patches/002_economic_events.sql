create table if not exists public.economic_events (
  id uuid primary key default gen_random_uuid(),
  currency text not null,
  title text not null,
  impact text not null,
  event_time timestamptz not null,
  actual text,
  forecast text,
  previous text,
  source text default 'manual',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table if exists public.economic_events
  add column if not exists currency text default 'USD',
  add column if not exists title text default 'Economic Event',
  add column if not exists impact text default 'Medium',
  add column if not exists event_time timestamptz default now(),
  add column if not exists actual text,
  add column if not exists forecast text,
  add column if not exists previous text,
  add column if not exists source text default 'manual',
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

alter table if exists public.economic_events
  alter column currency set not null,
  alter column title set not null,
  alter column impact set not null,
  alter column event_time set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'economic_events_impact_check'
      and conrelid = 'public.economic_events'::regclass
  ) then
    alter table public.economic_events
      add constraint economic_events_impact_check check (impact in ('Low', 'Medium', 'High'));
  end if;
end;
$$;

create index if not exists economic_events_event_time_idx on public.economic_events (event_time);
create index if not exists economic_events_currency_idx on public.economic_events (currency);
create index if not exists economic_events_impact_idx on public.economic_events (impact);

alter table public.economic_events enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'economic_events'
      and policyname = 'Authenticated users can select economic events'
  ) then
    create policy "Authenticated users can select economic events"
      on public.economic_events
      for select
      to authenticated
      using (true);
  end if;
end;
$$;

insert into public.economic_events (id, currency, title, impact, event_time, actual, forecast, previous, source)
values
  ('10000000-0000-4000-8000-000000000501', 'USD', 'Sample CPI m/m', 'High', '2026-05-01 12:30:00+00', null, '0.3%', '0.4%', 'sample'),
  ('10000000-0000-4000-8000-000000000502', 'USD', 'Sample Nonfarm Payrolls', 'High', '2026-05-01 12:30:00+00', null, '210K', '190K', 'sample'),
  ('10000000-0000-4000-8000-000000000503', 'USD', 'Sample FOMC Statement', 'High', '2026-05-01 18:00:00+00', null, null, null, 'sample'),
  ('10000000-0000-4000-8000-000000000504', 'EUR', 'Sample ECB Rate Decision', 'High', '2026-05-02 12:15:00+00', null, '3.75%', '4.00%', 'sample'),
  ('10000000-0000-4000-8000-000000000505', 'GBP', 'Sample GDP m/m', 'Medium', '2026-05-03 06:00:00+00', null, '0.2%', '0.1%', 'sample'),
  ('10000000-0000-4000-8000-000000000506', 'USD', 'Sample Retail Sales m/m', 'Medium', '2026-05-04 12:30:00+00', null, '0.4%', '0.6%', 'sample'),
  ('10000000-0000-4000-8000-000000000507', 'EUR', 'Sample Manufacturing PMI', 'Medium', '2026-05-05 08:00:00+00', null, '50.2', '49.8', 'sample'),
  ('10000000-0000-4000-8000-000000000508', 'GBP', 'Sample Unemployment Rate', 'Medium', '2026-05-06 06:00:00+00', null, '4.1%', '4.0%', 'sample'),
  ('10000000-0000-4000-8000-000000000509', 'JPY', 'Sample BOJ Core CPI y/y', 'Low', '2026-05-07 05:00:00+00', null, '2.1%', '2.0%', 'sample'),
  ('10000000-0000-4000-8000-000000000510', 'CAD', 'Sample Employment Change', 'High', '2026-05-08 12:30:00+00', null, '18K', '12K', 'sample')
on conflict (id) do nothing;
