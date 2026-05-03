import type { EquityPoint, SimulatedTrade } from "@/lib/backtest/types";

export function calculateProfitFactor(trades: SimulatedTrade[]) {
  const grossProfit = trades.filter((trade) => trade.pnl > 0).reduce((sum, trade) => sum + trade.pnl, 0);
  const grossLoss = Math.abs(trades.filter((trade) => trade.pnl < 0).reduce((sum, trade) => sum + trade.pnl, 0));

  if (grossLoss === 0) {
    return grossProfit > 0 ? 99 : 0;
  }

  return grossProfit / grossLoss;
}

export function calculateMaxDrawdown(equityCurve: EquityPoint[]) {
  let peak = equityCurve[0]?.balance ?? 0;
  let maxDrawdown = 0;

  for (const point of equityCurve) {
    peak = Math.max(peak, point.balance);
    if (peak > 0) {
      const drawdown = ((peak - point.balance) / peak) * 100;
      maxDrawdown = Math.max(maxDrawdown, drawdown);
    }
  }

  return maxDrawdown;
}

export function calculateWinrate(trades: SimulatedTrade[]) {
  if (!trades.length) return 0;
  const wins = trades.filter((trade) => trade.result === "Win").length;
  return (wins / trades.length) * 100;
}

export function calculateAverageRr(trades: SimulatedTrade[]) {
  if (!trades.length) return 0;
  return trades.reduce((sum, trade) => sum + trade.rr, 0) / trades.length;
}
