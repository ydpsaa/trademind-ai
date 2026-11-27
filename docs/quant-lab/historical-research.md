# Quant Lab v0.3.0 — Historical Research Engine

Open **Backtest Lab → Open Quant Lab** while signed in. The engine reads the shared Market Data Feed through the caller's authenticated Supabase client. It uses stored Bybit spot candles for BTCUSDT or ETHUSDT on 5m, 15m, 1h, or 4h intervals. Enter UTC dates with an exclusive end date. A run needs complete, contiguous coverage. The form shows the selected candle count and the required range for its method. Quant Lab reads existing storage and issues no sync or backfill requests.

| Method | Minimum candles | Evaluation |
| --- | ---: | --- |
| Fixed-preset backtest | 60 | Use the balanced preset throughout the selected range. |
| Chronological holdout | 120 | Select a preset using the first 70% and evaluate it on the final 30%. |
| Walk-forward | 144 | Select a preset from the preceding 96 candles for each non-overlapping 24-candle evaluation. Require at least two complete evaluation windows and disclose any trailing candles. |

The limit is 1,200 candles per request. Historical strategies are Momentum, Mean Reversion, Trend Following, and Breakout. Momentum uses absolute momentum for a single asset. Each strategy holds cash or one fully funded long spot position. The engine ranks preset candidates on after-cost training return, uses closed candles to compute a signal, and fills signal-driven orders at the next open. Evaluation windows start in cash. Each window settles any open position at the last candle close. Walk-forward carries forward only the settled USDT balance. Reported drawdown uses candle closes. Intrabar sequencing, order-book depth, partial fills, and exchange account fees are outside this model.

Coverage includes the stored source, full time span, candle count, latest fetch time and a SHA-256 fingerprint of normalized candle values. The fingerprint identifies the data consumed by the run. The shared table is a current historical snapshot and does not archive revisions as they were known at each simulated time.

The page keeps the current report in the research session. Backtest Lab links into Quant Lab and continues to show saved legacy runs with Sandbox or unverified provenance. Pairs trading, market making, synthetic scenarios, unverified CSV and the prop probability simulator remain available in the standalone v0.2 Sandbox. Spot runs establish no prop-firm evaluation outcome.

```sh
npm ci
npm run test:quant
npm run lint
npx tsc --noEmit
npm run build
```

Tests cover allowlisted inputs, SDK query filters and pagination, missing and invalid candles, content fingerprints, fill timing, cost accounting, and invariance of training selection and previously completed folds to changes in future candles.
