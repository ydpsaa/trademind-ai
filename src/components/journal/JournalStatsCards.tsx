import { GlassCard } from "@/components/ui/GlassCard";
import { formatMoney } from "@/lib/trading/stats";

interface JournalStatsCardsProps {
  stats: {
    totalTrades: number;
    winRate: number;
    totalPnl: number;
    averageRr: number;
    bestSymbol: string;
    worstSymbol: string;
  };
}

export function JournalStatsCards({ stats }: JournalStatsCardsProps) {
  const cards = [
    ["Total Trades", stats.totalTrades.toString(), "Selected period"],
    ["Win Rate", `${stats.winRate.toFixed(1)}%`, "Closed trades"],
    ["Total PnL", formatMoney(stats.totalPnl), "Realized journal PnL"],
    ["Average RR", stats.averageRr ? stats.averageRr.toFixed(2) : "0.00", "Average risk reward"],
    ["Best Symbol", stats.bestSymbol, "Top contributor"],
    ["Worst Symbol", stats.worstSymbol, "Needs attention"],
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
      {cards.map(([label, value, helper]) => (
        <GlassCard key={label} className="min-w-0 p-4">
          <div className="text-xs text-zinc-500">{label}</div>
          <div className="mt-2 truncate text-xl font-semibold text-white">{value}</div>
          <div className="mt-2 truncate text-[11px] text-zinc-500">{helper}</div>
        </GlassCard>
      ))}
    </div>
  );
}
