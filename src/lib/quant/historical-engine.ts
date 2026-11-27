import { createQuantStrategy } from "./registry";
import { momentumScore } from "./models/momentum";
import { range, requireFinite, validateMarket } from "./math";
import { HISTORICAL_MAX_BARS, spotSymbols, type SpotSymbol } from "./provider-data";
import type { EquityPoint, Market, Strategy, Weights } from "./types";

export const historicalModels = ["momentum", "mean-reversion", "trend-following", "breakout"] as const;
export const historicalModes = ["backtest", "holdout", "walk-forward"] as const;

export type HistoricalModel = (typeof historicalModels)[number];
export type HistoricalMode = (typeof historicalModes)[number];

export const historicalMethod = {
  holdoutTrainingFraction: 0.7,
  walkForwardTrainingBars: 96,
  walkForwardTestBars: 24,
  minimumWalkForwardFolds: 2,
  maximumBars: HISTORICAL_MAX_BARS,
} as const;

export const historicalMinimumBars = {
  backtest: 60,
  holdout: 120,
  "walk-forward": historicalMethod.walkForwardTrainingBars
    + historicalMethod.walkForwardTestBars * historicalMethod.minimumWalkForwardFolds,
} as const satisfies Record<HistoricalMode, number>;

export const historicalInputBounds = {
  initialCapital: { min: 1, max: 1_000_000_000 },
  feeBps: { min: 0, max: 1_000 },
  slippageBps: { min: 0, max: 1_000 },
} as const;

export type HistoricalInput = Readonly<{
  symbol: SpotSymbol;
  model: HistoricalModel;
  mode: HistoricalMode;
  initialCapital: number;
  feeBps: number;
  slippageBps: number;
}>;

export type HistoricalMetrics = Readonly<{
  initialCapital: number;
  finalEquity: number;
  netPnl: number;
  netReturn: number;
  maxDrawdown: number;
  commissions: number;
  slippageCost: number;
  tradeCount: number;
}>;

export type HistoricalTrade = Readonly<{
  entryAtMs: number;
  entrySignalBarMs: number;
  exitAtMs: number;
  exitSignalBarMs: number | null;
  exitReason: string;
  quantity: number;
  entryPrice: number;
  exitPrice: number;
  commissions: number;
  slippageCost: number;
  netPnl: number;
}>;

type WindowRange = Readonly<{ startMs: number; endMs: number; barCount: number }>;
type PresetId = "balanced" | "fast" | "slow";

export type HistoricalWindow = WindowRange & Readonly<{
  presetId: PresetId;
  parameters: Readonly<Record<string, number>>;
  training: (WindowRange & Readonly<{ netReturn: number }>) | null;
  metrics: HistoricalMetrics;
  curve: readonly EquityPoint[];
  trades: readonly HistoricalTrade[];
}>;

export type HistoricalResearchResult = HistoricalInput & Readonly<{
  executions: readonly HistoricalWindow[];
  summary: HistoricalMetrics;
  unusedTailBars: number;
}>;

const presetIds: readonly PresetId[] = ["balanced", "fast", "slow"];

function getPreset(model: HistoricalModel, symbol: SpotSymbol, id: PresetId) {
  switch (model) {
    case "momentum": {
      const parameters = { lookback: { balanced: 20, fast: 12, slow: 36 }[id], skip: 1 };
      // The legacy cross-sectional ranking is always invested with one asset.
      // Absolute momentum makes the cash decision explicit in single-asset spot.
      const strategy: Strategy = (prefix, index) => {
        const score = momentumScore(prefix, symbol, index, parameters.lookback, parameters.skip);
        if (score === null) return null;
        const weights: Weights = score > 0 ? { [symbol]: 1 } : {};
        return { weights, reason: score > 0 ? "positive momentum" : "non-positive momentum" };
      };
      return { id, parameters, strategy };
    }
    case "mean-reversion": {
      const parameters = { window: { balanced: 20, fast: 12, slow: 36 }[id], entryZ: 2, exitZ: 0.5, stopZ: 4 };
      return { id, parameters, strategy: createQuantStrategy({ version: 1, model, parameters: { ...parameters, symbol, short: false } }) };
    }
    case "trend-following": {
      const parameters = {
        fast: { balanced: 15, fast: 7, slow: 20 }[id],
        slow: { balanced: 35, fast: 20, slow: 50 }[id],
      };
      return { id, parameters, strategy: createQuantStrategy({ version: 1, model, parameters: { ...parameters, symbol, short: false } }) };
    }
    case "breakout": {
      const parameters = {
        entryWindow: { balanced: 20, fast: 12, slow: 36 }[id],
        exitWindow: { balanced: 10, fast: 6, slow: 18 }[id],
      };
      return { id, parameters, strategy: createQuantStrategy({ version: 1, model, parameters: { ...parameters, symbol, short: false } }) };
    }
  }
}

type Preset = ReturnType<typeof getPreset>;
type ScoredRange = { start: number; end: number; warmupStart: number };

function summarize(initial: number, final: number, maxDrawdown: number, trades: readonly HistoricalTrade[]): HistoricalMetrics {
  return {
    initialCapital: initial,
    finalEquity: final,
    netPnl: requireFinite(final - initial, "net PnL"),
    netReturn: requireFinite(final / initial - 1, "net return"),
    maxDrawdown,
    commissions: requireFinite(trades.reduce((sum, trade) => sum + trade.commissions, 0), "total commission"),
    slippageCost: requireFinite(trades.reduce((sum, trade) => sum + trade.slippageCost, 0), "total slippage"),
    tradeCount: trades.length,
  };
}

/** Caller supplies stored, validated and closed candles. This pure engine cannot attest their source. */
export function runHistoricalResearch(market: Market, input: HistoricalInput): HistoricalResearchResult {
  const { symbol, model, mode } = input;
  if (!spotSymbols.includes(symbol) || Object.keys(market).length !== 1 || !Object.prototype.hasOwnProperty.call(market, symbol)) {
    throw new Error("Historical research requires one supported spot symbol.");
  }
  if (!historicalModels.includes(model) || !historicalModes.includes(mode)) {
    throw new Error("Unsupported historical strategy or research mode.");
  }
  const { initialCapital, feeBps, slippageBps } = historicalInputBounds;
  const capital = range(input.initialCapital, "initial capital", initialCapital.min, initialCapital.max);
  const fee = range(input.feeBps, "fee", feeBps.min, feeBps.max) / 10_000;
  const slippage = range(input.slippageBps, "slippage", slippageBps.min, slippageBps.max) / 10_000;

  const bars = market[symbol];
  if (bars.length < historicalMinimumBars[mode] || bars.length > historicalMethod.maximumBars) {
    throw new Error(`${mode} requires ${historicalMinimumBars[mode]}–${historicalMethod.maximumBars} closed bars.`);
  }
  validateMarket(market);
  const interval = bars[1].time - bars[0].time;
  if (!bars.every((bar, index) => bar.time === bars[0].time + index * interval)
    || !Number.isSafeInteger(bars[bars.length - 1].time + interval)) {
    throw new Error("Historical candles must form one continuous interval.");
  }

  const presets = presetIds.map((id) => getPreset(model, symbol, id));
  const executions: HistoricalWindow[] = [];
  let equity = capital;
  let unusedTailBars = 0;

  function describe(start: number, end: number): WindowRange {
    return { startMs: bars[start].time, endMs: bars[end - 1].time + interval, barCount: end - start };
  }

  function simulate({ start, end, warmupStart }: ScoredRange, preset: Preset, startingCash: number) {
    type Position = {
      quantity: number;
      enteredAt: number;
      signalBar: number;
      entryReference: number;
      entryPrice: number;
      entryFee: number;
      entryCash: number;
    };
    type Order = { enter: boolean; signalBar: number; reason: string };
    const trades: HistoricalTrade[] = [];
    const curve: EquityPoint[] = [];
    const prefix = bars.slice(warmupStart, start);
    const available: Market = { [symbol]: prefix };
    let cash = startingCash;
    let position: Position | null = null;
    let order: Order | null = null;
    let peak = startingCash;
    let maxDrawdown = 0;

    function enter(reference: number, time: number, signalBar: number): Position {
      const price = requireFinite(reference * (1 + slippage), "entry price");
      const notional = cash / (1 + fee);
      const quantity = requireFinite(notional / price, "position quantity");
      if (quantity <= 0) throw new Error("Position size is outside the supported numeric range.");
      // The entire pre-fee entry budget comes from cash. The modeled commission is included in that budget.
      return { quantity, enteredAt: time, signalBar, entryReference: reference, entryPrice: price, entryFee: notional * fee, entryCash: cash };
    }

    function exit(open: Position, reference: number, time: number, signalBar: number | null, reason: string) {
      const price = requireFinite(reference * (1 - slippage), "exit price");
      const notional = requireFinite(open.quantity * price, "exit value");
      const exitFee = notional * fee;
      cash = notional - exitFee;
      if (cash <= 0) throw new Error("Position value is outside the supported numeric range.");
      trades.push({
        entryAtMs: open.enteredAt,
        entrySignalBarMs: open.signalBar,
        exitAtMs: time,
        exitSignalBarMs: signalBar,
        exitReason: reason,
        quantity: open.quantity,
        entryPrice: open.entryPrice,
        exitPrice: price,
        commissions: requireFinite(open.entryFee + exitFee, "trade commission"),
        slippageCost: requireFinite(open.quantity * ((open.entryPrice - open.entryReference) + (reference - price)), "trade slippage"),
        netPnl: requireFinite(cash - open.entryCash, "trade PnL"),
      });
    }

    for (let index = start; index < end; index++) {
      const bar = bars[index];
      const closeMs = bar.time + interval;

      // A prior close can only schedule a fill at the following open.
      if (order) {
        if (order.enter) {
          position = enter(bar.open, bar.time, order.signalBar);
          cash = 0;
        } else if (position) {
          exit(position, bar.open, bar.time, order.signalBar, order.reason);
          position = null;
        }
        order = null;
      }
      if (index === end - 1 && position) {
        exit(position, bar.close, closeMs, null, "end-of-window liquidation");
        position = null;
      }

      const marked = requireFinite(cash + (position?.quantity ?? 0) * bar.close, "marked equity");
      peak = Math.max(peak, marked);
      const drawdown = Math.max(0, 1 - marked / peak);
      maxDrawdown = Math.max(maxDrawdown, drawdown);
      curve.push({ time: closeMs, equity: marked, drawdown });

      if (index === end - 1) break;
      // Warm-up contributes prices only. Every scored range starts flat, with no pending training order.
      prefix.push(bar);
      const current = Boolean(position);
      const signal = preset.strategy(available, prefix.length - 1, current ? { [symbol]: 1 } : {});
      if (!signal) continue;
      const target = signal.weights[symbol] ?? 0;
      if ((target !== 0 && target !== 1) || Object.keys(signal.weights).some((key) => key !== symbol)) {
        throw new Error("Historical strategies can only request cash or one fully funded spot position.");
      }
      if ((target > 0) !== current) order = { enter: target > 0, signalBar: bar.time, reason: signal.reason };
    }

    return { metrics: summarize(startingCash, cash, maxDrawdown, trades), trades, curve };
  }

  function evaluate(scored: ScoredRange, trainingRange: ScoredRange | null) {
    let chosen = presets[0];
    let training: HistoricalWindow["training"] = null;
    if (trainingRange) {
      let bestReturn = -Infinity;
      for (const preset of presets) {
        const { metrics } = simulate(trainingRange, preset, capital);
        // Ties resolve in the declared order. Only after-cost training returns enter selection.
        if (metrics.netReturn > bestReturn) {
          bestReturn = metrics.netReturn;
          chosen = preset;
        }
      }
      training = { ...describe(trainingRange.start, trainingRange.end), netReturn: bestReturn };
    }
    const result = simulate(scored, chosen, equity);
    executions.push({
      ...describe(scored.start, scored.end),
      presetId: chosen.id,
      parameters: chosen.parameters,
      training,
      ...result,
    });
    equity = result.metrics.finalEquity;
  }

  if (mode === "backtest") {
    evaluate({ start: 0, end: bars.length, warmupStart: 0 }, null);
  } else if (mode === "holdout") {
    const split = Math.floor(bars.length * historicalMethod.holdoutTrainingFraction);
    evaluate({ start: split, end: bars.length, warmupStart: 0 }, { start: 0, end: split, warmupStart: 0 });
  } else {
    const { walkForwardTrainingBars: trainBars, walkForwardTestBars: testBars } = historicalMethod;
    for (let start = trainBars; start + testBars <= bars.length; start += testBars) {
      const warmupStart = start - trainBars;
      evaluate({ start, end: start + testBars, warmupStart }, { start: warmupStart, end: start, warmupStart });
    }
    unusedTailBars = (bars.length - trainBars) % testBars;
  }

  // Measure combined drawdown with a continuous peak across compounded OOS folds.
  let peak = capital;
  let maxDrawdown = 0;
  const trades: HistoricalTrade[] = [];
  for (const window of executions) {
    trades.push(...window.trades);
    const { curve } = window;
    for (const point of curve) {
      peak = Math.max(peak, point.equity);
      maxDrawdown = Math.max(maxDrawdown, Math.max(0, 1 - point.equity / peak));
    }
  }

  return {
    symbol,
    model,
    mode,
    initialCapital: capital,
    feeBps: input.feeBps,
    slippageBps: input.slippageBps,
    executions,
    summary: summarize(capital, equity, maxDrawdown, trades),
    unusedTailBars,
  };
}
