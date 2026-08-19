# Stage 22 - Market Intelligence Foundation

## Purpose

Market Intelligence converts verified OHLC candles into a consistent market-structure snapshot. It does not generate prices, guarantee outcomes, or place orders.

The data path is:

1. An administrator requests one instrument or all supported instruments for a timeframe.
2. A server-only provider adapter makes one external request.
3. The response is validated and stored in `market_candles`.
4. The rule-based analyzer derives structure fields and stores `market_snapshots`.
5. Authenticated users read stored snapshots through Market Scanner.

Normal page navigation never calls the external provider. The current public feed does not require credentials; future provider credentials remain server-side.

## Real-data rules

- Fewer than 20 valid candles do not produce a snapshot.
- Invalid OHLC rows are rejected.
- Missing data results in a Not Connected or empty state.
- Old source candles are labeled Stale.
- News risk uses verified, non-sample calendar rows only.
- Missing calendar context is Unknown, not Low.
- Confidence is a deterministic evidence score, not a profit probability.

## Stored data

`market_candles` stores normalized provider candles. `market_snapshots` stores the latest derived state for each provider, symbol, and timeframe. `market_data_sync_runs` stores safe operational outcomes without credentials or raw provider responses.

Authenticated users have read-only access to candles and snapshots. Trusted server code performs writes. Sync-run visibility is limited to the authenticated user who requested the run.

## Current provider adapters

The default adapter uses Bybit public market data and does not require an API key:

```text
MARKET_DATA_PROVIDER=bybit
```

Current verified coverage includes spot candles for `BTCUSDT` and `ETHUSDT`, plus Bybit linear contracts for `XAUUSDT`, `XAGUSDT`, `CLUSDT`, `BZUSDT`, `SPXUSDT`, and `QQQUSDT`. These contracts retain their actual Bybit symbols. They are not presented as substitutes for `XAUUSD`, `EURUSD`, `NAS100`, or other different instruments.

The Twelve Data adapter remains available for a future licensed feed:

```text
MARKET_DATA_PROVIDER=twelve-data
TWELVE_DATA_API_KEY=<server-side key>
```

`MARKET_DATA_API_KEY` remains a supported generic fallback variable. Never expose either key in a client component. An unavailable instrument remains empty rather than being substituted with another symbol.

The free hosting plan does not provide frequent scheduled jobs, so refresh is currently an explicit admin action. Stored snapshots are shared read-only across authenticated users and labeled stale when their source candle ages beyond the timeframe threshold.

## Analysis v1

The first deterministic analyzer derives:

- directional bias from the latest close relative to a 20-candle mean;
- trending, ranging, reversal, or unclear structure;
- break of structure and change of character heuristics;
- liquidity sweep, fair value gap, and order-block evidence;
- premium, discount, or equilibrium position inside the 20-candle range;
- setup readiness and an evidence score.

These heuristics are research context. They are not financial advice or automated execution instructions.

## Next work

- Schedule server-side refreshes within provider limits.
- Add coverage-aware instrument discovery.
- Connect stored historical candles to Backtest Lab.
- Validate Signals only after scanner, strategy, news, and risk context are real.
- Add streaming quotes only after rate limits, licensing, and operational monitoring are ready.
