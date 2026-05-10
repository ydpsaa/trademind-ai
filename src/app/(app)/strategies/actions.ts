"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { defaultStrategyRules, defaultStrategyTemplates } from "@/lib/strategies/defaults";
import type { StrategyFormState, StrategyRules } from "@/lib/strategies/types";
import { validateStrategyInput } from "@/lib/strategies/validation";
import { formatSupabaseError } from "@/lib/supabase/errors";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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

function stringList(formData: FormData, key: string, fallback: string[]) {
  const values = formData.getAll(key).filter((value): value is string => typeof value === "string" && value.trim().length > 0);
  return values.length ? values : fallback;
}

function numberField(formData: FormData, key: string, fallback: number) {
  const value = optionalString(formData, key);
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${key} must be a valid number.`);
  }
  return parsed;
}

function checkbox(formData: FormData, key: string) {
  return formData.get(key) === "on";
}

function rulesFromForm(formData: FormData): StrategyRules {
  return {
    markets: stringList(formData, "markets", defaultStrategyRules.markets),
    symbols: stringList(formData, "symbols", defaultStrategyRules.symbols),
    sessions: stringList(formData, "sessions", defaultStrategyRules.sessions),
    directionBias: (optionalString(formData, "directionBias") || defaultStrategyRules.directionBias) as StrategyRules["directionBias"],
    requiresBos: checkbox(formData, "requiresBos"),
    requiresChoch: checkbox(formData, "requiresChoch"),
    requiresLiquiditySweep: checkbox(formData, "requiresLiquiditySweep"),
    requiresFvg: checkbox(formData, "requiresFvg"),
    requiresOrderBlock: checkbox(formData, "requiresOrderBlock"),
    minimumRr: numberField(formData, "minimumRr", defaultStrategyRules.minimumRr),
    maxRiskPercent: numberField(formData, "maxRiskPercent", defaultStrategyRules.maxRiskPercent),
    avoidHighImpactNews: checkbox(formData, "avoidHighImpactNews"),
    newsBufferMinutes: numberField(formData, "newsBufferMinutes", defaultStrategyRules.newsBufferMinutes),
    entryModel: (optionalString(formData, "entryModel") || defaultStrategyRules.entryModel) as StrategyRules["entryModel"],
    stopLossModel: (optionalString(formData, "stopLossModel") || defaultStrategyRules.stopLossModel) as StrategyRules["stopLossModel"],
    takeProfitModel: (optionalString(formData, "takeProfitModel") || defaultStrategyRules.takeProfitModel) as StrategyRules["takeProfitModel"],
  };
}

async function currentUserClient() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return { error: "Data service is not configured." };
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return { error: "You must be signed in to manage strategies." };
  }

  return { supabase, user: userData.user };
}

export async function createStrategyAction(_state: StrategyFormState, formData: FormData): Promise<StrategyFormState> {
  try {
    const context = await currentUserClient();
    if ("error" in context) return { error: context.error };

    const name = requiredString(formData, "name", "Strategy name");
    const description = optionalString(formData, "description");
    const rules = rulesFromForm(formData);
    const validationError = validateStrategyInput({ name, rules });
    if (validationError) return { error: validationError };

    const { error } = await context.supabase.from("strategies").insert({
      user_id: context.user.id,
      name,
      description,
      is_active: checkbox(formData, "is_active"),
      rules_json: rules,
    });

    if (error) return { error: formatSupabaseError(error.message) };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to create strategy." };
  }

  revalidatePath("/strategies");
  redirect("/strategies?created=1");
}

export async function updateStrategyAction(_state: StrategyFormState, formData: FormData): Promise<StrategyFormState> {
  try {
    const context = await currentUserClient();
    if ("error" in context) return { error: context.error };

    const strategyId = requiredString(formData, "strategy_id", "Strategy id");
    const name = requiredString(formData, "name", "Strategy name");
    const description = optionalString(formData, "description");
    const rules = rulesFromForm(formData);
    const validationError = validateStrategyInput({ name, rules });
    if (validationError) return { error: validationError };

    const { error } = await context.supabase
      .from("strategies")
      .update({
        name,
        description,
        is_active: checkbox(formData, "is_active"),
        rules_json: rules,
      })
      .eq("id", strategyId)
      .eq("user_id", context.user.id);

    if (error) return { error: formatSupabaseError(error.message) };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to update strategy." };
  }

  revalidatePath("/strategies");
  redirect("/strategies?updated=1");
}

export async function deleteStrategyAction(_state: StrategyFormState, formData: FormData): Promise<StrategyFormState> {
  const context = await currentUserClient();
  if ("error" in context) return { error: context.error };

  const strategyId = optionalString(formData, "strategy_id");
  if (!strategyId) return { error: "Missing strategy id." };

  const { error } = await context.supabase.from("strategies").delete().eq("id", strategyId).eq("user_id", context.user.id);
  if (error) return { error: formatSupabaseError(error.message) };

  revalidatePath("/strategies");
  return { success: true };
}

export async function toggleStrategyActiveAction(_state: StrategyFormState, formData: FormData): Promise<StrategyFormState> {
  const context = await currentUserClient();
  if ("error" in context) return { error: context.error };

  const strategyId = optionalString(formData, "strategy_id");
  if (!strategyId) return { error: "Missing strategy id." };

  const nextActive = formData.get("next_active") === "true";
  const { error } = await context.supabase.from("strategies").update({ is_active: nextActive }).eq("id", strategyId).eq("user_id", context.user.id);
  if (error) return { error: formatSupabaseError(error.message) };

  revalidatePath("/strategies");
  return { success: true };
}

export async function createStrategyTemplatesAction(_state: StrategyFormState, _formData: FormData): Promise<StrategyFormState> {
  void _state;
  void _formData;

  const context = await currentUserClient();
  if ("error" in context) return { error: context.error };

  const rows = defaultStrategyTemplates.map((template) => ({
    user_id: context.user.id,
    name: template.name,
    description: template.description,
    rules_json: template.rules,
    is_active: true,
  }));
  const { error } = await context.supabase.from("strategies").insert(rows);
  if (error) return { error: formatSupabaseError(error.message) };

  revalidatePath("/strategies");
  return { success: true };
}
