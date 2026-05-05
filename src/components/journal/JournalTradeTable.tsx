import Link from "next/link";
import { GlassCard } from "@/components/ui/GlassCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { DeleteTradeButton } from "@/components/journal/DeleteTradeButton";
import { formatDateTime, formatNumber } from "@/lib/trading/format";
import { formatMoney } from "@/lib/trading/stats";
import type { Trade } from "@/lib/trading/types";

interface JournalTradeTableProps {
  trades: Trade[];
  emptyText?: string;
}

function resultTone(result: string | null) {
  if (result === "Win") return "positive";
  if (result === "Loss") return "negative";
  if (result === "Breakeven") return "warning";
  return "neutral";
}

export function JournalTradeTable({ trades, emptyText = "No trades found for this period." }: JournalTradeTableProps) {
  if (!trades.length) {
    return (
      <GlassCard className="p-8 text-center">
        <h2 className="text-lg font-semibold">{emptyText}</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-400">Manual trades will appear here with performance stats, execution notes, and trade detail links.</p>
        <Link href="/journal/new" className="mt-6 inline-grid h-10 place-items-center rounded-xl border border-white/10 bg-white/12 px-4 text-sm font-medium">
          Add your first trade
        </Link>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold">Trades</h2>
        <span className="text-xs text-zinc-500">{trades.length} rows</span>
      </div>
      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full min-w-[980px] text-left text-xs">
          <thead className="bg-white/[0.04] text-zinc-400">
            <tr>
              {["Symbol", "Direction", "Result", "PnL", "RR", "Risk %", "Session", "Opened At", "Source", "Actions"].map((head) => (
                <th key={head} className="px-3 py-2 font-medium">{head}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/8">
            {trades.map((trade) => (
              <tr key={trade.id} className="text-zinc-300 transition hover:bg-white/[0.035]">
                <td className="px-3 py-3.5 font-semibold text-white">{trade.symbol}</td>
                <td className={trade.direction === "Long" ? "px-3 py-3 text-emerald-300" : "px-3 py-3 text-rose-300"}>{trade.direction}</td>
                <td className="px-3 py-3"><StatusBadge tone={resultTone(trade.result)}>{trade.result || "N/A"}</StatusBadge></td>
                <td className={`px-3 py-3 font-mono ${(trade.pnl ?? 0) >= 0 ? "text-emerald-300" : "text-rose-300"}`}>{formatMoney(Number(trade.pnl) || 0)}</td>
                <td className="px-3 py-3 font-mono">{formatNumber(trade.rr)}</td>
                <td className="px-3 py-3 font-mono">{formatNumber(trade.risk_percent)}</td>
                <td className="px-3 py-3">{trade.session || "N/A"}</td>
                <td className="px-3 py-3 text-zinc-400">{formatDateTime(trade.opened_at)}</td>
                <td className="px-3 py-3 capitalize">{trade.source || "manual"}</td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-2">
                    <Link href={`/journal/${trade.id}`} className="rounded-lg border border-white/10 bg-white/[0.06] px-2.5 py-1.5 text-white transition hover:bg-white/10">View</Link>
                    <DeleteTradeButton tradeId={trade.id} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </GlassCard>
  );
}
