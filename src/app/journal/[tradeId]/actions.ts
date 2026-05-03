"use server";

import { revalidatePath } from "next/cache";
import { generateAITradeReview } from "@/lib/ai/ai-client";
import { generateRulesBasedTradeReview } from "@/lib/ai/rules-based-trade-review";
import { validateTradeReviewPayload, type TradeReviewPayload } from "@/lib/ai/review-schema";
import { getNearbyEconomicEventsForTrade, getNewsRiskLevel, getNewsRiskSummary } from "@/lib/calendar/news-risk";
import type { EconomicEvent } from "@/lib/calendar/types";
import { formatSupabaseError } from "@/lib/supabase/errors";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Trade, TradeJournalEntry } from "@/lib/trading/types";

export interface ReviewActionState {
  error?: string;
  success?: boolean;
}

function firstJournalEntry(value: Trade["trade_journal_entries"]): TradeJournalEntry | null {
  if (!value) return null;
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

function metadataColumnMissing(message: string) {
  return message.includes("generation_source") || message.includes("model") || message.includes("schema cache");
}

export async function generateTradeReviewAction(_state: ReviewActionState, formData: FormData): Promise<ReviewActionState> {
  const tradeId = formData.get("trade_id");

  if (typeof tradeId !== "string" || !tradeId.trim()) {
    return { error: "Missing trade id." };
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return { error: "Supabase is not configured." };
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return { error: "You must be signed in to generate a review." };
  }

  const { data: tradeData, error: tradeError } = await supabase
    .from("trades")
    .select("*, trade_journal_entries(*)")
    .eq("id", tradeId)
    .eq("user_id", userData.user.id)
    .single();

  if (tradeError || !tradeData) {
    return { error: tradeError?.message ? formatSupabaseError(tradeError.message) : "Trade not found." };
  }

  const trade = tradeData as Trade;
  const journalEntry = firstJournalEntry(trade.trade_journal_entries);
  let nearbyEvents: EconomicEvent[] = [];

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

  const fallbackReview = validateTradeReviewPayload(generateRulesBasedTradeReview(trade, journalEntry, nearbyEvents));

  if (!fallbackReview) {
    return { error: "Unable to generate local review fallback." };
  }

  let finalReview: TradeReviewPayload = fallbackReview;
  let generationSource: "ai" | "rules" = "rules";
  let model: string | null = "local-rules";

  if (process.env.OPENAI_API_KEY?.trim()) {
    try {
      const aiReview = await generateAITradeReview({
        trade,
        journalEntry,
        baselineReview: fallbackReview,
        economicEvents: nearbyEvents,
        newsRiskLevel: getNewsRiskLevel(nearbyEvents),
        newsRiskSummary: getNewsRiskSummary(nearbyEvents),
      });
      finalReview = aiReview.review;
      generationSource = "ai";
      model = aiReview.model;
    } catch (error) {
      console.warn("[ai-review] Falling back to local rules engine:", error instanceof Error ? error.message : "Unknown AI error");
    }
  }

  const reviewPayload = {
    ...finalReview,
    trade_id: trade.id,
    user_id: userData.user.id,
    generation_source: generationSource,
    model,
  };
  const legacyReviewPayload = {
    ...finalReview,
    trade_id: trade.id,
    user_id: userData.user.id,
  };

  const { data: existingReview, error: existingError } = await supabase
    .from("ai_trade_reviews")
    .select("id")
    .eq("trade_id", trade.id)
    .eq("user_id", userData.user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingError) {
    return { error: formatSupabaseError(existingError.message) };
  }

  let { error: reviewError } = existingReview?.id
    ? await supabase.from("ai_trade_reviews").update(reviewPayload).eq("id", existingReview.id).eq("user_id", userData.user.id)
    : await supabase.from("ai_trade_reviews").insert(reviewPayload);

  if (reviewError && metadataColumnMissing(reviewError.message)) {
    const retry = existingReview?.id
      ? await supabase.from("ai_trade_reviews").update(legacyReviewPayload).eq("id", existingReview.id).eq("user_id", userData.user.id)
      : await supabase.from("ai_trade_reviews").insert(legacyReviewPayload);
    reviewError = retry.error;
  }

  if (reviewError) {
    return { error: formatSupabaseError(reviewError.message) };
  }

  revalidatePath(`/journal/${trade.id}`);
  revalidatePath("/dashboard");
  revalidatePath("/ai-analysis");

  return { success: true };
}
