import Link from "next/link";
import { Brain, Gauge, HeartPulse, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PsychologyActions } from "@/components/psychology/PsychologyActions";
import { GlassCard } from "@/components/ui/GlassCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { calculateDisciplineScore } from "@/lib/discipline/engine";
import { calculateDisciplineScorePreview } from "@/lib/discipline/score";
import type { DisciplinePeriodType, DisciplineScore } from "@/lib/discipline/types";
import { emotionLabels, formatEmotion } from "@/lib/psychology/emotions";
import { calculatePsychologyStats } from "@/lib/psychology/stats";
import type { TradePsychology } from "@/lib/psychology/types";
import type { RevengeEvent } from "@/lib/revenge/types";
import { calculateRuleStats } from "@/lib/rules/stats";
import type { TradeRuleCheckWithRule, TradingRule } from "@/lib/rules/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getPeriodRange } from "@/lib/trading/periods";
import { formatMoney } from "@/lib/trading/stats";
import type { Trade } from "@/lib/trading/types";
import type { User } from "@supabase/supabase-js";

interface PsychologyPageProps {
  searchParams: Promise<{ period?: string }>;
}

const periods: Array<{ label: string; value: DisciplinePeriodType }> = [
  { label: "Week", value: "week" },
  { label: "Month", value: "month" },
  { label: "Quarter", value: "quarter" },
  { label: "Year", value: "year" },
];

function parsePeriod(value: string | undefined): DisciplinePeriodType {
  return value === "week" || value === "quarter" || value === "year" ? value : "month";
}

function percent(value: number) {
  return `${Math.round(value)}%`;
}

function oneDecimal(value: number) {
  return value ? value.toFixed(1) : "0.0";
}

function ScoreCard({ label, value }: { label: string; value: string }) {
  return (
    <GlassCard className="p-4">
      <div className="text-xs text-zinc-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-white">{value}</div>
    </GlassCard>
  );
}

function formatDate(value: string | null) {
  if (!value) return "N/A";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

async function getPsychologyContext(periodType: DisciplinePeriodType) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { trades: [], psychologyRows: [], maxRiskPercent: 1, disciplineScores: [], revengeEvents: [], ruleChecks: [], tradingProfile: null, rules: [], user: null };

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return { trades: [], psychologyRows: [], maxRiskPercent: 1, disciplineScores: [], revengeEvents: [], ruleChecks: [], tradingProfile: null, rules: [], user: null };

  const range = getPeriodRange(periodType);

  const [tradesResult, psychologyResult, profileResult, scoresResult, rulesResult] = await Promise.all([
    supabase.from("trades").select("id,user_id,trading_account_id,source,symbol,market_type,direction,entry_price,exit_price,stop_loss,take_profit,position_size,risk_percent,rr,pnl,fees,result,session,strategy_id,opened_at,closed_at,created_at,updated_at").eq("user_id", userData.user.id).gte("opened_at", range.startIso).lte("opened_at", range.endIso).order("opened_at", { ascending: false }).limit(200),
    supabase.from("trade_psychology").select("id,user_id,trade_id,emotion_before,emotion_after,confidence_level,stress_level,fomo_score,discipline_note,created_at,updated_at").eq("user_id", userData.user.id).order("created_at", { ascending: false }).limit(250),
    supabase.from("trading_profiles").select("max_trade_risk, preferred_sessions").eq("user_id", userData.user.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("discipline_scores").select("id,user_id,period_type,period_start,period_end,rule_adherence,risk_control,emotion_balance,revenge_avoidance,time_discipline,total_score,created_at").eq("user_id", userData.user.id).eq("period_type", periodType).order("created_at", { ascending: false }).limit(8),
    supabase.from("trading_rules").select("id,user_id,text,type,auto_condition,active,violation_count,streak_days,created_at,updated_at").eq("user_id", userData.user.id),
  ]);

  const trades = (tradesResult.data ?? []) as Trade[];
  const tradeIds = trades.map((trade) => trade.id);
  const [revengeResult, ruleChecksResult] = tradeIds.length
    ? await Promise.all([
        supabase.from("revenge_events").select("id,user_id,previous_trade_id,next_trade_id,revenge_score,gap_minutes,size_increase_ratio,triggered_rules,created_at").eq("user_id", userData.user.id),
        supabase.from("trade_rule_checks").select("id,user_id,trade_id,rule_id,passed,violation_reason,created_at,trading_rules(id,user_id,text,type,auto_condition,active,violation_count,streak_days,created_at,updated_at)").eq("user_id", userData.user.id).in("trade_id", tradeIds),
      ])
    : [{ data: [], error: null }, { data: [], error: null }];

  const tradeIdSet = new Set(tradeIds);

  return {
    trades,
    psychologyRows: (psychologyResult.data ?? []) as TradePsychology[],
    maxRiskPercent: Number(profileResult.data?.max_trade_risk) || 1,
    tradingProfile: profileResult.data ?? null,
    disciplineScores: (scoresResult.data ?? []) as DisciplineScore[],
    revengeEvents: ((revengeResult.data ?? []) as RevengeEvent[]).filter((event) => (event.previous_trade_id && tradeIdSet.has(event.previous_trade_id)) || (event.next_trade_id && tradeIdSet.has(event.next_trade_id))),
    ruleChecks: (ruleChecksResult.data ?? []) as unknown as TradeRuleCheckWithRule[],
    rules: (rulesResult.data ?? []) as TradingRule[],
    user: userData.user as User,
  };
}

export default async function PsychologyPage({ searchParams }: PsychologyPageProps) {
  const params = await searchParams;
  const periodType = parsePeriod(params.period);
  const { trades, psychologyRows, maxRiskPercent, disciplineScores, revengeEvents, ruleChecks, tradingProfile, rules, user } = await getPsychologyContext(periodType);
  const psychologyByTradeId = new Map(psychologyRows.map((row) => [row.trade_id, row]));
  const records = trades.map((trade) => ({ trade, psychology: psychologyByTradeId.get(trade.id) ?? null }));
  const stats = calculatePsychologyStats(records);
  const preview = calculateDisciplineScorePreview(trades, psychologyRows, maxRiskPercent);
  const calculated = calculateDisciplineScore({
    trades,
    tradePsychology: psychologyRows,
    tradingProfile,
    tradeRuleChecks: ruleChecks,
    revengeEvents,
    periodStart: getPeriodRange(periodType).startIso,
    periodEnd: getPeriodRange(periodType).endIso,
  });
  const latestScore = disciplineScores[0] ?? null;
  const ruleStats = calculateRuleStats(rules, ruleChecks);
  const displayedDiscipline = latestScore
    ? {
        totalScore: Math.round(Number(latestScore.total_score) || 0),
        riskControl: Math.round(Number(latestScore.risk_control) || 0),
        emotionBalance: Math.round(Number(latestScore.emotion_balance) || 0),
        revengeAvoidance: Math.round(Number(latestScore.revenge_avoidance) || 0),
        ruleAdherence: Math.round(Number(latestScore.rule_adherence) || 0),
        timeDiscipline: Math.round(Number(latestScore.time_discipline) || 0),
        consistency: preview.consistency,
      }
    : {
        totalScore: calculated.total_score,
        riskControl: calculated.risk_control,
        emotionBalance: calculated.emotion_balance,
        revengeAvoidance: calculated.revenge_avoidance,
        ruleAdherence: calculated.rule_adherence,
        timeDiscipline: calculated.time_discipline,
        consistency: preview.consistency,
      };

  return (
    <AppShell title="Psychology" subtitle="Track emotions, discipline, and behavioral patterns behind your trades." user={user}>
      <div className="space-y-4">
        <GlassCard className="p-4 md:p-5">
          <div className="flex flex-wrap items-center gap-2">
            <Brain className="h-5 w-5 text-zinc-300" />
            <h2 className="text-xl font-semibold text-white">Psychology Module</h2>
            <StatusBadge tone="neutral">Foundation</StatusBadge>
            <StatusBadge tone="positive">{periodType}</StatusBadge>
          </div>
          <p className="mt-3 max-w-4xl text-sm leading-6 text-zinc-400">
            This module tracks trading behavior only. It does not provide medical or mental health diagnosis.
          </p>
        </GlassCard>

        <GlassCard className="p-4 md:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-base font-semibold text-white">Discipline Controls</h2>
              <p className="mt-1 text-sm text-zinc-500">Calculate snapshots and detect revenge patterns for the selected period.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {periods.map((period) => (
                <Link
                  key={period.value}
                  href={`/psychology?period=${period.value}`}
                  className={`grid h-10 place-items-center rounded-xl border px-4 text-sm font-medium transition ${periodType === period.value ? "border-white/20 bg-white/15 text-white" : "border-white/10 bg-white/[0.06] text-zinc-400 hover:text-white"}`}
                >
                  {period.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="mt-4">
            <PsychologyActions periodType={periodType} />
          </div>
        </GlassCard>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          <ScoreCard label="Trades With Psychology" value={String(stats.totalTradesWithPsychology)} />
          <ScoreCard label="Best Emotion" value={formatEmotion(stats.bestPerformingEmotion)} />
          <ScoreCard label="Most Damaging" value={formatEmotion(stats.mostDamagingEmotion)} />
          <ScoreCard label="Avg Confidence" value={`${oneDecimal(stats.averageConfidence)}/10`} />
          <ScoreCard label="Avg Stress" value={`${oneDecimal(stats.averageStress)}/10`} />
          <ScoreCard label="Avg FOMO" value={`${oneDecimal(stats.averageFomo)}/10`} />
        </div>

        <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
          <GlassCard className="p-4 md:p-5">
            <div className="flex items-center gap-2">
              <HeartPulse className="h-4 w-4 text-zinc-400" />
              <h2 className="text-base font-semibold text-white">Emotion Distribution</h2>
            </div>
            <div className="mt-4 space-y-3">
              {stats.emotionDistribution.length ? stats.emotionDistribution.map((item) => {
                const width = stats.totalTradesWithPsychology ? (item.count / stats.totalTradesWithPsychology) * 100 : 0;
                return (
                  <div key={item.emotion}>
                    <div className="mb-1 flex justify-between text-xs">
                      <span className="text-zinc-300">{emotionLabels[item.emotion]}</span>
                      <span className="text-zinc-500">{item.count}</span>
                    </div>
                    <div className="h-2 rounded-full bg-white/10">
                      <div className="h-2 rounded-full bg-white/70" style={{ width: `${width}%` }} />
                    </div>
                  </div>
                );
              }) : <div className="rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-zinc-400">No psychology data yet.</div>}
            </div>
          </GlassCard>

          <GlassCard className="p-4 md:p-5">
            <div className="flex items-center gap-2">
              <Gauge className="h-4 w-4 text-zinc-400" />
              <h2 className="text-base font-semibold text-white">PnL by Emotion</h2>
            </div>
            <div className="mt-4 overflow-x-auto rounded-xl border border-white/10">
              <table className="w-full min-w-[520px] text-left text-xs">
                <thead className="bg-white/[0.04] text-zinc-400">
                  <tr>
                    {["Emotion", "Trades", "Avg PnL", "Win Rate"].map((head) => <th key={head} className="px-3 py-2 font-medium">{head}</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {stats.emotionPerformance.length ? stats.emotionPerformance.map((item) => (
                    <tr key={item.emotion}>
                      <td className="px-3 py-3 font-semibold text-white">{emotionLabels[item.emotion]}</td>
                      <td className="px-3 py-3 text-zinc-300">{item.count}</td>
                      <td className={`px-3 py-3 font-mono ${(item.averagePnl >= 0) ? "text-emerald-300" : "text-rose-300"}`}>{formatMoney(item.averagePnl)}</td>
                      <td className="px-3 py-3 text-zinc-300">{percent(item.winRate)}</td>
                    </tr>
                  )) : (
                    <tr><td colSpan={4} className="px-3 py-5 text-zinc-400">No emotion performance data yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <GlassCard className="p-4 md:p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-zinc-400" />
                <h2 className="text-base font-semibold text-white">Discipline Score Preview</h2>
              </div>
              <div className="grid h-16 w-16 place-items-center rounded-full border-[6px] border-white/15 border-t-white bg-black/20 text-lg font-semibold">{displayedDiscipline.totalScore}</div>
            </div>
            <p className="mt-3 text-sm leading-6 text-zinc-400">
              {latestScore ? `Last calculated ${formatDate(latestScore.created_at)}.` : "Preview calculation. Save a snapshot with Recalculate Discipline Score."} {calculated.summary}
            </p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {[
                ["Rule Adherence", displayedDiscipline.ruleAdherence],
                ["Risk Control", displayedDiscipline.riskControl],
                ["Emotion Balance", displayedDiscipline.emotionBalance],
                ["Revenge Avoidance", displayedDiscipline.revengeAvoidance],
                ["Time Discipline", displayedDiscipline.timeDiscipline],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 p-3 text-sm">
                  <span className="text-zinc-400">{label}</span>
                  <span className="font-semibold text-white">{value}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3 text-sm leading-6 text-zinc-400">
              {calculated.recommendations.slice(0, 2).join(" ")}
            </div>
          </GlassCard>

          <GlassCard className="p-4 md:p-5">
            <h2 className="text-base font-semibold text-white">Revenge Events</h2>
            <div className="mt-4 space-y-3">
              {revengeEvents.length ? revengeEvents.slice(0, 6).map((event) => (
                <div key={event.id} className="rounded-xl border border-rose-300/15 bg-rose-300/[0.06] p-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-rose-100">Saved revenge pattern</span>
                    <span className="font-mono text-rose-200">{Math.round(Number(event.revenge_score) * 100)}%</span>
                  </div>
                  <div className="mt-2 grid gap-2 text-xs text-zinc-400 sm:grid-cols-3">
                    <span>Gap: {event.gap_minutes ?? 0} min</span>
                    <span>Size ratio: {event.size_increase_ratio ?? "N/A"}</span>
                    <span>{formatDate(event.created_at)}</span>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-zinc-400">{event.triggered_rules?.join(", ") || "No trigger details."}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {event.previous_trade_id ? <Link href={`/journal/${event.previous_trade_id}`} className="rounded-lg border border-white/10 bg-white/10 px-2.5 py-1 text-xs text-zinc-300">Previous trade</Link> : null}
                    {event.next_trade_id ? <Link href={`/journal/${event.next_trade_id}`} className="rounded-lg border border-white/10 bg-white/10 px-2.5 py-1 text-xs text-zinc-300">Next trade</Link> : null}
                  </div>
                </div>
              )) : <div className="rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-zinc-400">No saved revenge patterns detected in the selected period.</div>}
            </div>
          </GlassCard>
        </div>

        <GlassCard className="p-4 md:p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-base font-semibold text-white">Rule Adherence</h2>
              <p className="mt-1 text-sm text-zinc-500">Checklist results feed the Rule Adherence component of Discipline Score.</p>
            </div>
            <Link href="/rules" className="grid h-10 place-items-center rounded-xl border border-white/10 bg-white/10 px-4 text-sm font-medium text-white">Open Rules</Link>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-4">
            {[
              ["Rule Adherence", `${Math.round(ruleStats.ruleAdherence)}%`],
              ["Passed Checks", ruleStats.passedChecks],
              ["Failed Checks", ruleStats.failedChecks],
              ["Top Violated Rule", ruleStats.topViolatedRule],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl border border-white/10 bg-black/20 p-3">
                <div className="text-xs text-zinc-500">{label}</div>
                <div className="mt-1 truncate text-lg font-semibold text-white">{value}</div>
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard className="p-4 md:p-5">
          <h2 className="text-base font-semibold text-white">Discipline Score History</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {disciplineScores.length ? disciplineScores.map((score) => (
              <div key={score.id} className="rounded-xl border border-white/10 bg-black/20 p-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-zinc-500">{formatDate(score.created_at)}</span>
                  <StatusBadge tone={(score.total_score ?? 0) >= 75 ? "positive" : (score.total_score ?? 0) < 50 ? "negative" : "neutral"}>{Math.round(Number(score.total_score) || 0)}</StatusBadge>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-zinc-400">
                  <span>Rules {Math.round(Number(score.rule_adherence) || 0)}</span>
                  <span>Risk {Math.round(Number(score.risk_control) || 0)}</span>
                  <span>Emotion {Math.round(Number(score.emotion_balance) || 0)}</span>
                  <span>Revenge {Math.round(Number(score.revenge_avoidance) || 0)}</span>
                </div>
              </div>
            )) : <div className="rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-zinc-400">No saved Discipline Score snapshots yet.</div>}
          </div>
        </GlassCard>

        <GlassCard className="p-4 md:p-5">
          <h2 className="text-base font-semibold text-white">Mentor Note</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-400">Weekly AI psychology report will be available in a later stage.</p>
          <Link href="/journal/new" className="mt-4 inline-grid h-10 place-items-center rounded-xl border border-white/10 bg-white/10 px-4 text-sm font-medium text-white">
            Add Trade With Psychology
          </Link>
        </GlassCard>
      </div>
    </AppShell>
  );
}
