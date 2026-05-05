"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { calculateDisciplineScore } from "@/lib/discipline/engine";
import type { DisciplinePeriodType } from "@/lib/discipline/types";
import type { TradePsychology } from "@/lib/psychology/types";
import { detectRevengeEvents } from "@/lib/revenge/engine";
import type { RevengeEvent } from "@/lib/revenge/types";
import { formatSupabaseError } from "@/lib/supabase/errors";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getPeriodRange } from "@/lib/trading/periods";
import type { Trade } from "@/lib/trading/types";

type PsychologyActionResult = { error?: string };

interface TradingProfileRow {
  max_trade_risk: number | null;
  preferred_sessions: string[] | null;
}

interface TradeRuleCheckRow {
  trade_id: string | null;
  passed: boolean | null;
}

function parsePeriod(formData: FormData): DisciplinePeriodType {
  const value = formData.get("period_type");
  return value === "week" || value === "quarter" || value === "year" ? value : "month";
}

async function getContext(periodType: DisciplinePeriodType) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: "Supabase is not configured." };

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return { error: "You must be signed in." };

  const range = getPeriodRange(periodType);

  const [tradesResult, psychologyResult, profileResult] = await Promise.all([
    supabase
      .from("trades")
      .select("id,user_id,trading_account_id,source,symbol,market_type,direction,entry_price,exit_price,stop_loss,take_profit,position_size,risk_percent,rr,pnl,fees,result,session,strategy_id,opened_at,closed_at,created_at,updated_at")
      .eq("user_id", userData.user.id)
      .gte("opened_at", range.startIso)
      .lte("opened_at", range.endIso)
      .order("opened_at", { ascending: true }),
    supabase.from("trade_psychology").select("id,user_id,trade_id,emotion_before,emotion_after,confidence_level,stress_level,fomo_score,discipline_note,created_at,updated_at").eq("user_id", userData.user.id),
    supabase
      .from("trading_profiles")
      .select("max_trade_risk, preferred_sessions")
      .eq("user_id", userData.user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (tradesResult.error) return { error: formatSupabaseError(tradesResult.error.message) };
  if (psychologyResult.error) return { error: formatSupabaseError(psychologyResult.error.message) };

  const trades = (tradesResult.data ?? []) as Trade[];
  const tradeIds = trades.map((trade) => trade.id);

  const [ruleChecksResult, revengeResult] = tradeIds.length
    ? await Promise.all([
        supabase.from("trade_rule_checks").select("trade_id, passed").eq("user_id", userData.user.id).in("trade_id", tradeIds),
        supabase.from("revenge_events").select("id,user_id,previous_trade_id,next_trade_id,revenge_score,gap_minutes,size_increase_ratio,triggered_rules,created_at").eq("user_id", userData.user.id),
      ])
    : [{ data: [], error: null }, { data: [], error: null }];
  const tradeIdSet = new Set(tradeIds);

  return {
    supabase,
    userId: userData.user.id,
    periodType,
    range,
    trades,
    psychologyRows: (psychologyResult.data ?? []) as TradePsychology[],
    tradingProfile: (profileResult.data ?? null) as TradingProfileRow | null,
    tradeRuleChecks: ruleChecksResult.error ? [] : ((ruleChecksResult.data ?? []) as TradeRuleCheckRow[]),
    revengeEvents: revengeResult.error ? [] : ((revengeResult.data ?? []) as RevengeEvent[]).filter((event) => (event.previous_trade_id && tradeIdSet.has(event.previous_trade_id)) || (event.next_trade_id && tradeIdSet.has(event.next_trade_id))),
  };
}

export async function recalculateDisciplineScoreAction(_state: PsychologyActionResult, formData: FormData): Promise<PsychologyActionResult> {
  const periodType = parsePeriod(formData);
  const context = await getContext(periodType);

  if ("error" in context) return { error: context.error };

  const result = calculateDisciplineScore({
    trades: context.trades,
    tradePsychology: context.psychologyRows,
    tradingProfile: context.tradingProfile,
    tradeRuleChecks: context.tradeRuleChecks,
    revengeEvents: context.revengeEvents,
    periodStart: context.range.startIso,
    periodEnd: context.range.endIso,
  });

  const { error } = await context.supabase.from("discipline_scores").insert({
    user_id: context.userId,
    period_type: periodType,
    period_start: context.range.startIso,
    period_end: context.range.endIso,
    rule_adherence: result.rule_adherence,
    risk_control: result.risk_control,
    emotion_balance: result.emotion_balance,
    revenge_avoidance: result.revenge_avoidance,
    time_discipline: result.time_discipline,
    total_score: result.total_score,
  });

  if (error) return { error: formatSupabaseError(error.message) };

  revalidatePath("/psychology");
  revalidatePath("/dashboard");
  redirect(`/psychology?period=${periodType}&score=1`);
}

export async function detectRevengeEventsAction(_state: PsychologyActionResult, formData: FormData): Promise<PsychologyActionResult> {
  const periodType = parsePeriod(formData);
  const context = await getContext(periodType);

  if ("error" in context) return { error: context.error };

  const detected = detectRevengeEvents(context.trades, context.psychologyRows, context.tradeRuleChecks);
  let inserted = 0;

  for (const event of detected) {
    const { data: existing, error: existingError } = await context.supabase
      .from("revenge_events")
      .select("id")
      .eq("user_id", context.userId)
      .eq("previous_trade_id", event.previous_trade_id)
      .eq("next_trade_id", event.next_trade_id)
      .maybeSingle();

    if (existingError) return { error: formatSupabaseError(existingError.message) };
    if (existing?.id) continue;

    const { error } = await context.supabase.from("revenge_events").insert({
      user_id: context.userId,
      previous_trade_id: event.previous_trade_id,
      next_trade_id: event.next_trade_id,
      revenge_score: event.revenge_score,
      gap_minutes: event.gap_minutes,
      size_increase_ratio: event.size_increase_ratio,
      triggered_rules: event.triggered_rules,
    });

    if (error) return { error: formatSupabaseError(error.message) };
    inserted += 1;
  }

  revalidatePath("/psychology");
  revalidatePath("/dashboard");
  redirect(`/psychology?period=${periodType}&revenge=${inserted}`);
}
