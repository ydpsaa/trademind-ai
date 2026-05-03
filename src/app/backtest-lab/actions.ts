"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { runMockBacktest } from "@/lib/backtest/mock-engine";
import type { BacktestFormState, BacktestInput, BacktestTimeframe } from "@/lib/backtest/types";
import { backtestMarkets, backtestSymbols, backtestTimeframes } from "@/lib/backtest/types";
import type { Strategy } from "@/lib/strategies/types";
import { normalizeStrategyRules } from "@/lib/strategies/validation";
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

function numberField(formData: FormData, key: string, label: string) {
  const value = requiredString(formData, key, label);
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${label} must be a valid number.`);
  }
  return parsed;
}

function validateBacktestInput(input: Omit<BacktestInput, "strategyName" | "minimumRr" | "strategyRules">) {
  if (!backtestSymbols.includes(input.symbol)) {
    return "Symbol is required.";
  }

  if (!backtestMarkets.includes(input.marketType)) {
    return "Market type is required.";
  }

  if (!backtestTimeframes.includes(input.timeframe)) {
    return "Timeframe is required.";
  }

  const start = new Date(input.periodStart);
  const end = new Date(input.periodEnd);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return "Period start and end are required.";
  }

  if (end <= start) {
    return "Period end must be after period start.";
  }

  if (!Number.isFinite(input.initialBalance) || input.initialBalance <= 0) {
    return "Initial balance must be greater than 0.";
  }

  if (!Number.isFinite(input.riskPerTrade) || input.riskPerTrade <= 0 || input.riskPerTrade > 10) {
    return "Risk per trade must be greater than 0 and no more than 10.";
  }

  return null;
}

async function currentUserClient() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return { error: "Supabase is not configured." };
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return { error: "You must be signed in to run backtests." };
  }

  return { supabase, user: userData.user };
}

export async function runBacktestAction(_state: BacktestFormState, formData: FormData): Promise<BacktestFormState> {
  try {
    const context = await currentUserClient();
    if ("error" in context) return { error: context.error };

    const strategyId = requiredString(formData, "strategy_id", "Strategy");
    const inputBase = {
      strategyId,
      symbol: requiredString(formData, "symbol", "Symbol"),
      marketType: requiredString(formData, "market_type", "Market type"),
      timeframe: requiredString(formData, "timeframe", "Timeframe") as BacktestTimeframe,
      periodStart: requiredString(formData, "period_start", "Period start"),
      periodEnd: requiredString(formData, "period_end", "Period end"),
      initialBalance: numberField(formData, "initial_balance", "Initial balance"),
      riskPerTrade: numberField(formData, "risk_per_trade", "Risk per trade"),
    };
    const validationError = validateBacktestInput(inputBase);
    if (validationError) return { error: validationError };

    const { data: strategy, error: strategyError } = await context.supabase
      .from("strategies")
      .select("*")
      .eq("id", strategyId)
      .eq("user_id", context.user.id)
      .maybeSingle();

    if (strategyError) return { error: formatSupabaseError(strategyError.message) };
    if (!strategy) return { error: "Strategy not found." };

    const typedStrategy = strategy as Strategy;
    const strategyRules = normalizeStrategyRules(typedStrategy.rules_json);
    const input: BacktestInput = {
      ...inputBase,
      strategyName: typedStrategy.name,
      minimumRr: strategyRules.minimumRr,
      strategyRules,
    };
    const result = runMockBacktest(input);
    const { error } = await context.supabase.from("backtests").insert({
      user_id: context.user.id,
      strategy_id: strategyId,
      symbol: input.symbol,
      timeframe: input.timeframe,
      period_start: new Date(input.periodStart).toISOString(),
      period_end: new Date(input.periodEnd).toISOString(),
      initial_balance: input.initialBalance,
      final_balance: result.finalBalance,
      total_trades: result.totalTrades,
      winrate: result.winrate,
      profit_factor: result.profitFactor,
      max_drawdown: result.maxDrawdown,
      avg_rr: result.avgRr,
      report_json: result.report,
    });

    if (error) return { error: formatSupabaseError(error.message) };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unable to run simulated backtest." };
  }

  revalidatePath("/backtest-lab");
  revalidatePath("/dashboard");
  redirect("/backtest-lab?created=1");
}

export async function runBacktestFormAction(formData: FormData) {
  const result = await runBacktestAction({}, formData);
  if (result.error) {
    redirect(`/backtest-lab?error=${encodeURIComponent(result.error)}`);
  }
}

export async function deleteBacktestAction(_state: BacktestFormState, formData: FormData): Promise<BacktestFormState> {
  const context = await currentUserClient();
  if ("error" in context) return { error: context.error };

  const backtestId = optionalString(formData, "backtest_id");
  if (!backtestId) return { error: "Missing backtest id." };

  const { error } = await context.supabase.from("backtests").delete().eq("id", backtestId).eq("user_id", context.user.id);
  if (error) return { error: formatSupabaseError(error.message) };

  revalidatePath("/backtest-lab");
  revalidatePath("/dashboard");
  return { success: true };
}
