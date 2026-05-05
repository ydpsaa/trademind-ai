import Link from "next/link";
import { Brain, Sparkles } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { GlassCard } from "@/components/ui/GlassCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/trading/format";
import type { AITradeReview } from "@/lib/trading/types";
import type { User } from "@supabase/supabase-js";

async function getAIReviews() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { reviews: [], user: null };

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return { reviews: [], user: null };

  const { data, error } = await supabase
    .from("ai_trade_reviews")
    .select("id,trade_id,user_id,total_score,structure_score,liquidity_score,ict_score,risk_score,news_score,psychology_score,summary,strengths,weaknesses,recommendations,generation_source,model,created_at,trades(id,user_id,trading_account_id,source,symbol,market_type,direction,entry_price,exit_price,stop_loss,take_profit,position_size,risk_percent,rr,pnl,fees,result,session,strategy_id,opened_at,closed_at,created_at,updated_at)")
    .eq("user_id", userData.user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) return { reviews: [], user: userData.user as User };
  return { reviews: (data ?? []) as unknown as AITradeReview[], user: userData.user as User };
}

function score(value: number | null) {
  return Math.round(Number(value) || 0);
}

function sourceLabel(source: string | null | undefined) {
  return source === "ai" ? "AI" : "Local Rules";
}

export default async function AiAnalysisPage() {
  const { reviews, user } = await getAIReviews();

  return (
    <AppShell title="AI Trade Analysis" subtitle="AI trading coach reviews generated from your journal data." user={user}>
      <div className="space-y-4">
        <GlassCard className="p-4 md:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-xl border border-white/10 bg-white/[0.06]">
                <Brain className="h-5 w-5 text-zinc-300" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">AI Review Library</h2>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-zinc-400">
                  Latest AI reviews with safe local rules fallback when the AI service is not configured.
                </p>
              </div>
            </div>
            <StatusBadge tone="neutral">AI Review</StatusBadge>
          </div>
        </GlassCard>

        {reviews.length ? (
          <div className="grid gap-4 xl:grid-cols-2">
            {reviews.map((review) => {
              const trade = review.trades;

              return (
                <GlassCard key={review.id} className="p-4 md:p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-lg font-semibold">{trade?.symbol ?? "Trade Review"}</h3>
                        {trade?.direction ? (
                          <StatusBadge tone={trade.direction === "Long" ? "positive" : "negative"}>{trade.direction}</StatusBadge>
                        ) : null}
                        {trade?.result ? (
                          <StatusBadge tone={trade.result === "Win" ? "positive" : trade.result === "Loss" ? "negative" : "neutral"}>
                            {trade.result}
                          </StatusBadge>
                        ) : null}
                        <StatusBadge tone={review.generation_source === "ai" ? "positive" : "neutral"}>{sourceLabel(review.generation_source)}</StatusBadge>
                      </div>
                      <p className="mt-2 text-xs text-zinc-500">
                        {formatDateTime(review.created_at)}
                        {review.model ? ` · ${review.model}` : ""}
                      </p>
                    </div>
                    <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full border-[7px] border-white/15 border-t-white bg-black/20">
                      <div className="text-center">
                        <div className="text-xl font-semibold">{score(review.total_score)}</div>
                        <div className="text-[10px] text-zinc-500">/100</div>
                      </div>
                    </div>
                  </div>

                  <p className="mt-4 text-sm leading-6 text-zinc-300">{review.summary}</p>

                  <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-zinc-500 sm:grid-cols-3">
                    <span>Structure {score(review.structure_score)}</span>
                    <span>Liquidity {score(review.liquidity_score)}</span>
                    <span>ICT {score(review.ict_score)}</span>
                    <span>Risk {score(review.risk_score)}</span>
                    <span>News {score(review.news_score)}</span>
                    <span>Psychology {score(review.psychology_score)}</span>
                  </div>

                  <Link
                    href={`/journal/${review.trade_id}`}
                    className="mt-5 inline-grid h-10 place-items-center rounded-xl border border-white/10 bg-white/10 px-4 text-sm font-medium transition hover:bg-white/15"
                  >
                    Open Trade Detail
                  </Link>
                </GlassCard>
              );
            })}
          </div>
        ) : (
          <GlassCard className="p-8 text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl border border-white/10 bg-white/[0.06]">
              <Sparkles className="h-5 w-5 text-zinc-300" />
            </div>
            <h2 className="mt-4 text-lg font-semibold">No AI reviews yet</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-400">
              Open a journal trade detail page and generate a rules-based review to start building your review library.
            </p>
            <Link
              href="/journal"
              className="mt-5 inline-grid h-10 place-items-center rounded-xl border border-white/10 bg-white/10 px-4 text-sm font-medium transition hover:bg-white/15"
            >
              Open Journal
            </Link>
          </GlassCard>
        )}
      </div>
    </AppShell>
  );
}
