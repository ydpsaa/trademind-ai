import { getPeriodRange } from "@/lib/trading/periods";
import { calculateTradeStats, formatMoney } from "@/lib/trading/stats";
import type { Trade } from "@/lib/trading/types";

export function calculateDashboardStats(trades: Trade[]) {
  const monthRange = getPeriodRange("month");
  const monthTrades = trades.filter((trade) => {
    if (!trade.opened_at) return false;
    const openedAt = new Date(trade.opened_at);
    return openedAt >= monthRange.start && openedAt <= monthRange.end;
  });

  const allStats = calculateTradeStats(trades);
  const monthStats = calculateTradeStats(monthTrades);
  const recentTrades = [...trades]
    .sort((a, b) => new Date(b.opened_at || b.created_at || 0).getTime() - new Date(a.opened_at || a.created_at || 0).getTime())
    .slice(0, 5);

  return {
    totalPnl: allStats.totalPnl,
    currentMonthPnl: monthStats.totalPnl,
    winRate: allStats.winRate,
    totalTrades: allStats.totalTrades,
    bestSymbol: allStats.bestSymbol,
    recentTrades,
    metricCards: [
      {
        label: "Total PnL",
        value: formatMoney(allStats.totalPnl),
        delta: `${allStats.totalTrades} total trades`,
        positive: allStats.totalPnl >= 0,
      },
      {
        label: "Current Month PnL",
        value: formatMoney(monthStats.totalPnl),
        delta: `${monthStats.totalTrades} trades this month`,
        positive: monthStats.totalPnl >= 0,
      },
      {
        label: "Win Rate",
        value: `${allStats.winRate.toFixed(1)}%`,
        delta: `${allStats.winningTrades} wins / ${allStats.losingTrades} losses`,
        positive: allStats.winRate >= 50,
      },
      {
        label: "Total Trades",
        value: allStats.totalTrades.toString(),
        delta: "Real journal data",
        positive: true,
      },
      {
        label: "Best Symbol",
        value: allStats.bestSymbol,
        delta: allStats.bestSymbol === "N/A" ? "Add trades to rank symbols" : "Top PnL contributor",
        positive: true,
      },
    ],
  };
}
