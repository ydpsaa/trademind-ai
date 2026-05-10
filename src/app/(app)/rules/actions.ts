"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { defaultTradingRules } from "@/lib/rules/default-rules";
import type { RuleAutoCondition, TradingRuleType } from "@/lib/rules/types";
import { formatSupabaseError } from "@/lib/supabase/errors";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface RuleActionState {
  error?: string;
}

function optionalString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function parseRuleType(value: string | null): TradingRuleType {
  return value === "auto_check" ? "auto_check" : "manual_check";
}

function parseAutoCondition(formData: FormData, type: TradingRuleType): RuleAutoCondition | null {
  if (type !== "auto_check") return null;

  const field = optionalString(formData, "condition_field");
  const operator = optionalString(formData, "condition_operator");
  const rawValue = optionalString(formData, "condition_value");

  if (!field || !operator || !rawValue) {
    throw new Error("Auto-check condition is required.");
  }

  if (!["risk_percent", "fomo_score", "news_risk", "trades_per_day", "cooldown_after_loss"].includes(field)) {
    throw new Error("Unsupported auto-check field.");
  }

  if (!["lte", "gte", "eq"].includes(operator)) {
    throw new Error("Unsupported auto-check operator.");
  }

  const numericValue = Number(rawValue);

  return {
    field: field as RuleAutoCondition["field"],
    operator: operator as RuleAutoCondition["operator"],
    value: Number.isFinite(numericValue) ? numericValue : rawValue,
  };
}

async function getUserContext() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: "Supabase is not configured." };

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return { error: "You must be signed in." };

  return { supabase, userId: userData.user.id };
}

export async function createTradingRuleAction(_state: RuleActionState, formData: FormData): Promise<RuleActionState> {
  const context = await getUserContext();
  if ("error" in context) return { error: context.error };

  try {
    const text = optionalString(formData, "text");
    if (!text) throw new Error("Rule text is required.");
    const type = parseRuleType(optionalString(formData, "type"));
    const autoCondition = parseAutoCondition(formData, type);

    const { error } = await context.supabase.from("trading_rules").insert({
      user_id: context.userId,
      text,
      type,
      auto_condition: autoCondition,
      active: formData.get("active") === "on",
    });

    if (error) return { error: formatSupabaseError(error.message) };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to create rule." };
  }

  revalidatePath("/rules");
  redirect("/rules?created=1");
}

export async function updateTradingRuleAction(_state: RuleActionState, formData: FormData): Promise<RuleActionState> {
  const context = await getUserContext();
  if ("error" in context) return { error: context.error };

  try {
    const ruleId = optionalString(formData, "rule_id");
    const text = optionalString(formData, "text");
    if (!ruleId) throw new Error("Missing rule id.");
    if (!text) throw new Error("Rule text is required.");
    const type = parseRuleType(optionalString(formData, "type"));
    const autoCondition = parseAutoCondition(formData, type);

    const { error } = await context.supabase
      .from("trading_rules")
      .update({
        text,
        type,
        auto_condition: autoCondition,
        active: formData.get("active") === "on",
        updated_at: new Date().toISOString(),
      })
      .eq("id", ruleId)
      .eq("user_id", context.userId);

    if (error) return { error: formatSupabaseError(error.message) };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to update rule." };
  }

  revalidatePath("/rules");
  redirect("/rules?updated=1");
}

export async function deleteTradingRuleAction(formData: FormData) {
  const context = await getUserContext();
  if ("error" in context) redirect(`/rules?error=${encodeURIComponent(context.error ?? "Unable to load user context.")}`);
  const ruleId = optionalString(formData, "rule_id");
  if (!ruleId) redirect("/rules?error=Missing%20rule%20id.");

  const { error } = await context.supabase.from("trading_rules").delete().eq("id", ruleId).eq("user_id", context.userId);
  if (error) redirect(`/rules?error=${encodeURIComponent(formatSupabaseError(error.message))}`);

  revalidatePath("/rules");
  redirect("/rules?deleted=1");
}

export async function toggleTradingRuleAction(formData: FormData) {
  const context = await getUserContext();
  if ("error" in context) redirect(`/rules?error=${encodeURIComponent(context.error ?? "Unable to load user context.")}`);
  const ruleId = optionalString(formData, "rule_id");
  const active = formData.get("active") === "true";
  if (!ruleId) redirect("/rules?error=Missing%20rule%20id.");

  const { error } = await context.supabase
    .from("trading_rules")
    .update({ active, updated_at: new Date().toISOString() })
    .eq("id", ruleId)
    .eq("user_id", context.userId);

  if (error) redirect(`/rules?error=${encodeURIComponent(formatSupabaseError(error.message))}`);

  revalidatePath("/rules");
  redirect("/rules?updated=1");
}

export async function createDefaultTradingRulesAction() {
  const context = await getUserContext();
  if ("error" in context) redirect(`/rules?error=${encodeURIComponent(context.error ?? "Unable to load user context.")}`);

  const { data: existing } = await context.supabase.from("trading_rules").select("text").eq("user_id", context.userId);
  const existingTexts = new Set((existing ?? []).map((rule) => rule.text));
  const rows = defaultTradingRules
    .filter((rule) => !existingTexts.has(rule.text))
    .map((rule) => ({
      user_id: context.userId,
      text: rule.text,
      type: rule.type ?? "manual_check",
      auto_condition: rule.auto_condition ?? null,
      active: true,
    }));

  if (rows.length) {
    const { error } = await context.supabase.from("trading_rules").insert(rows);
    if (error) redirect(`/rules?error=${encodeURIComponent(formatSupabaseError(error.message))}`);
  }

  revalidatePath("/rules");
  redirect(`/rules?defaults=${rows.length}`);
}
