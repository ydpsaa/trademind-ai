import { calculateAverageRr, calculateMaxDrawdown, calculateProfitFactor, calculateWinrate } from "@/lib/backtest/stats";
import type { BacktestInput, BacktestResult, EquityPoint, SimulatedTrade } from "@/lib/backtest/types";

const timeframeTradesPerWeek: Record<string, number> = {
  "1m": 18,
  "5m": 14,
  "15m": 9,
  "1h": 5,
  "4h": 3,
  "1D": 1,
};

function hashString(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededRandom(seed: number) {
  let state = seed || 1;
  return () => {
    state = Math.imul(1664525, state) + 1013904223;
    return ((state >>> 0) % 10000) / 10000;
  };
}

function daysBetween(start: Date, end: Date) {
  return Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86_400_000));
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function strictnessScore(input: BacktestInput) {
  const rules = input.strategyRules;
  const confirmations = [rules.requiresBos, rules.requiresChoch, rules.requiresLiquiditySweep, rules.requiresFvg, rules.requiresOrderBlock].filter(Boolean).length;
  return confirmations + (rules.avoidHighImpactNews ? 1 : 0) + Math.max(0, input.minimumRr - 1.5);
}

export function runMockBacktest(input: BacktestInput): BacktestResult {
  const start = new Date(input.periodStart);
  const end = new Date(input.periodEnd);
  const dayCount = daysBetween(start, end);
  const weeks = Math.max(1, dayCount / 7);
  const strictness = strictnessScore(input);
  const baseTrades = timeframeTradesPerWeek[input.timeframe] ?? 5;
  const tradeCount = clamp(Math.round(weeks * baseTrades * Math.max(0.35, 1.1 - strictness * 0.07)), 3, 180);
  const random = seededRandom(hashString(`${input.strategyId}:${input.symbol}:${input.timeframe}:${input.periodStart}:${input.periodEnd}`));
  const baseWinChance = clamp(0.47 + strictness * 0.018 + Math.min(input.minimumRr, 4) * 0.018 - input.riskPerTrade * 0.006, 0.36, 0.68);
  const trades: SimulatedTrade[] = [];
  const equityCurve: EquityPoint[] = [{ index: 0, date: start.toISOString(), balance: input.initialBalance }];
  let balance = input.initialBalance;

  for (let index = 0; index < tradeCount; index += 1) {
    const progress = tradeCount === 1 ? 1 : index / (tradeCount - 1);
    const openedAt = new Date(start.getTime() + (end.getTime() - start.getTime()) * progress);
    const roll = random();
    const isBreakeven = roll > 0.965;
    const isWin = !isBreakeven && roll <= baseWinChance;
    const riskAmount = balance * (input.riskPerTrade / 100);
    const rrNoise = (random() - 0.5) * 0.8;
    const rr = isBreakeven ? 0 : clamp(input.minimumRr + rrNoise, 0.6, 5);
    const pnl = isBreakeven ? 0 : isWin ? riskAmount * rr : -riskAmount * clamp(0.75 + random() * 0.45, 0.6, 1.25);
    balance += pnl;

    trades.push({
      id: `sim-${index + 1}`,
      openedAt: openedAt.toISOString(),
      symbol: input.symbol,
      direction: random() > 0.5 ? "Long" : "Short",
      result: isBreakeven ? "Breakeven" : isWin ? "Win" : "Loss",
      rr: Number(rr.toFixed(2)),
      pnl: Number(pnl.toFixed(2)),
      balanceAfter: Number(balance.toFixed(2)),
    });

    equityCurve.push({ index: index + 1, date: openedAt.toISOString(), balance: Number(balance.toFixed(2)) });
  }

  const warnings = [
    "Simulated backtest foundation. Real market data is not connected yet.",
    "Results are deterministic mock output for workflow validation, not historical performance.",
  ];
  if (input.strategyRules.avoidHighImpactNews) {
    warnings.push("Strategy news filter was included in the simulation assumptions.");
  }

  const result: BacktestResult = {
    finalBalance: Number(balance.toFixed(2)),
    totalTrades: trades.length,
    winrate: Number(calculateWinrate(trades).toFixed(2)),
    profitFactor: Number(calculateProfitFactor(trades).toFixed(2)),
    maxDrawdown: Number(calculateMaxDrawdown(equityCurve).toFixed(2)),
    avgRr: Number(calculateAverageRr(trades).toFixed(2)),
    report: {
      engineType: "simulated",
      equityCurve,
      simulatedTrades: trades,
      summary: `${input.strategyName} generated ${trades.length} simulated trades on ${input.symbol}. This is a foundation test until real market data is connected.`,
      warnings,
      strategySnapshot: {
        id: input.strategyId,
        name: input.strategyName,
        rules: input.strategyRules,
      },
      input,
    },
  };

  return result;
}
