# Stage 20 - OKX Read-Only

TradeMind AI can connect one user-owned OKX account with a dedicated read-only API key and import completed margin and derivative positions into the Journal.

## Safety model

- The connection accepts only keys reported by OKX with `read_only` permission.
- Keys with Trade or Withdraw permission are rejected.
- Order creation, order changes, transfers, and withdrawals are not implemented.
- The API key, secret, and passphrase are encrypted with AES-256-GCM before storage and are never returned to the browser.
- Browser roles have no grants on the encrypted credentials table.
- Every server action authenticates the current user and scopes account, credential, sync, and trade operations to that user.
- Disconnect removes credentials but preserves previously imported trades.

Set `INTEGRATION_CREDENTIALS_ENCRYPTION_KEY` to an independent random server-only secret in production. The compatibility fallback uses the existing server credential when this variable is absent. Rotating the encryption source requires reconnecting accounts encrypted with the old value.

## Current import scope

The first version imports closed margin, perpetual swap, and futures positions over the last 7 or 30 days. It uses OKX V5 account configuration and position history GET endpoints. Duplicate records are skipped using deterministic provider IDs and import hashes.

Position history supplies verified open and close timestamps when available. Missing or unsupported fields remain unavailable rather than being invented. Spot fills, options, automatic scheduled sync, balances, open positions, and sub-account aggregation are later additions.

Imported records use `source=okx` and the shared `trading_accounts` model, so existing Dashboard and Journal account filters consume them without separate data paths.

## Database patch

Apply `src/db/patches/013_okx_read_only.sql`. It extends the server-only credential provider and environment constraints for OKX while preserving the existing RLS and grant model.
