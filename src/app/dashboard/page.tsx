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
import { AIInsightPanel } from "@/components/dashboard/AIInsightPanel";
import { TodaysEventsCard } from "@/components/dashboard/TodaysEventsCard";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCalendarRange } from "@/lib/calendar/filters";
import { calculateDashboardStats } from "@/lib/trading/dashboard-stats";
import type { BacktestRow } from "@/lib/backtest/types";
import type { EconomicEvent } from "@/lib/calendar/types";
import type { AITradeReview, Trade } from "@/lib/trading/types";
import type { Signal } from "@/lib/signals/types";

function DashboardRightRail({ todayEvents }: { todayEvents: EconomicEvent[] }) {
  return (
    <aside className="grid min-w-0 gap-4 lg:col-start-2 min-[1400px]:col-start-auto min-[1400px]:content-start">
      <AIInsightPanel />
      <GlassCard className="p-4">
        <h2 className="text-base font-semibold">Key Insight</h2>
        <p className="mt-3 text-sm leading-6 text-zinc-300">
          You are performing well in London session trades. Your win rate is highest when you wait for BOS confirmation.
        </p>
        <button className="mt-5 h-10 rounded-xl border border-white/10 bg-white/10 px-5 text-sm font-medium">View Analysis</button>
      </GlassCard>
      <TodaysEventsCard events={todayEvents} />
    </aside>
  );
}

async function getDashboardTrades() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return [];

  const { data, error } = await supabase
    .from("trades")
    .select("*")
    .eq("user_id", userData.user.id)
    .order("opened_at", { ascending: false });

  if (error) return [];
  return (data ?? []) as Trade[];
}

async function getLatestAIReview() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return null;

  const { data, error } = await supabase
    .from("ai_trade_reviews")
    .select("*, trades(*)")
    .eq("user_id", userData.user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return null;
  return (data ?? null) as AITradeReview | null;
}

async function getTodayEconomicEvents() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return [];

  const range = getCalendarRange("today");
  const { data, error } = await supabase
    .from("economic_events")
    .select("*")
    .gte("event_time", range.startIso)
    .lte("event_time", range.endIso)
    .order("event_time", { ascending: true });

  if (error) return [];
  return (data ?? []) as EconomicEvent[];
}

async function getLatestBacktest() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return null;

  const { data, error } = await supabase
    .from("backtests")
    .select("*, strategies(name)")
    .eq("user_id", userData.user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return null;
  return (data ?? null) as BacktestRow | null;
}

async function getLatestSignals() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return [];

  const { data, error } = await supabase
    .from("signals")
    .select("*, strategies(name)")
    .eq("user_id", userData.user.id)
    .in("status", ["ready", "forming"])
    .order("created_at", { ascending: false })
    .limit(3);

  if (error) return [];
  return (data ?? []) as Signal[];
}

export default async function DashboardPage() {
  const [trades, latestReview, todayEvents, latestBacktest, latestSignals] = await Promise.all([getDashboardTrades(), getLatestAIReview(), getTodayEconomicEvents(), getLatestBacktest(), getLatestSignals()]);
  const dashboardStats = calculateDashboardStats(trades);

  return (
    <AppShell rightRail={<DashboardRightRail todayEvents={todayEvents} />}>
      <div className="min-w-0 space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {dashboardStats.metricCards.map((metric) => <MetricCard key={metric.label} {...metric} />)}
        </div>
        <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-12">
          <EquityCurveCard />
          <MarketsCard />
          <RecentTradesCard trades={dashboardStats.recentTrades} />
          <AITradeReviewCard review={latestReview} />
          <SignalsPreviewCard signals={latestSignals} />
          <PerformanceSummaryCard />
          <BacktestPreviewCard backtest={latestBacktest} />
        </div>
      </div>
    </AppShell>
  );
}
