import Link from "next/link";
import { Target } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { BacktestRow } from "@/lib/backtest/types";

function formatCurrency(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "$0.00";
  return Number(value).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function isSandboxBacktest(backtest: BacktestRow | null) {
  if (!backtest) return false;
  return backtest.report_json?.engineType === "simulated" || (backtest as BacktestRow & { engine_type?: string | null }).engine_type === "simulated";
}

function BacktestCurve({ points }: { points?: { balance: number }[] }) {
  if (!points?.length) {
    return (
      <div className="grid h-28 place-items-center rounded-xl border border-white/10 bg-black/20 text-center text-sm text-zinc-500 sm:h-32">
        Historical market data is required for a real equity curve.
      </div>
    );
  }

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

export function BacktestPreviewCard({ className = "lg:col-span-12", backtest = null }: { className?: string; backtest?: BacktestRow | null }) {
  const isSandbox = isSandboxBacktest(backtest);
  const realBacktest = backtest && !isSandbox ? backtest : null;
  const input = realBacktest?.report_json?.input;
  const filters = realBacktest
    ? [realBacktest.report_json?.strategySnapshot.name || realBacktest.strategies?.name || "Strategy", realBacktest.symbol || "Symbol", realBacktest.timeframe || "TF", input?.marketType || "Real Data"]
    : ["Market Data Feed", "Historical candles", "Strategy validation", "Not connected"];
  const stats = realBacktest
    ? [
        ["Trades", String(realBacktest.total_trades ?? 0)],
        ["Win Rate", `${Number(realBacktest.winrate ?? 0).toFixed(1)}%`],
        ["Final Balance", formatCurrency(realBacktest.final_balance)],
        ["Max DD", `${Number(realBacktest.max_drawdown ?? 0).toFixed(1)}%`],
      ]
    : [
        ["Trades", "0"],
        ["Win Rate", "0%"],
        ["Final Balance", "$0.00"],
        ["Max DD", "0%"],
      ];

  return (
    <GlassCard className={`p-4 ${className}`}>
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Backtest Lab</h2>
        <div className="flex items-center gap-2">
          <StatusBadge tone={realBacktest ? "positive" : "neutral"}>{realBacktest ? "Real Data" : "Not Connected"}</StatusBadge>
          <Target className="h-4 w-4 text-zinc-500" />
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
        {filters.map((filter) => (
          <div key={filter} className="h-10 rounded-xl border border-white/10 bg-white/[0.055] px-3 py-2.5 text-left text-xs text-zinc-300">
            {filter}
          </div>
        ))}
      </div>
      <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.045] p-3 text-xs leading-5 text-zinc-400">
        {realBacktest ? "Latest real backtest result." : "Historical market data is required for real backtesting. Sandbox results are not shown as live performance."}
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
        <BacktestCurve points={realBacktest?.report_json?.equityCurve} />
      </div>
      <Link href="/backtest-lab" className="mt-3 grid h-10 place-items-center rounded-xl border border-white/10 bg-white/10 text-sm font-medium text-white transition hover:bg-white/15">
        Open Backtest Lab
      </Link>
    </GlassCard>
  );
}
