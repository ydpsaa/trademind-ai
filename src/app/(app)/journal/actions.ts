"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatSupabaseError } from "@/lib/supabase/errors";
import { getNearbyEconomicEventsForTrade } from "@/lib/calendar/news-risk";
import type { EconomicEvent } from "@/lib/calendar/types";
import { isTradeEmotion } from "@/lib/psychology/types";
import { evaluateAutoCheck } from "@/lib/rules/auto-checks";
import type { TradeRuleCheckInput, TradingRule } from "@/lib/rules/types";
import { parseTagInput } from "@/lib/trading/format";
import type { Trade } from "@/lib/trading/types";

export interface TradeActionState {
  error?: string;
  success?: boolean;
}

function optionalString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function requiredString(formData: FormData, key: string, label: string) {
  const value = optionalString(formData, key);
  if (!value) {
    throw new Error(`${label} is required.`);
  }
  return value;
}

function optionalNumber(formData: FormData, key: string, label: string) {
  const value = optionalString(formData, key);
  if (value === null) {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${label} must be a valid number.`);
  }

  return parsed;
}

function optionalLevel(formData: FormData, key: string, label: string) {
  const value = optionalNumber(formData, key, label);
  if (value === null) return null;
  if (value < 1 || value > 10) {
    throw new Error(`${label} must be between 1 and 10.`);
  }
  return value;
}

export async function createManualTradeAction(_state: TradeActionState, formData: FormData): Promise<TradeActionState> {
  try {
    const supabase = await createSupabaseServerClient();
    if (!supabase) {
      return { error: "Supabase is not configured." };
    }

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      return { error: "You must be signed in to add a trade." };
    }

    const symbol = requiredString(formData, "symbol", "Symbol").toUpperCase();
    const direction = requiredString(formData, "direction", "Direction");
    const openedAt = requiredString(formData, "opened_at", "Opened at");
    const entryPrice = optionalNumber(formData, "entry_price", "Entry price");

    if (entryPrice === null) {
      throw new Error("Entry price is required.");
    }

    const emotionBefore = optionalString(formData, "emotion_before");
    if (emotionBefore && !isTradeEmotion(emotionBefore)) {
      throw new Error("Emotion before must be a supported emotion.");
    }

    const confidenceLevel = optionalLevel(formData, "confidence_level", "Confidence level");
    const stressLevel = optionalLevel(formData, "stress_level", "Stress level");
    const fomoScore = optionalLevel(formData, "fomo_score", "FOMO score");
    const disciplineNote = optionalString(formData, "discipline_note");
    const activeRulesResult = await supabase
      .from("trading_rules")
      .select("id,user_id,text,type,auto_condition,active,violation_count,streak_days,created_at,updated_at")
      .eq("user_id", userData.user.id)
      .eq("active", true)
      .order("created_at", { ascending: true });

    if (activeRulesResult.error) {
      return { error: formatSupabaseError(activeRulesResult.error.message) };
    }

    const activeRules = (activeRulesResult.data ?? []) as TradingRule[];
    const openedAtIso = new Date(openedAt).toISOString();

    const priorTradesResult = await supabase
      .from("trades")
      .select("id,user_id,trading_account_id,source,symbol,market_type,direction,entry_price,exit_price,stop_loss,take_profit,position_size,risk_percent,rr,pnl,fees,result,session,strategy_id,opened_at,closed_at,created_at,updated_at")
      .eq("user_id", userData.user.id)
      .lte("opened_at", openedAtIso)
      .order("opened_at", { ascending: false })
      .limit(25);

    const eventStart = new Date(openedAtIso);
    const eventEnd = new Date(openedAtIso);
    eventStart.setMinutes(eventStart.getMinutes() - 60);
    eventEnd.setMinutes(eventEnd.getMinutes() + 60);
    const eventsResult = await supabase
      .from("economic_events")
      .select("id,currency,title,impact,event_time,actual,forecast,previous,source,created_at,updated_at")
      .gte("event_time", eventStart.toISOString())
      .lte("event_time", eventEnd.toISOString());

    const tradePayload = {
      user_id: userData.user.id,
      source: "manual",
      symbol,
      direction,
      opened_at: openedAtIso,
      entry_price: entryPrice,
      exit_price: optionalNumber(formData, "exit_price", "Exit price"),
      stop_loss: optionalNumber(formData, "stop_loss", "Stop loss"),
      take_profit: optionalNumber(formData, "take_profit", "Take profit"),
      position_size: optionalNumber(formData, "position_size", "Position size"),
      risk_percent: optionalNumber(formData, "risk_percent", "Risk percent"),
      rr: optionalNumber(formData, "rr", "RR"),
      pnl: optionalNumber(formData, "pnl", "PnL"),
      result: optionalString(formData, "result") || "Open",
      session: optionalString(formData, "session"),
      market_type: optionalString(formData, "market_type"),
    };

    const { data: trade, error: tradeError } = await supabase
      .from("trades")
      .insert(tradePayload)
      .select("id")
      .single();

    if (tradeError || !trade) {
      return { error: tradeError?.message ? formatSupabaseError(tradeError.message) : "Unable to create trade." };
    }

    const journalPayload = {
      trade_id: trade.id,
      user_id: userData.user.id,
      reason_for_entry: optionalString(formData, "reason_for_entry"),
      notes_before: optionalString(formData, "notes_before"),
      notes_after: optionalString(formData, "notes_after"),
      setup_tags: parseTagInput(formData.get("setup_tags")),
      mistake_tags: parseTagInput(formData.get("mistake_tags")),
    };

    const { error: journalError } = await supabase.from("trade_journal_entries").insert(journalPayload);

    if (journalError) {
      return { error: formatSupabaseError(journalError.message) };
    }

    const psychologyPayload = {
      trade_id: trade.id,
      user_id: userData.user.id,
      emotion_before: emotionBefore,
      confidence_level: confidenceLevel,
      stress_level: stressLevel,
      fomo_score: fomoScore,
      discipline_note: disciplineNote,
    };

    const hasPsychologyData = Object.entries(psychologyPayload).some(([key, value]) => key !== "trade_id" && key !== "user_id" && value !== null);

    if (hasPsychologyData) {
      const { error: psychologyError } = await supabase.from("trade_psychology").insert(psychologyPayload);

      if (psychologyError) {
        return { error: formatSupabaseError(psychologyError.message) };
      }
    }

    if (activeRules.length) {
      const psychologyContext = {
        emotion_before: emotionBefore,
        confidence_level: confidenceLevel,
        stress_level: stressLevel,
        fomo_score: fomoScore,
        discipline_note: disciplineNote,
      };
      const nearbyEconomicEvents = getNearbyEconomicEventsForTrade(openedAtIso, (eventsResult.data ?? []) as EconomicEvent[]);
      const tradeForChecks = { id: trade.id, ...tradePayload };
      const priorTrades = (priorTradesResult.data ?? []) as Trade[];
      const checks: TradeRuleCheckInput[] = activeRules.map((rule) => {
        if (rule.type === "auto_check") {
          return evaluateAutoCheck(rule, {
            trade: tradeForChecks,
            psychology: psychologyContext,
            priorTrades,
            nearbyEconomicEvents,
          });
        }

        const passed = formData.get(`rule_${rule.id}`) === "passed";
        return {
          trade_id: trade.id,
          rule_id: rule.id,
          passed,
          violation_reason: passed ? null : optionalString(formData, `rule_reason_${rule.id}`) || "Rule was not checked before entry.",
        };
      });

      const { error: checkError } = await supabase.from("trade_rule_checks").insert(checks.map((check) => ({ ...check, user_id: userData.user.id })));
      if (checkError) {
        return { error: formatSupabaseError(checkError.message) };
      }

      const failedRuleIds = checks.filter((check) => check.passed === false).map((check) => check.rule_id);
      await Promise.all(activeRules.map((rule) => {
        const failed = failedRuleIds.includes(rule.id);
        return supabase
          .from("trading_rules")
          .update({
            violation_count: (Number(rule.violation_count) || 0) + (failed ? 1 : 0),
            streak_days: failed ? 0 : (Number(rule.streak_days) || 0) + 1,
            updated_at: new Date().toISOString(),
          })
          .eq("id", rule.id)
          .eq("user_id", userData.user.id);
      }));
    }
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to create trade." };
  }

  revalidatePath("/journal");
  redirect("/journal?created=1");
}

export async function deleteTradeAction(_state: TradeActionState, formData: FormData): Promise<TradeActionState> {
  const tradeId = optionalString(formData, "trade_id");

  if (!tradeId) {
    return { error: "Missing trade id." };
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return { error: "Supabase is not configured." };
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return { error: "You must be signed in to delete a trade." };
  }

  const { error } = await supabase
    .from("trades")
    .delete()
    .eq("id", tradeId)
    .eq("user_id", userData.user.id);

  if (error) {
    return { error: formatSupabaseError(error.message) };
  }

  revalidatePath("/journal");
  return { success: true };
}
