import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { PropReadinessProfile, PropReadinessSnapshot, PropRuleViolation } from "@/lib/prop-readiness/types";

const profileFields = "id,user_id,trading_account_id,account_scope,name,initial_balance,profit_target_percent,max_daily_loss_percent,max_total_drawdown_percent,drawdown_type,minimum_trading_days,max_risk_per_trade_percent,consistency_rule_percent,timezone,trading_day_start_time,status,started_at,created_at,updated_at";
const snapshotFields = "id,user_id,profile_id,trading_account_id,snapshot_at,current_balance,current_equity,peak_balance,total_pnl,today_pnl,profit_target_progress,daily_loss_used_percent,daily_loss_remaining,drawdown_used_percent,drawdown_remaining,trading_days_count,consistency_score,discipline_score,revenge_risk,readiness_score,readiness_status,data_quality,summary,warnings,recommendations,created_at";
const violationFields = "id,user_id,profile_id,trading_account_id,trade_id,violation_key,violation_type,severity,limit_value,actual_value,message,occurred_at,created_at";

export async function getActivePropProfileForTrade(supabase: SupabaseClient, userId: string, trade: { trading_account_id?: string | null; source?: string | null }) {
  let query = supabase.from("prop_readiness_profiles").select(profileFields).eq("user_id", userId).eq("status", "active").order("updated_at", { ascending: false }).limit(1);
  query = trade.trading_account_id
    ? query.eq("account_scope", "account").eq("trading_account_id", trade.trading_account_id)
    : query.eq("account_scope", "manual").is("trading_account_id", null);
  const { data, error } = await query.maybeSingle();
  return error ? null : (data ?? null) as PropReadinessProfile | null;
}

export async function getPropContextForProfile(supabase: SupabaseClient, userId: string, profile: PropReadinessProfile | null) {
  if (!profile) return { profile: null, snapshot: null, violations: [] as PropRuleViolation[] };
  const [snapshotResult, violationsResult] = await Promise.all([
    supabase.from("prop_readiness_snapshots").select(snapshotFields).eq("user_id", userId).eq("profile_id", profile.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("prop_rule_violations").select(violationFields).eq("user_id", userId).eq("profile_id", profile.id).order("occurred_at", { ascending: false }).limit(20),
  ]);
  return {
    profile,
    snapshot: snapshotResult.error ? null : (snapshotResult.data ?? null) as PropReadinessSnapshot | null,
    violations: violationsResult.error ? [] : (violationsResult.data ?? []) as PropRuleViolation[],
  };
}
