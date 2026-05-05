# Stage 0.0.3 Account Data Model

Stage 0.0.3 is a global account/data architecture readiness task. It is not Stage 18; Stage 18 remains reserved for CSV Import.

## User Profile vs Trading Account

- A user profile identifies the authenticated TradeMind AI user.
- A trading account represents a source of trades owned by that user.
- Every user-owned trading record remains scoped by `user_id` and protected by Supabase RLS.

## Manual Journal Account

Manual Journal is the default logical account/source. It can be shown as a virtual selector option even if no `trading_accounts` row exists yet.

Manual trades currently use:

- `trades.user_id` for ownership
- `trades.source = manual`
- `trades.trading_account_id = null` unless a real account row is linked later

## Future Import Accounts

Future import stages will create or use `trading_accounts` rows:

- CSV Import can create Manual or CSV account sources.
- Bybit Read-Only can create a Bybit account source.
- OKX Read-Only can create an OKX account source.
- MetaTrader bridge can create a MetaTrader account source.

Imported trades should link to `trades.trading_account_id` and keep `user_id` set to the current authenticated user.

## Selector Rules

- `All Accounts` shows all current user trades.
- `Manual Journal` shows manual trades.
- A specific account ID shows trades linked to that user-owned `trading_account_id`.
- No fake balances, fake accounts, or fake broker statuses are shown.

## Execution

Trading execution is not connected. Account readiness is for filtering, imports, analytics, and future read-only integrations only.
