const assert = require("node:assert/strict");
const { test } = require("node:test");
const { historicalMinimumBars, runHistoricalResearch } = require("../.quant-build/historical-engine");

const startMs = Date.UTC(2025, 0, 1);
const interval = 3_600_000;
const defaultInput = {
  symbol: "BTCUSDT",
  model: "momentum",
  mode: "backtest",
  initialCapital: 10_000,
  feeBps: 0,
  slippageBps: 0,
};

function syntheticBars(count, priceAt = (index) => 100 + index, openAt = priceAt) {
  return Array.from({ length: count }, (_, index) => {
    const open = openAt(index);
    const close = priceAt(index);
    return {
      time: startMs + index * interval,
      open,
      close,
      high: Math.max(open, close) + 1,
      low: Math.min(open, close) - 1,
    };
  });
}

function run(bars, changes) {
  return runHistoricalResearch({ BTCUSDT: bars }, { ...defaultInput, ...changes });
}

function approximately(actual, expected) {
  assert.ok(Math.abs(actual - expected) < 1e-8, `expected ${actual} to be close to ${expected}`);
}

test("a close signal fills at the following open and liquidation uses the last close with two-sided costs", () => {
  const bars = syntheticBars(60, undefined, (index) => index === 21 ? 125 : 100 + index);
  const result = run(bars, { feeBps: 40, slippageBps: 30 });
  const window = result.executions[0];
  const [trade] = window.trades;
  const buy = 125 * 1.003;
  const sell = 159 * 0.997;
  const quantity = 10_000 / (1.004 * buy);
  const final = quantity * sell * 0.996;

  assert.equal(window.startMs, startMs);
  assert.equal(window.endMs, startMs + 60 * interval);
  assert.equal(trade.entrySignalBarMs, bars[20].time);
  assert.equal(trade.entryAtMs, bars[21].time);
  assert.equal(trade.exitSignalBarMs, null);
  assert.equal(trade.exitAtMs, window.endMs);
  assert.equal(trade.exitReason, "end-of-window liquidation");
  assert.equal(trade.entryPrice, buy);
  assert.equal(trade.exitPrice, sell);
  approximately(trade.quantity, quantity);
  approximately(result.summary.commissions, quantity * (buy + sell) * 0.004);
  approximately(result.summary.slippageCost, quantity * ((buy - 125) + (159 - sell)));
  approximately(result.summary.finalEquity, final);
  approximately(trade.netPnl, final - 10_000);
  approximately(result.summary.netReturn, final / 10_000 - 1);
  approximately(result.summary.maxDrawdown, 1 - quantity * 121 / 10_000);
  assert.equal(window.curve.at(-1).equity, result.summary.finalEquity);
  assert.equal(window.curve.at(-1).time, window.endMs);
  assert.equal(result.summary.tradeCount, 1);
  assert.ok(run(bars).summary.finalEquity > result.summary.finalEquity);
});

test("negative momentum closes a long on the following open and remains cash instead of opening a short", () => {
  const bars = syntheticBars(100, (index) => index < 35 ? 100 + index * 2 : 170 - (index - 35) * 2);
  const result = run(bars);
  const [trade] = result.executions[0].trades;
  assert.equal(result.summary.tradeCount, 1);
  assert.ok(trade.quantity > 0);
  assert.equal(trade.exitReason, "non-positive momentum");
  assert.equal(trade.exitSignalBarMs + interval, trade.exitAtMs);
  assert.ok(trade.exitAtMs < result.executions[0].endMs);
  assert.equal(result.executions[0].curve.at(-1).equity, result.executions[0].curve.at(-2).equity);
});

test("the holdout selects on training only and starts the untouched test segment flat", () => {
  const rising = syntheticBars(150);
  const changedHoldout = syntheticBars(150, (index) => index < 105 ? 100 + index : 400 - 2 * index);
  const config = { mode: "holdout", model: "trend-following", feeBps: 17, slippageBps: 6 };
  const [first] = run(rising, config).executions;
  const [second] = run(changedHoldout, config).executions;

  assert.deepEqual(first.training, second.training);
  assert.deepEqual(first.parameters, second.parameters);
  assert.equal(first.presetId, "fast");
  assert.equal(first.training.endMs, first.startMs);
  assert.equal(first.training.barCount, 105);
  assert.equal(first.barCount, 45);
  assert.equal(first.curve[0].equity, 10_000);
  assert.equal(second.curve[0].equity, 10_000);
  assert.equal(first.trades[0].entrySignalBarMs, first.startMs);
  assert.equal(first.trades[0].entryAtMs, first.startMs + interval);
  assert.notDeepEqual(first.metrics, second.metrics);
});

test("modeled trading costs affect the preset selected on training", () => {
  const bars = syntheticBars(150, (index) => 100 + index * 0.02 + Math.sin(index * 0.1) * 2);
  const config = { mode: "holdout", model: "trend-following" };
  const [beforeCosts] = run(bars, config).executions;
  const [afterCosts] = run(bars, { ...config, feeBps: 100, slippageBps: 25 }).executions;

  assert.equal(beforeCosts.presetId, "fast");
  assert.equal(afterCosts.presetId, "balanced");
  assert.ok(afterCosts.training.netReturn < beforeCosts.training.netReturn);
  assert.equal(beforeCosts.training.endMs, afterCosts.training.endMs);
});

test("walk-forward OOS windows never overlap, use a rolling train window and compound settled equity", () => {
  const bars = syntheticBars(169, (index) => 100 + index * 0.55 + Math.sin(index * 0.23) * 8);
  const config = { mode: "walk-forward", model: "trend-following", feeBps: 25, slippageBps: 10 };
  const result = run(bars, config);
  const [first, second, third] = result.executions;

  assert.equal(result.executions.length, 3);
  assert.equal(result.unusedTailBars, 1);
  assert.equal(first.training.startMs, bars[0].time);
  assert.equal(second.training.startMs, bars[24].time);
  assert.equal(third.training.startMs, bars[48].time);
  assert.equal(first.endMs, second.startMs);
  assert.equal(second.endMs, third.startMs);
  assert.equal(third.endMs, bars[168].time);
  assert.equal(second.metrics.initialCapital, first.metrics.finalEquity);
  assert.equal(third.metrics.initialCapital, second.metrics.finalEquity);
  assert.equal(result.summary.finalEquity, third.metrics.finalEquity);
  assert.equal(result.summary.tradeCount, result.executions.reduce((sum, fold) => sum + fold.trades.length, 0));
  approximately(result.summary.netPnl, result.executions.reduce((sum, fold) => sum + fold.metrics.netPnl, 0));

  let peak = defaultInput.initialCapital;
  let maxDrawdown = 0;
  for (const fold of result.executions) {
    assert.equal(fold.training.barCount, 96);
    assert.equal(fold.training.endMs, fold.startMs);
    assert.equal(fold.barCount, 24);
    assert.ok(fold.trades.every((trade) => trade.entryAtMs > fold.startMs && trade.exitAtMs <= fold.endMs));
    for (const point of fold.curve) {
      peak = Math.max(peak, point.equity);
      maxDrawdown = Math.max(maxDrawdown, 1 - point.equity / peak);
    }
  }
  approximately(result.summary.maxDrawdown, maxDrawdown);
});

test("changing future candles and appending a fold preserves all prior walk-forward decisions and fills", () => {
  const bars = syntheticBars(144, (index) => 200 + index * 0.65 + Math.sin(index * 0.185) * 18);
  const future = syntheticBars(168, (index) => 420 - index * 1.5).slice(144);
  const config = { mode: "walk-forward", model: "breakout", feeBps: 15, slippageBps: 7 };
  const original = run(bars, config);
  assert.equal(original.executions.length, 2);

  const extended = run([...bars, ...future], config);
  assert.equal(extended.executions.length, 3);
  assert.deepEqual(extended.executions.slice(0, 2), original.executions);
  const changedSecond = run([...bars.slice(0, 120), ...syntheticBars(144, (index) => 420 - index * 1.5).slice(120)], config);
  assert.deepEqual(changedSecond.executions[0], original.executions[0]);
  assert.deepEqual(changedSecond.executions[1].training, original.executions[1].training);
  assert.deepEqual(changedSecond.executions[1].parameters, original.executions[1].parameters);
});

test("ties are deterministic and a no-trade test remains cash with finite zero metrics", () => {
  const result = run(syntheticBars(120, () => 100), { mode: "holdout", model: "mean-reversion" });
  assert.equal(result.executions[0].presetId, "balanced");
  assert.equal(result.summary.tradeCount, 0);
  assert.equal(result.summary.netReturn, 0);
  assert.equal(result.summary.maxDrawdown, 0);
  assert.equal(result.summary.commissions, 0);
});

test("unsupported markets, sandbox models, broken history and invalid costs cannot execute", () => {
  const bars = syntheticBars(60);
  assert.throws(() => runHistoricalResearch({ SOLUSDT: bars }, { ...defaultInput, symbol: "SOLUSDT" }), /spot symbol/);
  assert.throws(() => runHistoricalResearch({ BTCUSDT: bars, ETHUSDT: bars }, defaultInput), /spot symbol/);
  assert.throws(() => run(bars, { model: "pairs-trading" }), /Unsupported/);
  assert.throws(() => run(bars, { model: "market-making" }), /Unsupported/);
  assert.throws(() => run(bars, { feeBps: -1 }), /fee/);
  assert.throws(() => run(bars, { slippageBps: Infinity }), /slippage/);
  assert.throws(() => run(bars, { initialCapital: NaN }), /capital/);
  const gap = bars.slice();
  gap[59] = { ...gap[59], time: gap[59].time + interval };
  assert.throws(() => run(gap), /continuous/);
  const invalid = bars.slice();
  invalid[59] = { ...invalid[59], high: 0 };
  assert.throws(() => run(invalid), /OHLC/);
  for (const [mode, count] of Object.entries(historicalMinimumBars)) {
    assert.throws(() => run(syntheticBars(count - 1), { mode }), /closed bars/);
  }
});
