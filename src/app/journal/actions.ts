"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatSupabaseError } from "@/lib/supabase/errors";
import { parseTagInput } from "@/lib/trading/format";

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

    const tradePayload = {
      user_id: userData.user.id,
      source: "manual",
      symbol,
      direction,
      opened_at: new Date(openedAt).toISOString(),
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
