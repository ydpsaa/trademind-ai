"use server";

import { revalidatePath } from "next/cache";
import { getProvider } from "@/lib/connections/connection-status";
import type { ConnectionActionState, ConnectionMode, ConnectionStatus, IntegrationProvider } from "@/lib/connections/types";
import { hasSupabasePublicEnv } from "@/lib/supabase/config";
import { formatSupabaseError } from "@/lib/supabase/errors";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function stringValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function hasOpenAIKey() {
  return Boolean(process.env.OPENAI_API_KEY);
}

function configuredModel() {
  return process.env.OPENAI_MODEL || "local-rules";
}

function connectionPatchMessage(message: string) {
  if (message.includes("integration_connections") || message.includes("schema cache") || message.includes("does not exist")) {
    return "Integration connections table is not applied yet. Run src/db/patches/007_integration_connections.sql in Supabase SQL Editor.";
  }

  return formatSupabaseError(message);
}

async function upsertConnectionStatus(
  provider: IntegrationProvider,
  userId: string,
  status: ConnectionStatus,
  mode: ConnectionMode,
  displayName: string,
  metadata: Record<string, unknown>,
) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: "Supabase is not configured." };

  const checkedAt = new Date().toISOString();
  const payload = {
    user_id: userId,
    provider,
    status,
    mode,
    display_name: displayName,
    metadata,
    last_checked_at: checkedAt,
    updated_at: checkedAt,
  };

  const { error } = await supabase.from("integration_connections").upsert(payload, {
    onConflict: "user_id,provider",
  });

  if (error) return { error: connectionPatchMessage(error.message) };
  return { checkedAt };
}

async function getAuthenticatedContext() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: "Supabase is not configured." };

  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return { error: "You must be signed in to check connections." };

  return { supabase, user: data.user };
}

export async function checkConnectionStatusAction(_state: ConnectionActionState, formData: FormData): Promise<ConnectionActionState> {
  void _state;

  const providerId = stringValue(formData, "provider") as IntegrationProvider | null;
  const provider = getProvider(providerId ?? undefined);
  if (!provider || !providerId) return { error: "Unknown connection provider." };

  const context = await getAuthenticatedContext();
  if ("error" in context) return { error: context.error };

  let status: ConnectionStatus = provider.defaultStatus;
  let mode: ConnectionMode = provider.mode;
  let metadata: Record<string, unknown> = {};

  if (providerId === "supabase") {
    status = hasSupabasePublicEnv() && Boolean(context.user.id) ? "connected" : "error";
    mode = "configured";
    metadata = {
      publicUrlPresent: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
      anonKeyPresent: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
      sessionPresent: Boolean(context.user.id),
    };
  } else if (providerId === "ai-provider") {
    status = hasOpenAIKey() ? "connected" : "fallback";
    mode = hasOpenAIKey() ? "configured" : "fallback";
    metadata = {
      aiKeyConfigured: hasOpenAIKey(),
      provider: process.env.AI_PROVIDER || "openai",
      model: configuredModel(),
    };
  } else if (providerId === "economic-calendar") {
    const { error, count } = await context.supabase.from("economic_events").select("id", { count: "exact", head: true });
    status = error ? "error" : "connected";
    mode = "configured";
    metadata = {
      readable: !error,
      rowCount: count ?? 0,
      error: error ? connectionPatchMessage(error.message) : null,
    };
  } else if (providerId === "market-data") {
    status = "not_connected";
    mode = "safe_setup";
    metadata = { externalCallsEnabled: false, message: "Market Data Feed is not connected." };
  } else if (providerId === "bybit" || providerId === "okx") {
    status = "not_connected";
    mode = "read_only_future";
    metadata = { executionEnabled: false, importMode: "future read-only" };
  } else {
    status = "coming_soon";
    mode = "coming_soon";
    metadata = { executionEnabled: false, externalCallsEnabled: false };
  }

  const update = await upsertConnectionStatus(providerId, context.user.id, status, mode, provider.name, metadata);
  if (update.error) return { error: update.error };

  revalidatePath("/connections");
  revalidatePath(`/connections/${providerId}`);
  return { success: true, status, checkedAt: update.checkedAt };
}
