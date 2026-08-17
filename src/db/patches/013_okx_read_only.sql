-- Stage 20 - OKX Read-Only
-- Extends server-only credential storage for OKX live/demo read-only imports.

alter table if exists public.integration_credentials
  drop constraint if exists integration_credentials_provider_check;

alter table if exists public.integration_credentials
  add constraint integration_credentials_provider_check
  check (provider in ('bybit', 'okx'));

alter table if exists public.integration_credentials
  drop constraint if exists integration_credentials_environment_check;

alter table if exists public.integration_credentials
  add constraint integration_credentials_environment_check
  check (environment in ('mainnet', 'testnet', 'live', 'demo'));

-- Keep credentials inaccessible to browser roles after widening provider support.
alter table if exists public.integration_credentials enable row level security;
revoke all on public.integration_credentials from anon, authenticated;
grant select, insert, update, delete on public.integration_credentials to service_role;

-- Sync history remains user-readable but server-written only.
alter table if exists public.integration_sync_runs enable row level security;
revoke all on public.integration_sync_runs from anon;
revoke insert, update, delete on public.integration_sync_runs from authenticated;
grant select on public.integration_sync_runs to authenticated;
grant select, insert, update, delete on public.integration_sync_runs to service_role;

drop policy if exists "Users can select own integration sync runs" on public.integration_sync_runs;
create policy "Users can select own integration sync runs"
  on public.integration_sync_runs for select to authenticated
  using ((select auth.uid()) = user_id);

notify pgrst, 'reload schema';
