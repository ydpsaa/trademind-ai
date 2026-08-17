"use server";

import { revalidatePath } from "next/cache";
import { assertOkxReadOnlyApiKey, OkxReadOnlyClient, OkxRequestError } from "@/lib/okx/client";
import { decryptOkxCredentials, encryptOkxCredentials } from "@/lib/okx/credentials";
import { syncOkxClosedTrades } from "@/lib/okx/sync";
import type { OkxConnectionActionState, OkxEnvironment } from "@/lib/okx/types";
import { createSupabaseServerClient, createSupabaseServiceRoleClient } from "@/lib/supabase/server";

function stringValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function safeError(error: unknown) {
  if (error instanceof OkxRequestError) return error.message;
  if (error instanceof Error && error.message === "Secure credential storage is not configured.") return error.message;
  return "The read-only connection request could not be completed.";
}

async function getContext() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: "Data service is not configured." } as const;
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return { error: "You must be signed in to manage this connection." } as const;
  return { supabase, user: data.user } as const;
}

function revalidateOkxViews() {
  revalidatePath("/connections");
  revalidatePath("/connections/okx");
  revalidatePath("/dashboard");
  revalidatePath("/journal");
}

export async function connectOkxAction(
  _state: OkxConnectionActionState,
  formData: FormData,
): Promise<OkxConnectionActionState> {
  void _state;
  const accountName = stringValue(formData, "account_name");
  const apiKey = stringValue(formData, "api_key");
  const apiSecret = stringValue(formData, "api_secret");
  const passphrase = stringValue(formData, "passphrase");
  const environment: OkxEnvironment = stringValue(formData, "environment") === "demo" ? "demo" : "live";

  if (!accountName || accountName.length > 80) return { error: "Account name is required and must be 80 characters or fewer." };
  if (apiKey.length < 8 || apiSecret.length < 16 || passphrase.length < 8) {
    return { error: "Enter a valid API key, secret, and passphrase." };
  }

  const context = await getContext();
  if ("error" in context) return { error: context.error };

  try {
    const client = new OkxReadOnlyClient({ apiKey, apiSecret, passphrase }, environment);
    const config = await client.getAccountConfig();
    assertOkxReadOnlyApiKey(config);

    const externalAccountId = config.uid || config.mainUid;
    if (!externalAccountId) return { error: "The provider did not return a stable account identifier." };

    const now = new Date().toISOString();
    const keyHint = apiKey.slice(-4);
    const accountPayload = {
      user_id: context.user.id,
      provider: "okx",
      account_name: accountName,
      account_type: "exchange",
      currency: "USD",
      status: "active",
      external_account_id: externalAccountId,
      metadata: {
        environment,
        readOnly: true,
        apiKeyHint: keyHint,
        accountMode: config.acctLv || null,
        positionMode: config.posMode || null,
        connectedAt: now,
      },
      updated_at: now,
    };

    const { data: existingAccount } = await context.supabase
      .from("trading_accounts")
      .select("id")
      .eq("user_id", context.user.id)
      .eq("provider", "okx")
      .eq("external_account_id", externalAccountId)
      .maybeSingle();

    const accountResult = existingAccount
      ? await context.supabase.from("trading_accounts").update(accountPayload).eq("id", existingAccount.id).eq("user_id", context.user.id).select("id").single()
      : await context.supabase.from("trading_accounts").insert(accountPayload).select("id").single();

    if (accountResult.error || !accountResult.data) return { error: "Could not create the OKX trading account." };

    const admin = createSupabaseServiceRoleClient();
    const encryptedPayload = encryptOkxCredentials({ apiKey, apiSecret, passphrase }, context.user.id);
    const { error: credentialError } = await admin.from("integration_credentials").upsert(
      {
        user_id: context.user.id,
        provider: "okx",
        environment,
        encrypted_payload: encryptedPayload,
        key_hint: keyHint,
        updated_at: now,
      },
      { onConflict: "user_id,provider" },
    );

    if (credentialError) {
      await context.supabase.from("trading_accounts").update({ status: "not_connected", updated_at: now }).eq("id", accountResult.data.id).eq("user_id", context.user.id);
      return { error: "Secure credential storage is unavailable." };
    }

    const { error: connectionError } = await context.supabase.from("integration_connections").upsert(
      {
        user_id: context.user.id,
        provider: "okx",
        status: "connected",
        mode: "read_only",
        display_name: accountName,
        metadata: {
          environment,
          readOnly: true,
          apiKeyHint: keyHint,
          executionEnabled: false,
          withdrawalAllowed: false,
        },
        last_checked_at: now,
        updated_at: now,
      },
      { onConflict: "user_id,provider" },
    );

    if (connectionError) return { error: "Connection verified, but its status could not be saved." };
    revalidateOkxViews();
    return { success: true, message: "Read-only OKX account connected." };
  } catch (error) {
    return { error: safeError(error) };
  }
}

export async function syncOkxTradesAction(
  _state: OkxConnectionActionState,
  formData: FormData,
): Promise<OkxConnectionActionState> {
  void _state;
  const daysValue = Number(stringValue(formData, "days"));
  const days = daysValue === 7 ? 7 : 30;
  const context = await getContext();
  if ("error" in context) return { error: context.error };

  const { data: account, error: accountError } = await context.supabase
    .from("trading_accounts")
    .select("id,metadata,status")
    .eq("user_id", context.user.id)
    .eq("provider", "okx")
    .eq("status", "active")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (accountError || !account) return { error: "Connect an active read-only OKX account first." };

  const admin = createSupabaseServiceRoleClient();
  const { data: credential, error: credentialError } = await admin
    .from("integration_credentials")
    .select("encrypted_payload,environment")
    .eq("user_id", context.user.id)
    .eq("provider", "okx")
    .maybeSingle();
  if (credentialError || !credential) return { error: "Secure OKX credentials are not available. Reconnect the account." };

  const rangeEnd = new Date();
  const rangeStart = new Date(rangeEnd.getTime() - days * 24 * 60 * 60 * 1000);
  const { data: syncRun, error: syncRunError } = await admin
    .from("integration_sync_runs")
    .insert({
      user_id: context.user.id,
      trading_account_id: account.id,
      provider: "okx",
      status: "running",
      range_start: rangeStart.toISOString(),
      range_end: rangeEnd.toISOString(),
    })
    .select("id")
    .single();
  if (syncRunError || !syncRun) return { error: "Could not start the sync safely." };

  try {
    const credentials = decryptOkxCredentials(credential.encrypted_payload, context.user.id);
    const environment: OkxEnvironment = credential.environment === "demo" ? "demo" : "live";
    const client = new OkxReadOnlyClient(credentials, environment);
    const summary = await syncOkxClosedTrades({
      supabase: context.supabase,
      client,
      userId: context.user.id,
      accountId: account.id,
      days,
    });
    const now = new Date().toISOString();
    const currentMetadata = account.metadata && typeof account.metadata === "object" ? account.metadata : {};

    await Promise.all([
      admin
        .from("integration_sync_runs")
        .update({
          status: "completed",
          fetched_count: summary.fetchedCount,
          imported_count: summary.importedCount,
          skipped_count: summary.skippedCount,
          completed_at: now,
        })
        .eq("id", syncRun.id)
        .eq("user_id", context.user.id),
      context.supabase
        .from("trading_accounts")
        .update({
          last_synced_at: now,
          metadata: { ...currentMetadata, lastSyncDays: days, lastFetchedCount: summary.fetchedCount },
          updated_at: now,
        })
        .eq("id", account.id)
        .eq("user_id", context.user.id),
      context.supabase
        .from("integration_connections")
        .update({ last_checked_at: now, updated_at: now })
        .eq("user_id", context.user.id)
        .eq("provider", "okx"),
    ]);

    revalidateOkxViews();
    return {
      success: true,
      message: `Sync completed. ${summary.importedCount} new trade${summary.importedCount === 1 ? "" : "s"} imported.`,
      importedCount: summary.importedCount,
      skippedCount: summary.skippedCount,
    };
  } catch (error) {
    const message = safeError(error);
    await admin
      .from("integration_sync_runs")
      .update({ status: "failed", error_count: 1, last_error: message, completed_at: new Date().toISOString() })
      .eq("id", syncRun.id)
      .eq("user_id", context.user.id);
    revalidatePath("/connections/okx");
    return { error: message };
  }
}

export async function disconnectOkxAction(
  _state: OkxConnectionActionState,
  formData: FormData,
): Promise<OkxConnectionActionState> {
  void _state;
  if (stringValue(formData, "confirm") !== "disconnect") return { error: "Confirm disconnect before continuing." };
  const context = await getContext();
  if ("error" in context) return { error: context.error };

  const admin = createSupabaseServiceRoleClient();
  const now = new Date().toISOString();
  const { error: credentialError } = await admin
    .from("integration_credentials")
    .delete()
    .eq("user_id", context.user.id)
    .eq("provider", "okx");
  if (credentialError) return { error: "Could not remove the secure connection credentials." };

  const [accountResult, connectionResult] = await Promise.all([
    context.supabase
      .from("trading_accounts")
      .update({ status: "not_connected", updated_at: now })
      .eq("user_id", context.user.id)
      .eq("provider", "okx"),
    context.supabase.from("integration_connections").upsert(
      {
        user_id: context.user.id,
        provider: "okx",
        status: "not_connected",
        mode: "read_only",
        display_name: "OKX",
        metadata: { executionEnabled: false, credentialsStored: false },
        last_checked_at: now,
        updated_at: now,
      },
      { onConflict: "user_id,provider" },
    ),
  ]);

  if (accountResult.error || connectionResult.error) return { error: "Credentials were removed, but connection metadata could not be fully updated." };
  revalidateOkxViews();
  return { success: true, message: "OKX disconnected. Previously imported trades were kept." };
}
