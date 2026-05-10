import Link from "next/link";
import { GlassCard } from "@/components/ui/GlassCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatAIModelLabel } from "@/lib/ai/display";
import type { AITradeReview } from "@/lib/trading/types";

interface AITradeReviewCardProps {
  className?: string;
  review?: AITradeReview | null;
}

function score(value: number | null | undefined) {
  return Math.round(Number(value) || 0);
}

function sourceTone(source: string | null | undefined) {
  return source === "ai" ? "positive" : "neutral";
}

function sourceLabel(source: string | null | undefined) {
  return source === "ai" ? "AI" : "Local Rules";
}

export function AITradeReviewCard({ className = "lg:col-span-3 2xl:col-span-3", review }: AITradeReviewCardProps) {
  const trade = review?.trades;
  const modelLabel = formatAIModelLabel(review?.model);

  return (
    <GlassCard className={`p-4 ${className}`}>
      <h2 className="text-base font-semibold">AI Trade Review <span className="text-xs text-zinc-500">(Latest)</span></h2>

      {review ? (
        <>
          <div className="mt-5 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="truncate text-lg font-semibold">{trade?.symbol ?? "Trade"}</span>
                {trade?.direction ? (
                  <StatusBadge tone={trade.direction === "Long" ? "positive" : "negative"}>{trade.direction}</StatusBadge>
                ) : null}
                <StatusBadge tone={sourceTone(review.generation_source)}>{sourceLabel(review.generation_source)}</StatusBadge>
              </div>
              {modelLabel ? <p className="mt-1 text-xs text-zinc-500">{modelLabel}</p> : null}
              <p className="mt-3 line-clamp-3 text-sm leading-6 text-zinc-400">{review.summary}</p>
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-zinc-500">
                <span>Risk {score(review.risk_score)}</span>
                <span>ICT {score(review.ict_score)}</span>
                <span>Liquidity {score(review.liquidity_score)}</span>
                <span>Psychology {score(review.psychology_score)}</span>
              </div>
            </div>
            <div className="grid h-20 w-20 shrink-0 place-items-center rounded-full border-[8px] border-white/15 border-t-white bg-black/20 2xl:h-24 2xl:w-24">
              <div className="text-center">
                <div className="text-2xl font-semibold">{score(review.total_score)}</div>
                <div className="text-xs text-zinc-500">/100</div>
              </div>
            </div>
          </div>
          <Link
            href={`/journal/${review.trade_id}`}
            className="mt-5 grid h-10 w-full place-items-center rounded-xl border border-white/10 bg-white/10 text-sm font-medium transition hover:bg-white/15"
          >
            View Full Review
          </Link>
        </>
      ) : (
        <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
          <p className="text-sm leading-6 text-zinc-400">No AI reviews yet. Generate a review from a trade detail page.</p>
          <Link
            href="/journal"
            className="mt-4 grid h-10 w-full place-items-center rounded-xl border border-white/10 bg-white/10 text-sm font-medium transition hover:bg-white/15"
          >
            Open Journal
          </Link>
        </div>
      )}
    </GlassCard>
  );
}
