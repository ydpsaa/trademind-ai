import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { EconomicEvent } from "@/lib/calendar/types";
import type { DisciplineScore } from "@/lib/discipline/types";
import type { TradePsychology } from "@/lib/psychology/types";
import type { RevengeEvent } from "@/lib/revenge/types";
import type { TradeRuleCheckWithRule } from "@/lib/rules/types";
import { buildTradeContext } from "@/lib/trading-os/context-builder";
import { calculateTradeReadiness } from "@/lib/trading-os/readiness";
import type { Trade } from "@/lib/trading/types";

function readinessTone(status: ReturnType<typeof calculateTradeReadiness>["status"]) {
  if (status === "allowed") return "positive";
  if (status === "blocked") return "negative";
  if (status === "caution") return "warning";
  return "neutral";
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/20 p-2.5 text-sm">
      <span className="text-zinc-400">{label}</span>
      <span className="truncate text-right font-medium text-white">{value}</span>
    </div>
  );
}

export function TradingOSSummaryCard({
  trades,
  todayEvents,
  psychologyRows,
  latestDisciplineScore,
  latestRevengeEvent,
  ruleChecks,
}: {
  trades: Trade[];
  todayEvents: EconomicEvent[];
  psychologyRows: TradePsychology[];
  latestDisciplineScore: DisciplineScore | null;
  latestRevengeEvent: RevengeEvent | null;
  ruleChecks: TradeRuleCheckWithRule[];
}) {
  const latestTrade = trades[0] ?? null;
  const latestPsychology = latestTrade ? psychologyRows.find((row) => row.trade_id === latestTrade.id) ?? null : null;
  const latestRuleChecks = latestTrade ? ruleChecks.filter((check) => check.trade_id === latestTrade.id) : [];
  const context = buildTradeContext({
    lifecycleStage: latestTrade ? "review" : "before_trade",
    trade: latestTrade,
    psychology: latestPsychology,
    ruleChecks: latestRuleChecks,
    economicEvents: todayEvents,
    latestDisciplineScore,
    revengeEvents: latestRevengeEvent ? [latestRevengeEvent] : [],
  });
  const readiness = calculateTradeReadiness(context);
  const ruleValue = context.rules.adherence === null ? "No checklist data" : `${context.rules.adherence}% adherence`;
  const accountValue = context.account.status === "manual" ? "Manual Journal" : context.account.account_name;

  return (
    <GlassCard className="p-4 lg:col-span-12 2xl:col-span-8">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-zinc-500" />
            <h2 className="text-base font-semibold text-white">Trading OS Summary</h2>
          </div>
          <p className="mt-1 text-xs text-zinc-500">Readiness based only on your journal, rules, psychology, and calendar data.</p>
        </div>
        <StatusBadge tone={readinessTone(readiness.status)}>
          {readiness.status === "not_enough_data" ? "Not enough data" : `${readiness.score}/100 ${readiness.status}`}
        </StatusBadge>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <Row label="Today’s Risk" value={context.news.risk_level === "Unknown" ? "No verified news context" : `${context.news.risk_level} news risk`} />
        <Row label="Psychology Risk" value={context.psychology.risk_level === "unknown" ? "No psychology data" : `${context.psychology.risk_level} risk`} />
        <Row label="Rule Discipline" value={ruleValue} />
        <Row label="Account Data Status" value={accountValue} />
        <Row label="Main Risk" value={readiness.main_risks[0] ?? "No major journal risk"} />
        <Row label="Market Data" value="Not connected" />
      </div>

      <div className="mt-4 flex flex-col gap-3 border-t border-white/10 pt-4 md:flex-row md:items-center md:justify-between">
        <p className="text-sm leading-6 text-zinc-400">{readiness.recommendations[0]}</p>
        <Link href={latestTrade ? `/journal/${latestTrade.id}` : "/journal/new"} className="grid h-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/10 px-4 text-sm font-medium text-white">
          {latestTrade ? "Review Trade Context" : "Add Trade"}
        </Link>
      </div>
    </GlassCard>
  );
}
