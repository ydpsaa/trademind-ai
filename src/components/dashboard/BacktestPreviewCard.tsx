import { Target } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { backtestSummary } from "@/lib/mock-data";
import type { BacktestRow } from "@/lib/backtest/types";

function formatCurrency(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "$0.00";
  return Number(value).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function BacktestCurve({ points }: { points?: { balance: number }[] }) {
  if (points?.length) {
    const balances = points.map((point) => point.balance);
    const min = Math.min(...balances);
    const max = Math.max(...balances);
    const range = Math.max(1, max - min);
    const path = points
      .map((point, index) => {
        const x = (index / Math.max(1, points.length - 1)) * 500;
        const y = 145 - ((point.balance - min) / range) * 120;
        return `${index === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(" ");

    return (
      <svg className="h-28 w-full sm:h-32" viewBox="0 0 500 160" preserveAspectRatio="none" aria-label="Backtest equity preview">
        <path d={`${path} L500 160 L0 160 Z`} fill="rgba(255,255,255,.1)" />
        <path d={path} fill="none" stroke="rgba(255,255,255,.82)" strokeWidth="2.5" />
      </svg>
    );
  }

  return (
    <svg className="h-28 w-full sm:h-32" viewBox="0 0 500 160" preserveAspectRatio="none" aria-label="Backtest equity preview">
      <path d="M0 132 C44 92 70 120 110 105 C158 86 186 116 226 88 C270 58 304 72 336 44 C380 12 424 48 500 18" fill="none" stroke="rgba(255,255,255,.82)" strokeWidth="2.5" />
      <path d="M0 132 C44 92 70 120 110 105 C158 86 186 116 226 88 C270 58 304 72 336 44 C380 12 424 48 500 18 L500 160 L0 160 Z" fill="rgba(255,255,255,.1)" />
    </svg>
  );
}

export function BacktestPreviewCard({ className = "lg:col-span-12", backtest = null }: { className?: string; backtest?: BacktestRow | null }) {
  const input = backtest?.report_json?.input;
  const filters = backtest
    ? [backtest.report_json?.strategySnapshot.name || backtest.strategies?.name || "Strategy", backtest.symbol || "Symbol", backtest.timeframe || "TF", input?.marketType || "Simulated"]
    : [backtestSummary.strategy, backtestSummary.symbol, backtestSummary.timeframe, backtestSummary.period];
  const stats = backtest
    ? [
        ["Trades", String(backtest.total_trades ?? 0)],
        ["Win Rate", `${Number(backtest.winrate ?? 0).toFixed(1)}%`],
        ["Final Balance", formatCurrency(backtest.final_balance)],
        ["Max DD", `${Number(backtest.max_drawdown ?? 0).toFixed(1)}%`],
      ]
    : backtestSummary.stats;

  return (
    <GlassCard className={`p-4 ${className}`}>
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Backtest Lab</h2>
        <Target className="h-4 w-4 text-zinc-500" />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
        {filters.map((filter) => (
          <button key={filter} className="h-10 rounded-xl border border-white/10 bg-white/[0.055] px-3 text-left text-xs text-zinc-300">
            {filter}
          </button>
        ))}
      </div>
      <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.045] p-3 text-xs leading-5 text-zinc-400">
        {backtest ? "Latest saved simulated backtest. Real market data is not connected yet." : "No backtests yet. Run your first simulated backtest."}
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map(([label, value]) => (
          <div key={label} className="rounded-xl border border-white/10 bg-black/20 p-3">
            <div className="text-[11px] text-zinc-500">{label}</div>
            <div className="mt-1 text-lg font-semibold">{value}</div>
          </div>
        ))}
      </div>
      <div className="mt-4">
        <BacktestCurve points={backtest?.report_json?.equityCurve} />
      </div>
    </GlassCard>
  );
}
