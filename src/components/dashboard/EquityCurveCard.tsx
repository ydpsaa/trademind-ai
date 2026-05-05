import Link from "next/link";
import { GlassCard } from "@/components/ui/GlassCard";
import type { Trade } from "@/lib/trading/types";

function buildEquityPoints(trades: Trade[]) {
  const closedTrades = trades
    .filter((trade) => trade.opened_at && trade.pnl !== null && trade.pnl !== undefined)
    .sort((a, b) => new Date(a.opened_at ?? "").getTime() - new Date(b.opened_at ?? "").getTime());

  let cumulativePnl = 0;
  return closedTrades.map((trade) => {
    cumulativePnl += Number(trade.pnl ?? 0);
    return {
      date: trade.opened_at ?? "",
      value: cumulativePnl,
    };
  });
}

function formatCurrency(value: number) {
  return value.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export function EquityCurveCard({ trades = [] }: { trades?: Trade[] }) {
  const points = buildEquityPoints(trades);
  const values = points.map((point) => point.value);
  const latest = values.at(-1) ?? 0;
  const min = Math.min(0, ...values);
  const max = Math.max(0, ...values);
  const range = Math.max(1, max - min);
  const path = points
    .map((point, index) => {
      const x = (index / Math.max(1, points.length - 1)) * 760;
      const y = 220 - ((point.value - min) / range) * 180;
      return `${index === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <GlassCard className="p-4 lg:col-span-8 2xl:col-span-9">
      <div className="mb-3 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-base font-semibold text-white">Equity Curve</h2>
            <span className="inline-flex h-8 items-center rounded-lg border border-white/10 bg-white/8 px-3 text-xs text-zinc-300">Real journal PnL</span>
          </div>
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <div className="text-2xl font-semibold tracking-tight sm:text-3xl">{formatCurrency(latest)}</div>
            <div className={`pb-1 text-sm ${latest >= 0 ? "text-emerald-300" : "text-rose-300"}`}>Cumulative PnL</div>
          </div>
        </div>
      </div>

      {points.length ? (
        <div className="relative">
          <div className="absolute left-0 top-5 hidden h-[190px] flex-col justify-between text-[11px] text-zinc-500 md:flex">
            {[max, (max + min) / 2, min].map((label, index) => <span key={`${label}-${index}`}>{formatCurrency(label)}</span>)}
          </div>
          <div className="pl-0 md:pl-20">
            <svg className="h-[210px] w-full sm:h-[240px]" viewBox="0 0 760 250" preserveAspectRatio="none" aria-label="Real equity curve">
              {[54, 96, 138, 180].map((y) => (
                <line key={y} x1="0" x2="760" y1={y} y2={y} stroke="rgba(255,255,255,.09)" strokeDasharray="4 6" />
              ))}
              <path d={`${path} L760 250 L0 250 Z`} fill="rgba(255,255,255,.1)" />
              <path d={path} fill="none" stroke="rgba(255,255,255,.92)" strokeLinecap="round" strokeWidth="3" />
            </svg>
          </div>
        </div>
      ) : (
        <div className="mt-4 rounded-2xl border border-white/10 bg-black/25 p-8 text-center">
          <h3 className="text-base font-semibold text-white">No equity data yet.</h3>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-500">Add trades or connect an import source to build your equity curve from real PnL.</p>
          <Link href="/journal/new" className="mt-4 inline-flex h-10 items-center justify-center rounded-xl border border-white/10 bg-white/10 px-4 text-sm font-medium text-white transition hover:bg-white/15">
            Add Trade
          </Link>
        </div>
      )}
    </GlassCard>
  );
}
