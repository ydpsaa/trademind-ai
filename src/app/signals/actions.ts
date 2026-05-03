"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getMarketScanResults } from "@/lib/scanner/mock-scanner";
import { generateSimulatedSignals } from "@/lib/signals/simulated-signal-engine";
import type { SignalActionState, SignalStatus } from "@/lib/signals/types";
import type { Strategy } from "@/lib/strategies/types";
import { formatSupabaseError } from "@/lib/supabase/errors";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function optionalString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

async function currentUserClient() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: "Supabase is not configured." };

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return { error: "You must be signed in to manage signals." };

  return { supabase, user: userData.user };
}

export async function generateSimulatedSignalsAction(_state: SignalActionState, _formData: FormData): Promise<SignalActionState> {
  void _state;
  void _formData;

  const context = await currentUserClient();
  if ("error" in context) return { error: context.error };

  const { data: strategies, error: strategyError } = await context.supabase
    .from("strategies")
    .select("*")
    .eq("user_id", context.user.id)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (strategyError) return { error: formatSupabaseError(strategyError.message) };
  if (!strategies?.length) return { error: "Create or activate a strategy before generating signals." };

  const scannerResults = getMarketScanResults("15m");
  const generated = generateSimulatedSignals(strategies as Strategy[], scannerResults).slice(0, 18);
  if (!generated.length) return { error: "No simulated setup ideas matched your active strategies." };

  const { error: deleteError } = await context.supabase
    .from("signals")
    .delete()
    .eq("user_id", context.user.id)
    .eq("engine_type", "simulated")
    .in("status", ["watching", "forming", "ready"]);

  if (deleteError) return { error: formatSupabaseError(deleteError.message) };

  const rows = generated.map((signal) => ({
    ...signal,
    user_id: context.user.id,
  }));
  const { error } = await context.supabase.from("signals").insert(rows);
  if (error) return { error: formatSupabaseError(error.message) };

  revalidatePath("/signals");
  revalidatePath("/dashboard");
  return { success: true };
}

async function updateSignalStatus(formData: FormData, status: SignalStatus) {
  const context = await currentUserClient();
  if ("error" in context) return { error: context.error };

  const signalId = optionalString(formData, "signal_id");
  if (!signalId) return { error: "Missing signal id." };

  const { error } = await context.supabase
    .from("signals")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", signalId)
    .eq("user_id", context.user.id);

  if (error) return { error: formatSupabaseError(error.message) };
  revalidatePath("/signals");
  revalidatePath(`/signals/${signalId}`);
  revalidatePath("/dashboard");
  return { success: true };
}

export async function dismissSignalAction(_state: SignalActionState, formData: FormData): Promise<SignalActionState> {
  return updateSignalStatus(formData, "dismissed");
}

export async function archiveSignalAction(_state: SignalActionState, formData: FormData): Promise<SignalActionState> {
  return updateSignalStatus(formData, "archived");
}

export async function deleteSignalAction(_state: SignalActionState, formData: FormData): Promise<SignalActionState> {
  const context = await currentUserClient();
  if ("error" in context) return { error: context.error };

  const signalId = optionalString(formData, "signal_id");
  if (!signalId) return { error: "Missing signal id." };

  const { error } = await context.supabase.from("signals").delete().eq("id", signalId).eq("user_id", context.user.id);
  if (error) return { error: formatSupabaseError(error.message) };

  revalidatePath("/signals");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function generateSimulatedSignalsFormAction(formData: FormData) {
  const result = await generateSimulatedSignalsAction({}, formData);
  if (result.error) redirect(`/signals?error=${encodeURIComponent(result.error)}`);
  redirect("/signals?generated=1");
}
