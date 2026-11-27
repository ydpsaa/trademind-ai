const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createClient } = require("@supabase/supabase-js");
const {
  HISTORICAL_MAX_BARS,
  HistoricalFeedError,
  readHistoricalCandles,
} = require("../.quant-build/historical-feed");

const HOUR = 3_600_000;
const START = Date.UTC(2025, 0, 1);
const ISO = (time) => new Date(time).toISOString();

function request(barCount = 120) {
  return {
    symbol: "BTCUSDT",
    timeframe: "1h",
    startMs: START,
    endMs: START + barCount * HOUR,
    asOfMs: Date.UTC(2026, 0, 1),
    minimumBars: 60,
  };
}

function row(index, patch = {}) {
  return {
    provider: "bybit",
    symbol: "BTCUSDT",
    timeframe: "1h",
    opened_at: ISO(START + index * HOUR),
    open: "100.50",
    high: "105",
    low: 99,
    close: 104,
    volume: null,
    is_closed: true,
    fetched_at: ISO(START + (index + 1) * HOUR),
    ...patch,
  };
}

function testStore(rows, { maxRows = 256, replacePage, error = false } = {}) {
  const requests = [];
  const client = createClient("https://fixture.supabase.co", "fixture-publishable-key", {
    accessToken: async () => "fixture-user-token",
    global: {
      fetch: async (input, init) => {
        const url = new URL(input);
        const params = url.searchParams;
        requests.push(url);
        assert.equal(init.method, "GET");
        assert.equal(new Headers(init.headers).get("authorization"), "Bearer fixture-user-token");
        assert.equal(url.pathname, "/rest/v1/market_candles");
        assert.equal(params.get("provider"), "eq.bybit");
        assert.equal(params.get("symbol"), "eq.BTCUSDT");
        assert.equal(params.get("timeframe"), "eq.1h");
        assert.equal(params.get("is_closed"), "eq.true");
        assert.equal(params.get("order"), "opened_at.asc");
        assert.match(params.get("select"), /is_closed,fetched_at$/);

        if (error) {
          return Response.json({ code: "42501", message: "fixture internal database details" }, { status: 403 });
        }
        let page = rows.filter((candidate) => {
          const time = Date.parse(candidate.opened_at);
          return candidate.provider === "bybit" && candidate.symbol === "BTCUSDT" && candidate.timeframe === "1h"
            && candidate.is_closed === true && params.getAll("opened_at").every((filter) => {
              const boundary = Date.parse(filter.slice(filter.indexOf(".") + 1));
              if (filter.startsWith("lt.")) return time < boundary;
              if (filter.startsWith("gte.")) return time >= boundary;
              return time > boundary;
            });
        }).sort((left, right) => Date.parse(left.opened_at) - Date.parse(right.opened_at))
          .slice(0, Math.min(maxRows, Number(params.get("limit"))));
        if (replacePage) page = replacePage(page, requests.length);
        return Response.json(page);
      },
    },
  });

  return { client, requests };
}

test("reads the exact authenticated PostgREST range past server row caps using a timestamp cursor", async () => {
  const count = 1_050;
  const window = request(count);
  const rows = Array.from({ length: count }, (_, index) => row(index));
  const otherRows = [
    row(-1), row(count), row(25, { provider: "twelve-data" }),
    row(25, { timeframe: "5m" }), row(25, { symbol: "ETHUSDT" }), row(25, { is_closed: false }),
  ];
  const { client, requests } = testStore([...rows, ...otherRows].reverse(), { maxRows: 149 });
  const result = await readHistoricalCandles(client, window);

  assert.equal(result.bars.length, count);
  assert.deepEqual(result.bars[0], {
    time: START, open: 100.5, high: 105, low: 99, close: 104, volume: undefined,
  });
  assert.equal(result.bars.at(-1).time, window.endMs - HOUR);
  assert.deepEqual({ ...result.provenance, datasetId: "digest" }, {
    kind: "historical", source: "Bybit spot / market_candles", datasetId: "digest",
    provider: "bybit", venue: "spot", quoteCurrency: "USDT", symbol: "BTCUSDT", timeframe: "1h",
    startMs: START, endMs: window.endMs, asOfMs: window.asOfMs, barCount: count,
    latestFetchedAt: ISO(window.endMs),
  });
  assert.match(result.provenance.datasetId, /^sha256:[a-f0-9]{64}$/);
  assert.equal(requests.length, Math.ceil(count / 149) + 1);
  assert.deepEqual(requests[0].searchParams.getAll("opened_at"), [`lt.${ISO(window.endMs)}`, `gte.${ISO(START)}`]);
  assert.deepEqual(requests[1].searchParams.getAll("opened_at"), [`lt.${ISO(window.endMs)}`, `gt.${rows[148].opened_at}`]);
});

test("rejects malformed, misaligned, future, too small and oversized windows before querying", async () => {
  const { client, requests } = testStore([]);
  const cases = [
    [{ symbol: "XAUUSDT" }, "invalid-range"],
    [{ timeframe: "constructor" }, "invalid-range"],
    [{ startMs: START + 1 }, "invalid-range"],
    [{ endMs: START }, "invalid-range"],
    [{ endMs: START + 121 * HOUR, asOfMs: START + 120 * HOUR }, "invalid-range"],
    [{ asOfMs: 9e15 }, "invalid-range"],
    [{ endMs: START + 59 * HOUR }, "insufficient-data"],
    [{ endMs: START + (HISTORICAL_MAX_BARS + 1) * HOUR }, "range-too-large"],
  ];
  for (const [patch, code] of cases) {
    await assert.rejects(readHistoricalCandles(client, { ...request(), ...patch }), { code });
  }
  assert.equal(requests.length, 0);
});

test("rejects missing starts, interior gaps, trailing gaps, and empty saved history", async () => {
  const rows = Array.from({ length: 120 }, (_, index) => row(index));
  for (const missing of [0, 33, 119]) {
    const { client } = testStore(rows.filter((_, index) => index !== missing));
    await assert.rejects(readHistoricalCandles(client, request()), { code: "incomplete-coverage" });
  }
  const { client } = testStore([]);
  await assert.rejects(readHistoricalCandles(client, request()), { code: "insufficient-data" });
});

test("revalidates row provenance, closed time and OHLCV even if the database response violates the filters", async () => {
  const rows = Array.from({ length: 120 }, (_, index) => row(index));
  for (const patch of [
    { provider: "twelve-data" }, { symbol: "ETHUSDT" }, { timeframe: "4h" }, { is_closed: false },
    { opened_at: "2025-01-01T00:00:00.000001Z" }, { fetched_at: ISO(START) },
    { fetched_at: "2026-01-01T00:00:00.000001Z" }, { fetched_at: "2025-02-30T00:00:00Z" },
    { open: "0x64" }, { open: 0 }, { high: 99 }, { volume: -1 },
  ]) {
    const { client } = testStore(rows, {
      replacePage: (page, pageIndex) => pageIndex === 1 ? [{ ...page[0], ...patch }, ...page.slice(1)] : page,
    });
    await assert.rejects(readHistoricalCandles(client, request()), { code: "invalid-candle" });
  }
});

test("does not accept repeated or misordered timestamps even across pages", async () => {
  const rows = Array.from({ length: 120 }, (_, index) => row(index));
  const { client } = testStore(rows, {
    maxRows: 60,
    replacePage: (page, pageIndex) => pageIndex === 2 ? [rows[59], ...page] : page,
  });
  await assert.rejects(readHistoricalCandles(client, request()), { code: "incomplete-coverage" });
});

test("uses a content fingerprint stable across ingestion timestamps and detects price revisions", async () => {
  const rows = Array.from({ length: 120 }, (_, index) => row(index));
  const first = (await readHistoricalCandles(testStore(rows).client, request())).provenance;
  const rowsRefetched = rows.map((candidate) => ({ ...candidate, fetched_at: ISO(START + 130 * HOUR) }));
  const refetched = (await readHistoricalCandles(testStore(rowsRefetched).client, request())).provenance;
  const revised = (await readHistoricalCandles(testStore([row(0, { close: "104.1" }), ...rows.slice(1)]).client, request())).provenance;

  assert.equal(first.datasetId, refetched.datasetId);
  assert.notEqual(first.latestFetchedAt, refetched.latestFetchedAt);
  assert.notEqual(first.datasetId, revised.datasetId);
});

test("fails closed if storage is unavailable without forwarding database errors", async () => {
  const { client } = testStore([], { error: true });
  for (const unavailable of [client, null]) {
    await assert.rejects(readHistoricalCandles(unavailable, request()),
      (error) => error instanceof HistoricalFeedError && error.code === "storage-unavailable"
        && !error.message.includes("fixture"));
  }
});
