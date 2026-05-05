import Link from "next/link";
import { notFound } from "next/navigation";
import { AIReviewCard } from "@/components/journal/AIReviewCard";
import { AppShell } from "@/components/layout/AppShell";
import { GlassCard } from "@/components/ui/GlassCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { getImpactBadgeVariant } from "@/lib/calendar/filters";
import { getNearbyEconomicEventsForTrade, getNewsRiskLevel, getNewsRiskSummary, type NearbyEconomicEvent } from "@/lib/calendar/news-risk";
import type { EconomicEvent } from "@/lib/calendar/types";
import { formatEmotion } from "@/lib/psychology/emotions";
import type { TradePsychology } from "@/lib/psychology/types";
import type { TradeRuleCheckWithRule } from "@/lib/rules/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatDateTime, formatNumber } from "@/lib/trading/format";
import { formatMoney } from "@/lib/trading/stats";
import type { AITradeReview, Trade, TradeJournalEntry } from "@/lib/trading/types";

interface TradeDetailPageProps {
  params: Promise<{ tradeId: string }>;
}

function firstJournalEntry(value: Trade["trade_journal_entries"]): TradeJournalEntry | null {
  if (!value) return null;
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-3">
      <div className="text-xs text-zinc-500">{label}</div>
      <div className="mt-1 break-words text-sm font-medium text-white">{value}</div>
    </div>
  );
}

function formatEventTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

export default async function TradeDetailPage({ params }: TradeDetailPageProps) {
  const { tradeId } = await params;
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    notFound();
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    notFound();
  }

  const { data, error } = await supabase
    .from("trades")
    .select("id,user_id,trading_account_id,source,symbol,market_type,direction,entry_price,exit_price,stop_loss,take_profit,position_size,risk_percent,rr,pnl,fees,result,session,strategy_id,opened_at,closed_at,created_at,updated_at,trade_journal_entries(id,trade_id,user_id,reason_for_entry,emotion_before,emotion_after,screenshot_url,notes_before,notes_after,mistake_tags,setup_tags,created_at,updated_at),trade_psychology(id,user_id,trade_id,emotion_before,emotion_after,confidence_level,stress_level,fomo_score,discipline_note,created_at,updated_at)")
    .eq("id", tradeId)
    .eq("user_id", userData.user.id)
    .single();

  if (error || !data) {
    notFound();
  }

  const trade = data as Trade;
  const journalEntry = firstJournalEntry(trade.trade_journal_entries);
  const psychology = Array.isArray(trade.trade_psychology) ? trade.trade_psychology[0] ?? null : (trade.trade_psychology as TradePsychology | null | undefined) ?? null;
  let eventQuery = null;
  if (trade.opened_at) {
    const openedAt = new Date(trade.opened_at);
    const start = new Date(openedAt);
    const end = new Date(openedAt);
    start.setMinutes(start.getMinutes() - 60);
    end.setMinutes(end.getMinutes() + 60);

    eventQuery = supabase
      .from("economic_events")
      .select("id,currency,title,impact,event_time,actual,forecast,previous,source,created_at,updated_at")
      .gte("event_time", start.toISOString())
      .lte("event_time", end.toISOString())
      .order("event_time", { ascending: true });
  }

  const [reviewResult, ruleCheckResult, eventResult] = await Promise.all([
    supabase
      .from("ai_trade_reviews")
      .select("id,trade_id,user_id,total_score,structure_score,liquidity_score,ict_score,risk_score,news_score,psychology_score,summary,strengths,weaknesses,recommendations,generation_source,model,created_at")
      .eq("trade_id", trade.id)
      .eq("user_id", userData.user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("trade_rule_checks")
      .select("id,user_id,trade_id,rule_id,passed,violation_reason,created_at,trading_rules(id,user_id,text,type,auto_condition,active,violation_count,streak_days,created_at,updated_at)")
      .eq("trade_id", trade.id)
      .eq("user_id", userData.user.id)
      .order("created_at", { ascending: true }),
    eventQuery ?? Promise.resolve({ data: [], error: null }),
  ]);

  const review = (reviewResult.data ?? null) as AITradeReview | null;
  const ruleChecks = (ruleCheckResult.data ?? []) as unknown as TradeRuleCheckWithRule[];
  const passedRuleCount = ruleChecks.filter((check) => check.passed === true).length;
  const ruleAdherence = ruleChecks.length ? Math.round((passedRuleCount / ruleChecks.length) * 100) : 0;
  const nearbyEvents: NearbyEconomicEvent[] = trade.opened_at ? getNearbyEconomicEventsForTrade(trade.opened_at, (eventResult.data ?? []) as EconomicEvent[]) : [];

  return (
    <AppShell title={`${trade.symbol} Trade`} subtitle="Manual journal trade detail." user={userData.user}>
      <div className="space-y-4">
        <GlassCard className="p-4 md:p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <Link href="/journal" className="mb-4 inline-grid h-10 place-items-center rounded-xl border border-white/10 bg-white/[0.06] px-4 text-sm font-medium text-zinc-300">
                Back to Journal
              </Link>
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-semibold">{trade.symbol}</h2>
                <StatusBadge tone={trade.direction === "Long" ? "positive" : "negative"}>{trade.direction}</StatusBadge>
              </div>
              <p className="mt-2 text-sm text-zinc-400">{formatDateTime(trade.opened_at)}</p>
            </div>
            <StatusBadge tone={trade.result === "Win" ? "positive" : trade.result === "Loss" ? "negative" : "neutral"}>{trade.result || "N/A"}</StatusBadge>
          </div>
        </GlassCard>

        <GlassCard className="p-4 md:p-6">
          <h2 className="text-base font-semibold">Trade Summary</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <DetailRow label="PnL" value={formatMoney(Number(trade.pnl) || 0)} />
            <DetailRow label="Entry" value={formatNumber(trade.entry_price)} />
            <DetailRow label="Exit" value={formatNumber(trade.exit_price)} />
            <DetailRow label="Opened At" value={formatDateTime(trade.opened_at)} />
          </div>
        </GlassCard>

        <GlassCard className="p-4 md:p-6">
          <h2 className="text-base font-semibold">Risk & Execution</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <DetailRow label="Stop Loss" value={formatNumber(trade.stop_loss)} />
            <DetailRow label="Take Profit" value={formatNumber(trade.take_profit)} />
            <DetailRow label="Risk %" value={formatNumber(trade.risk_percent)} />
            <DetailRow label="RR" value={formatNumber(trade.rr)} />
            <DetailRow label="Session" value={trade.session || "N/A"} />
            <DetailRow label="Source" value={trade.source || "manual"} />
            <DetailRow label="Market Type" value={trade.market_type || "N/A"} />
            <DetailRow label="Position Size" value={formatNumber(trade.position_size)} />
          </div>
        </GlassCard>

        <GlassCard className="p-4 md:p-6">
          <h2 className="text-base font-semibold">Journal Notes</h2>
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <DetailRow label="Reason For Entry" value={journalEntry?.reason_for_entry || "N/A"} />
            <DetailRow label="Notes Before" value={journalEntry?.notes_before || "N/A"} />
            <DetailRow label="Notes After" value={journalEntry?.notes_after || "N/A"} />
          </div>
        </GlassCard>

        <GlassCard className="p-4 md:p-6">
          <h2 className="text-base font-semibold">Tags</h2>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <DetailRow label="Setup Tags" value={journalEntry?.setup_tags?.join(", ") || "N/A"} />
            <DetailRow label="Mistake Tags" value={journalEntry?.mistake_tags?.join(", ") || "N/A"} />
          </div>
        </GlassCard>

        <GlassCard className="p-4 md:p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-base font-semibold">Psychology</h2>
              <p className="mt-1 text-sm text-zinc-500">Behavioral context recorded for this trade.</p>
            </div>
            <Link href={`/journal/${trade.id}/psychology`} className="grid h-10 place-items-center rounded-xl border border-white/10 bg-white/[0.06] px-4 text-sm font-medium text-zinc-300">
              {psychology ? "Edit Psychology" : "Add Psychology"}
            </Link>
          </div>
          {psychology ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <DetailRow label="Emotion Before" value={formatEmotion(psychology.emotion_before)} />
              <DetailRow label="Emotion After" value={formatEmotion(psychology.emotion_after)} />
              <DetailRow label="Confidence" value={psychology.confidence_level ? `${psychology.confidence_level}/10` : "N/A"} />
              <DetailRow label="Stress" value={psychology.stress_level ? `${psychology.stress_level}/10` : "N/A"} />
              <DetailRow label="FOMO" value={psychology.fomo_score ? `${psychology.fomo_score}/10` : "N/A"} />
              <div className="rounded-xl border border-white/10 bg-black/20 p-3 sm:col-span-2 xl:col-span-3">
                <div className="text-xs text-zinc-500">Discipline Note</div>
                <div className="mt-1 break-words text-sm font-medium text-white">{psychology.discipline_note || "N/A"}</div>
              </div>
            </div>
          ) : (
            <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-zinc-400">No psychology data recorded for this trade.</div>
          )}
        </GlassCard>

        <GlassCard className="p-4 md:p-6">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-base font-semibold">Rule Checks</h2>
              <p className="mt-1 text-sm text-zinc-500">Pre-trade checklist adherence for this trade.</p>
            </div>
            {ruleChecks.length ? <StatusBadge tone={ruleAdherence >= 80 ? "positive" : ruleAdherence < 60 ? "negative" : "warning"}>{ruleAdherence}% adherence</StatusBadge> : null}
          </div>
          <div className="mt-4">
            {ruleChecks.length ? (
              <div className="divide-y divide-white/10 rounded-2xl border border-white/10">
                {ruleChecks.map((check) => (
                  <div key={check.id} className="grid gap-3 p-4 text-sm md:grid-cols-[auto_minmax(0,1fr)_minmax(160px,0.7fr)] md:items-center">
                    <StatusBadge tone={check.passed ? "positive" : "negative"}>{check.passed ? "Passed" : "Failed"}</StatusBadge>
                    <span className="font-medium text-white">{check.trading_rules?.text ?? "Rule"}</span>
                    <span className="text-zinc-400">{check.violation_reason || "No violation noted."}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-zinc-400">No rule checks recorded for this trade.</div>
            )}
          </div>
        </GlassCard>

        <GlassCard className="p-4 md:p-6">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-base font-semibold">News Context</h2>
              <p className="mt-1 text-sm text-zinc-500">{getNewsRiskSummary(nearbyEvents)}</p>
            </div>
            <StatusBadge tone={nearbyEvents.some((event) => event.impact === "High") ? "negative" : nearbyEvents.length ? "warning" : "neutral"}>
              {getNewsRiskLevel(nearbyEvents)} risk
            </StatusBadge>
          </div>
          <div className="mt-4">
            {nearbyEvents.length ? (
              <div className="divide-y divide-white/10 rounded-2xl border border-white/10">
                {nearbyEvents.map((event) => (
                  <div key={event.id} className="grid gap-3 p-4 text-sm md:grid-cols-[64px_54px_86px_minmax(0,1fr)_120px] md:items-center">
                    <span className="font-mono text-white">{formatEventTime(event.event_time)}</span>
                    <span className="font-semibold text-zinc-300">{event.currency}</span>
                    <StatusBadge tone={getImpactBadgeVariant(event.impact)}>{event.impact}</StatusBadge>
                    <div>
                      <div className="text-zinc-300">{event.title}</div>
                      {event.impact === "High" ? <div className="mt-1 text-xs text-rose-300">High-impact news window. Execution risk may be elevated.</div> : null}
                    </div>
                    <span className="text-xs text-zinc-500">{event.distanceMinutes} min from open</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-zinc-400">No economic events inside the risk window.</div>
            )}
          </div>
        </GlassCard>

        <AIReviewCard review={review} tradeId={trade.id} />
      </div>
    </AppShell>
  );
}
