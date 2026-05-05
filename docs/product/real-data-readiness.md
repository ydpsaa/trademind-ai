# Stage 0.0.2 Real Data Readiness

Stage 0.0.2 is a global integrity pass, not a roadmap feature stage. Stage 18 remains reserved for CSV Import.

## What Was Audited

- Dashboard mock equity and market panels.
- Market Scanner mock scanner engine output.
- Signals simulated generation flow and sandbox signal records.
- Backtest Lab deterministic mock engine output.
- Economic Calendar sample seed rows.
- Connections and System Status engine labels.
- README and QA docs that still described simulated output as active product behavior.

## What Changed

- Dashboard equity curve now uses only real journal trade PnL.
- Dashboard market panel now shows Market Data Feed readiness instead of scanner-style fake symbols.
- Dashboard signals preview hides simulated signal records and waits for real signal data.
- Dashboard backtest preview does not present simulated backtests as real performance.
- Market Scanner pages now show a not-connected state until a real market data feed is integrated.
- Signals page disables generation in production UI and hides sandbox records from the default real-data view.
- Backtest Lab disables sandbox execution by default and labels old simulated rows as sandbox history.
- Calendar events with `source = sample` or sample-style titles show a Sample badge.
- Connections and System Status now describe Market Data, Scanner, Backtest, and Signal engines as waiting for real data.

## What Remains As Disabled Foundation

- `src/lib/scanner/mock-scanner.ts` remains as a development foundation helper but is no longer used for production scanner UI.
- `src/lib/signals/simulated-signal-engine.ts` remains behind a server-side `ENABLE_SIGNAL_SANDBOX=true` guard.
- `src/lib/backtest/mock-engine.ts` remains behind a server-side `ENABLE_BACKTEST_SANDBOX=true` guard.
- Existing database rows created by earlier sandbox stages are not deleted.

## Modules Requiring Real APIs

- Market Scanner requires Market Data Feed.
- Signals require Market Data Feed plus strategy validation.
- Backtest Lab requires historical candle data.
- Economic Calendar should use `source = provider` or verified `manual` rows before being treated as real macro data.
- Bybit, OKX, MetaTrader, TradingView, and Execution Layer remain not connected.

## Real API Connection Order

1. Stage 17 Vector Memory.
2. Stage 18 CSV Import.
3. Stage 19 Bybit Read-Only.
4. Stage 20 OKX Read-Only.
5. Market Data Feed and historical candles.
6. Scanner activation.
7. Real signal validation.
8. Backtest engine upgrade.

## Data Source Labels

Use these labels consistently:

- Real Data
- User Data
- Manual
- Imported
- Sample
- Sandbox
- Not Connected
- Disabled
