# Stage 19 - Bybit Read-Only

TradeMind AI can connect one user-owned Bybit account with a dedicated read-only API key and import completed derivative trades into the Journal.

## Safety model

- The connection accepts only keys reported by Bybit as read-only.
- Keys with withdrawal permission are rejected.
- Trade execution, order creation, order changes, transfers, and withdrawals are not implemented.
- Credentials are encrypted with AES-256-GCM before storage and are never returned to the browser.
- Browser roles have no grants on the encrypted credentials table.
- Every server action authenticates the current user and scopes account, credential, sync, and trade operations to that user.
- Disconnect removes credentials but preserves previously imported trades.

Set `INTEGRATION_CREDENTIALS_ENCRYPTION_KEY` to an independent random server-only secret in production. If it is absent, the server uses the existing service credential as a compatibility fallback. Rotating either encryption source requires reconnecting accounts encrypted with the old value.

## Current import scope

The first version imports closed PnL records for linear and inverse derivative products over the last 7 or 30 days. It uses the Bybit V5 account verification and closed PnL GET endpoints. Duplicate records are skipped using deterministic provider IDs and import hashes.

Bybit closed PnL records do not expose the original position open timestamp. TradeMind stores the verified close timestamp and leaves the open timestamp unavailable instead of inventing data.

Spot fills, automatic scheduled sync, open positions, balances, and sub-account aggregation are later additions. Existing Journal, Dashboard, and Account Selector filters consume imported trades through the shared `trading_accounts` model.

## Database patch

Apply `src/db/patches/012_bybit_read_only.sql`. It adds:

- `trading_accounts.external_account_id`
- `trading_accounts.last_synced_at`
- server-only `integration_credentials`
- user-readable `integration_sync_runs`

The credentials table has RLS enabled, no browser policies, and no grants for anonymous or authenticated browser roles.
