import { PanelLeft } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { recentTrades } from "@/lib/mock-data";
import { formatDateTime, formatNumber } from "@/lib/trading/format";
import { formatMoney } from "@/lib/trading/stats";
import type { Trade } from "@/lib/trading/types";

interface RecentTradesCardProps {
  className?: string;
  trades?: Trade[];
  demoLabel?: boolean;
}

export function RecentTradesCard({ className = "lg:col-span-6 2xl:col-span-5", trades, demoLabel = false }: RecentTradesCardProps) {
  const hasRealTrades = Boolean(trades?.length);

  return (
    <GlassCard className={`p-4 ${className}`}>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold">Recent Trades</h2>
          {demoLabel ? <span className="rounded-md bg-white/10 px-2 py-1 text-[10px] text-zinc-400">Demo</span> : null}
        </div>
        <PanelLeft className="h-4 w-4 text-zinc-500" />
      </div>
      {hasRealTrades ? (
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full min-w-[520px] text-left text-xs">
            <thead className="bg-white/[0.04] text-zinc-400">
              <tr>
                {["Symbol", "Direction", "Result", "PnL", "RR", "Opened"].map((head) => (
                  <th key={head} className="px-2.5 py-2 font-medium">{head}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/8">
              {trades?.map((trade) => (
                <tr key={trade.id} className="text-zinc-300">
                  <td className="px-2.5 py-2.5 font-semibold text-white">{trade.symbol}</td>
                  <td className={`px-2.5 py-2.5 ${trade.direction === "Long" ? "text-emerald-300" : "text-rose-300"}`}>{trade.direction}</td>
                  <td className={trade.result === "Win" ? "px-2.5 py-2.5 text-emerald-300" : trade.result === "Loss" ? "px-2.5 py-2.5 text-rose-300" : "px-2.5 py-2.5 text-zinc-400"}>{trade.result || "N/A"}</td>
                  <td className={`px-2.5 py-2.5 font-mono ${(trade.pnl ?? 0) >= 0 ? "text-emerald-300" : "text-rose-300"}`}>{formatMoney(Number(trade.pnl) || 0)}</td>
                  <td className="px-2.5 py-2.5 font-mono">{formatNumber(trade.rr)}</td>
                  <td className="px-2.5 py-2.5 text-zinc-400">{formatDateTime(trade.opened_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-xl border border-white/10 bg-black/20 p-5 text-sm text-zinc-400">
          No real journal trades yet. Add a manual trade to populate this dashboard preview.
        </div>
      )}
      <button className="mt-3 h-10 w-full rounded-xl border border-white/10 bg-white/10 text-sm font-medium">Go to Journal</button>
    </GlassCard>
  );
}

export function DemoRecentTradesCard({ className = "lg:col-span-6 2xl:col-span-5" }: { className?: string }) {
  return (
    <GlassCard className={`p-4 ${className}`}>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold">Recent Trades</h2>
        <PanelLeft className="h-4 w-4 text-zinc-500" />
      </div>
      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full min-w-[520px] text-left text-xs">
          <thead className="bg-white/[0.04] text-zinc-400">
            <tr>
              {["Symbol", "Direction", "Result", "PnL", "RR", "Date"].map((head) => (
                <th key={head} className="px-2.5 py-2 font-medium">{head}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/8">
            {recentTrades.map((trade) => (
              <tr key={`${trade.symbol}-${trade.date}`} className="text-zinc-300">
                <td className="px-2.5 py-2.5 font-semibold text-white">{trade.symbol}</td>
                <td className={`px-2.5 py-2.5 ${trade.direction === "Long" ? "text-emerald-300" : "text-rose-300"}`}>{trade.direction}</td>
                <td className={trade.result === "Win" ? "px-2.5 py-2.5 text-emerald-300" : "px-2.5 py-2.5 text-rose-300"}>{trade.result}</td>
                <td className={`px-2.5 py-2.5 font-mono ${trade.pnl.startsWith("+") ? "text-emerald-300" : "text-rose-300"}`}>{trade.pnl}</td>
                <td className="px-2.5 py-2.5 font-mono">{trade.rr}</td>
                <td className="px-2.5 py-2.5 text-zinc-400">{trade.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </GlassCard>
  );
}
