import Link from "next/link";
import { Brain } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { calculateDisciplineScorePreview } from "@/lib/discipline/score";
import { formatEmotion } from "@/lib/psychology/emotions";
import { calculatePsychologyStats } from "@/lib/psychology/stats";
import type { TradePsychology } from "@/lib/psychology/types";
import type { DisciplineScore } from "@/lib/discipline/types";
import type { RevengeEvent } from "@/lib/revenge/types";
import type { Trade } from "@/lib/trading/types";

export function PsychologyPreviewCard({ trades, psychologyRows, latestScore = null, latestRevengeEvent = null }: { trades: Trade[]; psychologyRows: TradePsychology[]; latestScore?: DisciplineScore | null; latestRevengeEvent?: RevengeEvent | null }) {
  const psychologyByTradeId = new Map(psychologyRows.map((row) => [row.trade_id, row]));
  const records = trades.map((trade) => ({ trade, psychology: psychologyByTradeId.get(trade.id) ?? null }));
  const stats = calculatePsychologyStats(records);
  const discipline = calculateDisciplineScorePreview(trades, psychologyRows);
  const score = latestScore?.total_score != null ? Math.round(Number(latestScore.total_score) || 0) : discipline.totalScore;

  return (
    <GlassCard className="p-4 lg:col-span-6 2xl:col-span-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-zinc-500" />
            <h2 className="text-base font-semibold text-white">Psychology</h2>
          </div>
          <p className="mt-1 text-xs text-zinc-500">Discipline and emotion preview</p>
        </div>
        <StatusBadge tone="neutral">Preview</StatusBadge>
      </div>
      <div className="mt-4 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-4">
        <div className="grid h-20 w-20 place-items-center rounded-full border-[8px] border-white/15 border-t-white bg-black/20">
          <div className="text-center">
            <div className="text-2xl font-semibold text-white">{score}</div>
            <div className="text-[10px] text-zinc-500">score</div>
          </div>
        </div>
        <div className="min-w-0 space-y-2 text-sm">
          <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/20 p-2.5">
            <span className="text-zinc-400">Top emotion</span>
            <span className="truncate text-white">{formatEmotion(stats.bestPerformingEmotion)}</span>
          </div>
          <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/20 p-2.5">
            <span className="text-zinc-400">Avg stress</span>
            <span className="text-white">{stats.averageStress ? stats.averageStress.toFixed(1) : "0.0"}/10</span>
          </div>
          {latestRevengeEvent ? (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-rose-300/15 bg-rose-300/[0.06] p-2.5">
              <span className="text-rose-200">Revenge risk</span>
              <span className="text-rose-100">{Math.round(Number(latestRevengeEvent.revenge_score) * 100)}%</span>
            </div>
          ) : null}
        </div>
      </div>
      {!latestScore ? <p className="mt-3 text-xs text-zinc-500">No saved score yet. Open Psychology to calculate one.</p> : null}
      <Link href="/psychology" className="mt-4 grid h-10 place-items-center rounded-xl border border-white/10 bg-white/10 text-sm font-medium text-white">
        Open Psychology
      </Link>
    </GlassCard>
  );
}
