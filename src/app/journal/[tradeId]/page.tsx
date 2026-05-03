import Link from "next/link";
import { notFound } from "next/navigation";
import { AIReviewCard } from "@/components/journal/AIReviewCard";
import { AppShell } from "@/components/layout/AppShell";
import { GlassCard } from "@/components/ui/GlassCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { getImpactBadgeVariant } from "@/lib/calendar/filters";
import { getNearbyEconomicEventsForTrade, getNewsRiskLevel, getNewsRiskSummary, type NearbyEconomicEvent } from "@/lib/calendar/news-risk";
import type { EconomicEvent } from "@/lib/calendar/types";
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
    .select("*, trade_journal_entries(*)")
    .eq("id", tradeId)
    .eq("user_id", userData.user.id)
    .single();

  if (error || !data) {
    notFound();
  }

  const trade = data as Trade;
  const journalEntry = firstJournalEntry(trade.trade_journal_entries);
  const { data: reviewData } = await supabase
    .from("ai_trade_reviews")
    .select("*")
    .eq("trade_id", trade.id)
    .eq("user_id", userData.user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const review = (reviewData ?? null) as AITradeReview | null;
  let nearbyEvents: NearbyEconomicEvent[] = [];

  if (trade.opened_at) {
    const openedAt = new Date(trade.opened_at);
    const start = new Date(openedAt);
    const end = new Date(openedAt);
    start.setMinutes(start.getMinutes() - 60);
    end.setMinutes(end.getMinutes() + 60);

    const { data: eventData } = await supabase
      .from("economic_events")
      .select("*")
      .gte("event_time", start.toISOString())
      .lte("event_time", end.toISOString())
      .order("event_time", { ascending: true });

    nearbyEvents = getNearbyEconomicEventsForTrade(trade.opened_at, (eventData ?? []) as EconomicEvent[]);
  }

  return (
    <AppShell title={`${trade.symbol} Trade`} subtitle="Manual journal trade detail.">
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
