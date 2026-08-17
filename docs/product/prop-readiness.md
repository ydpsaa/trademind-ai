# Stage 21: Prop Readiness

Prop Readiness connects real journal trades to configurable evaluation-account rules. It is an operational risk monitor, not a guarantee that an evaluation will pass.

## Stage 21.0: Prop Profile and account linking

Each user can create a Prop Profile for either:

- the virtual Manual Journal account; or
- one user-owned trading account from `trading_accounts`.

A profile stores the initial balance, profit target, daily loss limit, maximum drawdown, drawdown model, minimum trading days, maximum risk per trade, optional consistency rule, timezone, and trading-day reset time. Row Level Security scopes profiles, snapshots, and violations to the authenticated user.

## Stage 21.1: calculation engine

The engine uses closed trades with recorded PnL after the profile start date. It calculates:

- cumulative closed-trade balance and peak balance;
- estimated daily loss usage for the configured trading day;
- static or trailing drawdown usage;
- progress toward the profit target;
- unique trading days;
- risk-per-trade violations;
- daily loss and drawdown breaches;
- optional consistency-rule warnings;
- a readiness state and score when enough data exists.

No score is generated when there are no eligible closed trades. Daily loss, balance, and drawdown are labeled **Estimated** because live intraday equity is unavailable until a read-only account feed provides it.

## Stage 21.2: product surfaces

`/prop-readiness` provides profile setup, account linking, current limits, warnings, stored violations, and immutable snapshot history. Dashboard shows the latest snapshot for the selected account scope. A recalculation inserts a new snapshot instead of rewriting history.

## Stage 21.3: AI and pre-trade context

The Journal trade form shows the latest Manual Journal Prop Profile warning before a trade is saved. It does not block manual journaling.

AI Review receives the linked profile snapshot and recorded violations through `TradingOSContext`. The local review engine can reduce risk quality when readiness is caution, high risk, or blocked. AI instructions explicitly treat the values as closed-trade estimates and prohibit guarantees.

## Limitations and safety

- Open PnL and live equity are not available.
- Provider-specific reset, trailing, commission, and consistency rules can differ.
- Journal PnL quality directly affects the estimate.
- Users must reconcile limits with the official evaluation provider dashboard.
- The module does not execute trades or block orders.
