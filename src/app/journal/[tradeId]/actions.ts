"use server";

import { revalidatePath } from "next/cache";
import { generateAITradeReview } from "@/lib/ai/ai-client";
import { estimateAIReviewCost } from "@/lib/ai/cost-estimator";
import { generateRulesBasedTradeReview } from "@/lib/ai/rules-based-trade-review";
import { logAIUsage } from "@/lib/ai/usage-logger";
import { validateTradeReviewPayload, type TradeReviewPayload } from "@/lib/ai/review-schema";
import type { TradingAccount } from "@/lib/accounts/types";
import { getNearbyEconomicEventsForTrade, getNewsRiskLevel, getNewsRiskSummary } from "@/lib/calendar/news-risk";
import type { EconomicEvent } from "@/lib/calendar/types";
import type { DisciplineScore } from "@/lib/discipline/types";
import type { TradePsychology } from "@/lib/psychology/types";
import type { RevengeEvent } from "@/lib/revenge/types";
import type { TradeRuleCheckWithRule } from "@/lib/rules/types";
import type { Strategy } from "@/lib/strategies/types";
import { formatSupabaseError } from "@/lib/supabase/errors";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { buildTradeContext } from "@/lib/trading-os/context-builder";
import type { Trade, TradeJournalEntry } from "@/lib/trading/types";
import { incrementAIReviewUsage } from "@/lib/usage/user-usage";

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

function safeAIErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message.slice(0, 240);
  return "Unknown AI request error";
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
    .select("id,user_id,trading_account_id,source,symbol,market_type,direction,entry_price,exit_price,stop_loss,take_profit,position_size,risk_percent,rr,pnl,fees,result,session,strategy_id,opened_at,closed_at,created_at,updated_at,trade_journal_entries(id,trade_id,user_id,reason_for_entry,emotion_before,emotion_after,screenshot_url,notes_before,notes_after,mistake_tags,setup_tags,created_at,updated_at)")
    .eq("id", tradeId)
    .eq("user_id", userData.user.id)
    .single();

  if (tradeError || !tradeData) {
    return { error: tradeError?.message ? formatSupabaseError(tradeError.message) : "Trade not found." };
  }

  const trade = tradeData as Trade;
  const journalEntry = firstJournalEntry(trade.trade_journal_entries);
  const { data: psychologyData } = await supabase
    .from("trade_psychology")
    .select("id,user_id,trade_id,emotion_before,emotion_after,confidence_level,stress_level,fomo_score,discipline_note,created_at,updated_at")
    .eq("trade_id", trade.id)
    .eq("user_id", userData.user.id)
    .maybeSingle();
  const psychology = (psychologyData ?? null) as TradePsychology | null;
  const [{ data: disciplineData }, { data: revengeData }] = await Promise.all([
    supabase
      .from("discipline_scores")
      .select("id,user_id,period_type,period_start,period_end,rule_adherence,risk_control,emotion_balance,revenge_avoidance,time_discipline,total_score,created_at")
      .eq("user_id", userData.user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("revenge_events")
      .select("id,user_id,previous_trade_id,next_trade_id,revenge_score,gap_minutes,size_increase_ratio,triggered_rules,created_at")
      .eq("user_id", userData.user.id)
      .or(`previous_trade_id.eq.${trade.id},next_trade_id.eq.${trade.id}`),
  ]);
  const disciplineScore = (disciplineData ?? null) as DisciplineScore | null;
  const revengeEvents = (revengeData ?? []) as RevengeEvent[];
  const { data: ruleCheckData } = await supabase
    .from("trade_rule_checks")
    .select("id,user_id,trade_id,rule_id,passed,violation_reason,created_at,trading_rules(id,user_id,text,type,auto_condition,active,violation_count,streak_days,created_at,updated_at)")
    .eq("trade_id", trade.id)
    .eq("user_id", userData.user.id)
    .order("created_at", { ascending: true });
  const ruleChecks = (ruleCheckData ?? []) as unknown as TradeRuleCheckWithRule[];
  let nearbyEvents: EconomicEvent[] = [];

  if (trade.opened_at) {
    const openedAt = new Date(trade.opened_at);
    const start = new Date(openedAt);
    const end = new Date(openedAt);
    start.setMinutes(start.getMinutes() - 60);
    end.setMinutes(end.getMinutes() + 60);

    const { data: eventData } = await supabase
      .from("economic_events")
      .select("id,currency,title,impact,event_time,actual,forecast,previous,source,created_at,updated_at")
      .gte("event_time", start.toISOString())
      .lte("event_time", end.toISOString())
      .order("event_time", { ascending: true });

    nearbyEvents = getNearbyEconomicEventsForTrade(trade.opened_at, (eventData ?? []) as EconomicEvent[]);
  }

  const [{ data: accountData }, { data: strategyData }] = await Promise.all([
    trade.trading_account_id
      ? supabase
          .from("trading_accounts")
          .select("id,user_id,provider,account_name,account_type,currency,status,metadata,created_at,updated_at")
          .eq("id", trade.trading_account_id)
          .eq("user_id", userData.user.id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    trade.strategy_id
      ? supabase
          .from("strategies")
          .select("id,user_id,name,description,rules_json,is_active,created_at,updated_at")
          .eq("id", trade.strategy_id)
          .eq("user_id", userData.user.id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);
  const tradingOSContext = buildTradeContext({
    lifecycleStage: "review",
    trade,
    account: (accountData ?? null) as TradingAccount | null,
    strategy: (strategyData ?? null) as Strategy | null,
    psychology,
    ruleChecks,
    economicEvents: nearbyEvents,
    latestDisciplineScore: disciplineScore,
    revengeEvents,
  });

  const fallbackReview = validateTradeReviewPayload(generateRulesBasedTradeReview(trade, journalEntry, nearbyEvents, psychology, disciplineScore, revengeEvents, ruleChecks));

  if (!fallbackReview) {
    return { error: "Unable to generate local review fallback." };
  }

  let finalReview: TradeReviewPayload = fallbackReview;
  let generationSource: "ai" | "rules" = "rules";
  let model: string | null = "local-rules";
  let provider: "openai" | "local" = "local";
  let inputTokens: number | null = null;
  let outputTokens: number | null = null;
  let aiFallbackError: string | null = null;

  if (process.env.OPENAI_API_KEY?.trim()) {
    try {
      const aiReview = await generateAITradeReview({
        trade,
        journalEntry,
        baselineReview: fallbackReview,
        economicEvents: nearbyEvents,
        newsRiskLevel: getNewsRiskLevel(nearbyEvents),
        newsRiskSummary: getNewsRiskSummary(nearbyEvents),
        psychology,
        disciplineScore,
        revengeEvents,
        ruleChecks,
        tradingOSContext,
      });
      finalReview = aiReview.review;
      generationSource = "ai";
      model = aiReview.model;
      provider = aiReview.provider;
      inputTokens = aiReview.usage.input_tokens;
      outputTokens = aiReview.usage.output_tokens;
    } catch (error) {
      aiFallbackError = safeAIErrorMessage(error);
      console.warn("[ai-review] Falling back to local rules engine:", aiFallbackError);
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

  if (aiFallbackError) {
    await logAIUsage({
      user_id: userData.user.id,
      feature: "trade_review",
      provider: "openai",
      model: process.env.OPENAI_MODEL?.trim() || "gpt-5.5-thinking",
      generation_source: "ai",
      status: "fallback",
      error_message: aiFallbackError,
    });
  }

  const estimatedCost = estimateAIReviewCost({
    provider,
    model,
    generation_source: generationSource,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
  });

  await logAIUsage({
    user_id: userData.user.id,
    feature: "trade_review",
    provider,
    model,
    generation_source: generationSource,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    estimated_cost: estimatedCost,
    status: "success",
  });

  await incrementAIReviewUsage(userData.user.id);

  revalidatePath(`/journal/${trade.id}`);
  revalidatePath("/dashboard");
  revalidatePath("/ai-analysis");
  revalidatePath("/system-status");
  revalidatePath("/settings");

  return { success: true };
}
