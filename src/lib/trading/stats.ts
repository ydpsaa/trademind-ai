import type { Trade } from "@/lib/trading/types";

export function calculateTradeStats(trades: Trade[]) {
  const closedTrades = trades.filter((trade) => trade.result && trade.result !== "Open");
  const winningTrades = trades.filter((trade) => trade.result === "Win").length;
  const losingTrades = trades.filter((trade) => trade.result === "Loss").length;
  const totalPnl = trades.reduce((sum, trade) => sum + (Number(trade.pnl) || 0), 0);
  const rrValues = trades.map((trade) => Number(trade.rr)).filter((rr) => Number.isFinite(rr));
  const averageRr = rrValues.length ? rrValues.reduce((sum, rr) => sum + rr, 0) / rrValues.length : 0;

  const symbolPnl = trades.reduce<Record<string, number>>((acc, trade) => {
    acc[trade.symbol] = (acc[trade.symbol] || 0) + (Number(trade.pnl) || 0);
    return acc;
  }, {});

  const rankedSymbols = Object.entries(symbolPnl).sort((a, b) => b[1] - a[1]);

  return {
    totalTrades: trades.length,
    winningTrades,
    losingTrades,
    winRate: closedTrades.length ? (winningTrades / closedTrades.length) * 100 : 0,
    totalPnl,
    averageRr,
    bestSymbol: rankedSymbols[0]?.[0] ?? "N/A",
    worstSymbol: rankedSymbols.at(-1)?.[0] ?? "N/A",
  };
}

export function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}
