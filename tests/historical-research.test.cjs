const assert = require("node:assert/strict");
const { test } = require("node:test");
const { parseHistoricalResearchForm, HistoricalInputError } = require("../.quant-build/historical-research.js");

const asOfMs = Date.parse("2026-11-27T06:00:00Z");
const validFields = {
  symbol: "BTCUSDT",
  timeframe: "4h",
  startDate: "2026-11-01",
  endDate: "2026-11-27",
  strategy: "trend-following",
  mode: "walk-forward",
  initialCapital: "10000",
  feeBps: "10.5",
  slippageBps: "5",
};

function form(overrides = {}) {
  const data = new FormData();
  for (const [key, value] of Object.entries({ ...validFields, ...overrides })) data.set(key, value);
  return data;
}

test("parses one whitelist spot market and sets the entire range in UTC with an exclusive end", () => {
  const request = parseHistoricalResearchForm(form(), asOfMs);
  assert.deepEqual(request.feed, {
    symbol: "BTCUSDT", timeframe: "4h",
    startMs: Date.parse("2026-11-01T00:00:00Z"), endMs: Date.parse("2026-11-27T00:00:00Z"),
    asOfMs, minimumBars: 144,
  });
  assert.equal(request.requestedBars, 156);
  assert.deepEqual(request.engine, {
    symbol: "BTCUSDT", model: "trend-following", mode: "walk-forward",
    initialCapital: 10000, feeBps: 10.5, slippageBps: 5,
  });
});

test("rejects unsupported instruments, intervals, methods and Sandbox models", () => {
  for (const overrides of [
    { symbol: "XAUUSDT" }, { timeframe: "constructor" }, { mode: "random-split" },
    { strategy: "pairs-trading" }, { strategy: "market-making" },
  ]) assert.throws(() => parseHistoricalResearchForm(form(overrides), asOfMs), HistoricalInputError);
});

test("rejects impossible UTC dates, open-date ranges and malformed costs", () => {
  for (const overrides of [
    { startDate: "2026-11-31" }, { startDate: "2026-11-27" }, { endDate: "2026-11-28" },
    { endDate: "2026-11-27T00:00:00+01:00" }, { feeBps: "" }, { feeBps: "0xA" },
    { initialCapital: "0" }, { slippageBps: "1001" }, { slippageBps: "Infinity" },
  ]) assert.throws(() => parseHistoricalResearchForm(form(overrides), asOfMs), HistoricalInputError);
});

test("rejects duplicate and non-text entries from external form submissions", () => {
  const request = form();
  request.append("symbol", "ETHUSDT");
  assert.throws(() => parseHistoricalResearchForm(request, asOfMs), HistoricalInputError);
  request.set("symbol", "BTCUSDT");
  request.set("initialCapital", new Blob(["10000"]));
  assert.throws(() => parseHistoricalResearchForm(request, asOfMs), HistoricalInputError);
});
