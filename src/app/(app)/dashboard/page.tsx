import Link from "next/link";
import { AccountSelector } from "@/components/accounts/AccountSelector";
import { AppShell } from "@/components/layout/AppShell";
import { GlassCard } from "@/components/ui/GlassCard";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { EquityCurveCard } from "@/components/dashboard/EquityCurveCard";
import { MarketsCard } from "@/components/dashboard/MarketsCard";
import { RecentTradesCard } from "@/components/dashboard/RecentTradesCard";
import { AITradeReviewCard } from "@/components/dashboard/AITradeReviewCard";
import { PerformanceSummaryCard } from "@/components/dashboard/PerformanceSummaryCard";
import { BacktestPreviewCard } from "@/components/dashboard/BacktestPreviewCard";
import { SignalsPreviewCard } from "@/components/dashboard/SignalsPreviewCard";
import { PsychologyPreviewCard } from "@/components/dashboard/PsychologyPreviewCard";
import { RulesPreviewCard } from "@/components/dashboard/RulesPreviewCard";
import { TradingOSSummaryCard } from "@/components/dashboard/TradingOSSummaryCard";
import { AIInsightPanel } from "@/components/dashboard/AIInsightPanel";
import { TodaysEventsCard } from "@/components/dashboard/TodaysEventsCard";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { MANUAL_ACCOUNT_VALUE, normalizeSelectedAccount } from "@/lib/accounts/helpers";
import type { TradingAccount } from "@/lib/accounts/types";
import { getCalendarRange } from "@/lib/calendar/filters";
import { calculateDashboardStats } from "@/lib/trading/dashboard-stats";
import type { BacktestRow } from "@/lib/backtest/types";
import type { EconomicEvent } from "@/lib/calendar/types";
import type { TradePsychology } from "@/lib/psychology/types";
import type { DisciplineScore } from "@/lib/discipline/types";
import type { RevengeEvent } from "@/lib/revenge/types";
import type { TradeRuleCheckWithRule, TradingRule } from "@/lib/rules/types";
import type { AITradeReview, Trade } from "@/lib/trading/types";
import type { Signal } from "@/lib/signals/types";
import type { SupabaseClient } from "@supabase/supabase-js";

interface DashboardPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function DashboardRightRail({ todayEvents }: { todayEvents: EconomicEvent[] }) {
  return (
    <aside className="grid min-w-0 gap-4 lg:col-start-2 min-[1400px]:col-start-auto min-[1400px]:content-start">
      <AIInsightPanel />
      <GlassCard className="p-4">
        <h2 className="text-base font-semibold">Key Insight</h2>
        <p className="mt-3 text-sm leading-6 text-zinc-300">
          Real insights appear after you add trades, record checklist decisions, and generate AI reviews.
        </p>
        <Link href="/journal/new" className="mt-5 inline-flex h-10 items-center rounded-xl border border-white/10 bg-white/10 px-5 text-sm font-medium text-white transition hover:bg-white/15">Add Trade</Link>
      </GlassCard>
      <TodaysEventsCard events={todayEvents} />
    </aside>
  );
}

async function getTradingAccounts(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from("trading_accounts")
    .select("id,user_id,provider,account_name,account_type,currency,status,metadata,created_at,updated_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) return [];
  return (data ?? []) as TradingAccount[];
}

async function getDashboardTrades(supabase: SupabaseClient, userId: string, selectedAccount: string) {
  let query = supabase
    .from("trades")
    .select("id,user_id,trading_account_id,source,symbol,market_type,direction,entry_price,exit_price,stop_loss,take_profit,position_size,risk_percent,rr,pnl,fees,result,session,strategy_id,opened_at,closed_at,created_at,updated_at")
    .eq("user_id", userId)
    .order("opened_at", { ascending: false })
    .limit(120);

  if (selectedAccount === MANUAL_ACCOUNT_VALUE) {
    query = query.eq("source", "manual");
  } else if (selectedAccount !== "all") {
    query = query.eq("trading_account_id", selectedAccount);
  }

  const { data, error } = await query;

  if (error) return [];
  return (data ?? []) as Trade[];
}

async function getLatestAIReview(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from("ai_trade_reviews")
    .select("*, trades(*)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return null;
  return (data ?? null) as AITradeReview | null;
}

async function getTodayEconomicEvents(supabase: SupabaseClient) {
  const range = getCalendarRange("today");
  const { data, error } = await supabase
    .from("economic_events")
    .select("id,currency,title,impact,event_time,actual,forecast,previous,source,created_at,updated_at")
    .gte("event_time", range.startIso)
    .lte("event_time", range.endIso)
    .order("event_time", { ascending: true });

  if (error) return [];
  return (data ?? []) as EconomicEvent[];
}

async function getLatestBacktest(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from("backtests")
    .select("id,user_id,strategy_id,symbol,timeframe,period_start,period_end,initial_balance,final_balance,total_trades,winrate,profit_factor,max_drawdown,avg_rr,report_json,created_at,strategies(name)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return null;
  return (data ?? null) as BacktestRow | null;
}

async function getLatestSignals(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from("signals")
    .select("id,user_id,strategy_id,symbol,market_type,direction,entry_zone,stop_loss,take_profit,confidence,reasoning,status,news_risk,setup_type,timeframe,engine_type,scanner_snapshot,created_at,updated_at,strategies(name)")
    .eq("user_id", userId)
    .in("status", ["ready", "forming"])
    .neq("engine_type", "simulated")
    .order("created_at", { ascending: false })
    .limit(3);

  if (error) return [];
  return (data ?? []) as unknown as Signal[];
}

async function getPsychologyRows(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from("trade_psychology")
    .select("id,user_id,trade_id,emotion_before,emotion_after,confidence_level,stress_level,fomo_score,discipline_note,created_at,updated_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(120);

  if (error) return [];
  return (data ?? []) as TradePsychology[];
}

async function getLatestDisciplineScore(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from("discipline_scores")
    .select("id,user_id,period_type,period_start,period_end,rule_adherence,risk_control,emotion_balance,revenge_avoidance,time_discipline,total_score,created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return null;
  return (data ?? null) as DisciplineScore | null;
}

async function getLatestRevengeEvent(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from("revenge_events")
    .select("id,user_id,previous_trade_id,next_trade_id,revenge_score,gap_minutes,size_increase_ratio,triggered_rules,created_at")
    .eq("user_id", userId)
    .order("revenge_score", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return null;
  return (data ?? null) as RevengeEvent | null;
}

async function getRulesPreviewContext(supabase: SupabaseClient, userId: string) {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [rulesResult, checksResult] = await Promise.all([
    supabase.from("trading_rules").select("id,user_id,text,type,auto_condition,active,violation_count,streak_days,created_at,updated_at").eq("user_id", userId),
    supabase.from("trade_rule_checks").select("id,user_id,trade_id,rule_id,passed,violation_reason,created_at,trading_rules(id,user_id,text,type,auto_condition,active,violation_count,streak_days,created_at,updated_at)").eq("user_id", userId).gte("created_at", monthStart.toISOString()).limit(100),
  ]);

  return {
    rules: (rulesResult.data ?? []) as TradingRule[],
    checks: (checksResult.data ?? []) as unknown as TradeRuleCheckWithRule[],
  };
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const params = await searchParams;
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return (
      <AppShell>
        <GlassCard className="p-4 text-sm text-rose-200">Data service is not configured.</GlassCard>
      </AppShell>
    );
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return (
      <AppShell>
        <GlassCard className="p-4 text-sm text-rose-200">You must be signed in.</GlassCard>
      </AppShell>
    );
  }

  const userId = userData.user.id;
  const accounts = await getTradingAccounts(supabase, userId);
  const selectedAccount = normalizeSelectedAccount(params.account, accounts);
  const [trades, latestReview, todayEvents, latestBacktest, latestSignals, psychologyRows, latestDisciplineScore, latestRevengeEvent, rulesPreview] = await Promise.all([
    getDashboardTrades(supabase, userId, selectedAccount),
    getLatestAIReview(supabase, userId),
    getTodayEconomicEvents(supabase),
    getLatestBacktest(supabase, userId),
    getLatestSignals(supabase, userId),
    getPsychologyRows(supabase, userId),
    getLatestDisciplineScore(supabase, userId),
    getLatestRevengeEvent(supabase, userId),
    getRulesPreviewContext(supabase, userId),
  ]);
  const dashboardStats = calculateDashboardStats(trades);

  return (
    <AppShell
      rightRail={<DashboardRightRail todayEvents={todayEvents} />}
      user={userData.user}
    >
      <div className="min-w-0 space-y-4">
        <div className="flex justify-end">
          <AccountSelector accounts={accounts} selectedAccount={selectedAccount} basePath="/dashboard" />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {dashboardStats.metricCards.map((metric) => <MetricCard key={metric.label} {...metric} />)}
        </div>
        {!trades.length ? (
          <GlassCard className="p-4 text-sm leading-6 text-zinc-400">
            No trading data yet. Add a manual trade or connect an import source.
          </GlassCard>
        ) : null}
        <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-12">
          <TradingOSSummaryCard
            trades={trades}
            todayEvents={todayEvents}
            psychologyRows={psychologyRows}
            latestDisciplineScore={latestDisciplineScore}
            latestRevengeEvent={latestRevengeEvent}
            ruleChecks={rulesPreview.checks}
          />
          <EquityCurveCard trades={trades} />
          <MarketsCard />
          <RecentTradesCard trades={dashboardStats.recentTrades} />
          <AITradeReviewCard review={latestReview} />
          <SignalsPreviewCard signals={latestSignals} />
          <PsychologyPreviewCard trades={trades} psychologyRows={psychologyRows} latestScore={latestDisciplineScore} latestRevengeEvent={latestRevengeEvent} />
          <RulesPreviewCard rules={rulesPreview.rules} checks={rulesPreview.checks} />
          <PerformanceSummaryCard trades={trades} />
          <BacktestPreviewCard backtest={latestBacktest} />
        </div>
      </div>
    </AppShell>
  );
}
