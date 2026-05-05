import Link from "next/link";
import { ListChecks } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { calculateRuleStats } from "@/lib/rules/stats";
import type { TradeRuleCheckWithRule, TradingRule } from "@/lib/rules/types";

export function RulesPreviewCard({ rules, checks }: { rules: TradingRule[]; checks: TradeRuleCheckWithRule[] }) {
  const stats = calculateRuleStats(rules, checks);

  return (
    <GlassCard className="p-4 lg:col-span-6 2xl:col-span-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <ListChecks className="h-4 w-4 text-zinc-500" />
            <h2 className="text-base font-semibold text-white">Trading Rules</h2>
          </div>
          <p className="mt-1 text-xs text-zinc-500">Pre-trade checklist discipline</p>
        </div>
        <div className="text-right text-sm font-semibold text-white">{Math.round(stats.ruleAdherence)}%</div>
      </div>
      <div className="mt-4 space-y-2 text-sm">
        <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 p-2.5">
          <span className="text-zinc-400">Active rules</span>
          <span className="text-white">{stats.totalActiveRules}</span>
        </div>
        <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/20 p-2.5">
          <span className="text-zinc-400">Top violation</span>
          <span className="truncate text-white">{stats.topViolatedRule}</span>
        </div>
      </div>
      <Link href="/rules" className="mt-4 grid h-10 place-items-center rounded-xl border border-white/10 bg-white/10 text-sm font-medium text-white">
        Open Rules
      </Link>
    </GlassCard>
  );
}
