"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { calculatePropReadiness } from "@/lib/prop-readiness/engine";
import type { PropProfileFormState, PropReadinessProfile } from "@/lib/prop-readiness/types";
import type { DisciplineScore } from "@/lib/discipline/types";
import type { RevengeEvent } from "@/lib/revenge/types";
import { formatSupabaseError } from "@/lib/supabase/errors";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Trade } from "@/lib/trading/types";

function stringValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function positiveNumber(formData: FormData, key: string, label: string, maximum?: number) {
  const value = Number(stringValue(formData, key));
  if (!Number.isFinite(value) || value <= 0 || (maximum !== undefined && value > maximum)) {
    throw new Error(`${label} must be greater than 0${maximum ? ` and no more than ${maximum}` : ""}.`);
  }
  return value;
}

function nonNegativeInteger(formData: FormData, key: string, label: string) {
  const value = Number(stringValue(formData, key));
  if (!Number.isInteger(value) || value < 0) throw new Error(`${label} must be 0 or greater.`);
  return value;
}

function validTimeZone(value: string) {
  try {
    new Intl.DateTimeFormat("en", { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}

export async function savePropProfileAction(_state: PropProfileFormState, formData: FormData): Promise<PropProfileFormState> {
  let savedProfileId: string;
  try {
    const supabase = await createSupabaseServerClient();
    if (!supabase) return { error: "Data service is not configured." };
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) return { error: "You must be signed in." };

    const profileId = stringValue(formData, "profile_id") || null;
    const accountValue = stringValue(formData, "account");
    const accountScope = accountValue === "manual" ? "manual" : "account";
    const tradingAccountId = accountScope === "manual" ? null : accountValue;
    const name = stringValue(formData, "name");
    const drawdownType = stringValue(formData, "drawdown_type") === "trailing" ? "trailing" : "static";
    const timezone = stringValue(formData, "timezone") || "UTC";
    const tradingDayStart = stringValue(formData, "trading_day_start_time") || "00:00";
    const startedAtInput = stringValue(formData, "started_at");
    const consistencyRaw = stringValue(formData, "consistency_rule_percent");

    if (!name) throw new Error("Profile name is required.");
    if (!accountValue) throw new Error("Account is required.");
    if (!validTimeZone(timezone)) throw new Error("Timezone is invalid.");
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(tradingDayStart)) throw new Error("Trading day start time is invalid.");
    const startedAt = startedAtInput ? new Date(`${startedAtInput}T00:00:00`).toISOString() : new Date().toISOString();
    if (Number.isNaN(new Date(startedAt).getTime())) throw new Error("Start date is invalid.");

    if (tradingAccountId) {
      const { data: account, error } = await supabase
        .from("trading_accounts")
        .select("id")
        .eq("id", tradingAccountId)
        .eq("user_id", userData.user.id)
        .maybeSingle();
      if (error || !account) throw new Error("Trading account was not found.");
    }

    if (profileId) {
      const { data: ownedProfile, error } = await supabase
        .from("prop_readiness_profiles")
        .select("id")
        .eq("id", profileId)
        .eq("user_id", userData.user.id)
        .maybeSingle();
      if (error || !ownedProfile) throw new Error("Prop Profile was not found.");
    }

    const payload = {
      user_id: userData.user.id,
      trading_account_id: tradingAccountId,
      account_scope: accountScope,
      name,
      initial_balance: positiveNumber(formData, "initial_balance", "Initial balance"),
      profit_target_percent: positiveNumber(formData, "profit_target_percent", "Profit target", 100),
      max_daily_loss_percent: positiveNumber(formData, "max_daily_loss_percent", "Daily loss limit", 100),
      max_total_drawdown_percent: positiveNumber(formData, "max_total_drawdown_percent", "Maximum drawdown", 100),
      drawdown_type: drawdownType,
      minimum_trading_days: nonNegativeInteger(formData, "minimum_trading_days", "Minimum trading days"),
      max_risk_per_trade_percent: positiveNumber(formData, "max_risk_per_trade_percent", "Risk per trade", 100),
      consistency_rule_percent: consistencyRaw ? positiveNumber(formData, "consistency_rule_percent", "Consistency rule", 100) : null,
      timezone,
      trading_day_start_time: tradingDayStart,
      started_at: startedAt,
      status: "active",
      updated_at: new Date().toISOString(),
    };

    let targetProfileId = profileId;
    if (!targetProfileId) {
      let existingQuery = supabase
        .from("prop_readiness_profiles")
        .select("id")
        .eq("user_id", userData.user.id)
        .eq("status", "active")
        .eq("account_scope", accountScope);
      existingQuery = tradingAccountId
        ? existingQuery.eq("trading_account_id", tradingAccountId)
        : existingQuery.is("trading_account_id", null);
      const { data: existing, error } = await existingQuery.maybeSingle();
      if (error) return { error: formatSupabaseError(error.message) };
      targetProfileId = existing?.id ?? null;
    }

    const result = targetProfileId
      ? await supabase.from("prop_readiness_profiles").update(payload).eq("id", targetProfileId).eq("user_id", userData.user.id).select("id").single()
      : await supabase.from("prop_readiness_profiles").insert(payload).select("id").single();

    if (result.error || !result.data) {
      return { error: result.error ? formatSupabaseError(result.error.message) : "Unable to save Prop Profile." };
    }

    savedProfileId = result.data.id;
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to save Prop Profile." };
  }

  revalidatePath("/prop-readiness");
  revalidatePath("/dashboard");
  redirect(`/prop-readiness?profile=${savedProfileId}&saved=1`);
}

export async function recalculatePropReadinessAction(_state: PropProfileFormState, formData: FormData): Promise<PropProfileFormState> {
  const profileId = stringValue(formData, "profile_id");
  if (!profileId) return { error: "Prop Profile is required." };

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: "Data service is not configured." };
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return { error: "You must be signed in." };

  const { data: profileData, error: profileError } = await supabase
    .from("prop_readiness_profiles")
    .select("id,user_id,trading_account_id,account_scope,name,initial_balance,profit_target_percent,max_daily_loss_percent,max_total_drawdown_percent,drawdown_type,minimum_trading_days,max_risk_per_trade_percent,consistency_rule_percent,timezone,trading_day_start_time,status,started_at,created_at,updated_at")
    .eq("id", profileId)
    .eq("user_id", userData.user.id)
    .maybeSingle();
  if (profileError || !profileData) return { error: profileError ? formatSupabaseError(profileError.message) : "Prop Profile was not found." };
  const profile = profileData as PropReadinessProfile;

  let tradeQuery = supabase
    .from("trades")
    .select("id,user_id,trading_account_id,source,symbol,market_type,direction,entry_price,exit_price,stop_loss,take_profit,position_size,risk_percent,rr,pnl,fees,result,session,strategy_id,opened_at,closed_at,created_at,updated_at")
    .eq("user_id", userData.user.id)
    .order("opened_at", { ascending: true })
    .limit(5000);
  tradeQuery = profile.account_scope === "manual"
    ? tradeQuery.eq("source", "manual")
    : tradeQuery.eq("trading_account_id", profile.trading_account_id);

  const [tradesResult, disciplineResult, revengeResult] = await Promise.all([
    tradeQuery,
    supabase.from("discipline_scores").select("id,user_id,period_type,period_start,period_end,rule_adherence,risk_control,emotion_balance,revenge_avoidance,time_discipline,total_score,created_at").eq("user_id", userData.user.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("revenge_events").select("id,user_id,previous_trade_id,next_trade_id,revenge_score,gap_minutes,size_increase_ratio,triggered_rules,created_at").eq("user_id", userData.user.id).gte("created_at", profile.started_at).order("created_at", { ascending: false }).limit(200),
  ]);
  if (tradesResult.error) return { error: formatSupabaseError(tradesResult.error.message) };

  const trades = (tradesResult.data ?? []) as Trade[];
  const tradeIds = new Set(trades.map((trade) => trade.id));
  const revengeEvents = ((revengeResult.data ?? []) as RevengeEvent[]).filter((event) =>
    Boolean(event.previous_trade_id && tradeIds.has(event.previous_trade_id)) || Boolean(event.next_trade_id && tradeIds.has(event.next_trade_id)),
  );
  const calculation = calculatePropReadiness({
    profile,
    trades,
    latestDisciplineScore: (disciplineResult.data ?? null) as DisciplineScore | null,
    revengeEvents,
  });

  const snapshotPayload = {
    ...calculation.snapshot,
    user_id: userData.user.id,
    profile_id: profile.id,
  };
  const { error: snapshotError } = await supabase.from("prop_readiness_snapshots").insert(snapshotPayload);
  if (snapshotError) return { error: formatSupabaseError(snapshotError.message) };

  if (calculation.violations.length) {
    const violationPayload = calculation.violations.map((violation) => ({
      ...violation,
      user_id: userData.user.id,
      profile_id: profile.id,
      trading_account_id: profile.trading_account_id,
    }));
    const { error: violationError } = await supabase
      .from("prop_rule_violations")
      .upsert(violationPayload, { onConflict: "profile_id,violation_key" });
    if (violationError) return { error: formatSupabaseError(violationError.message) };
  }

  revalidatePath("/prop-readiness");
  revalidatePath("/dashboard");
  revalidatePath("/journal/new");
  redirect(`/prop-readiness?profile=${profile.id}&calculated=1`);
}
