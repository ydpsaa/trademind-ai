"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { validateRequiredMapping, validateTradeImportRow } from "@/lib/data-workspace/import-validation";
import { createImportRowHash } from "@/lib/data-workspace/row-hash";
import { getWorkspaceTemplate } from "@/lib/data-workspace/templates";
import {
  IMPORT_CHUNK_SIZE,
  MAX_WORKSPACE_COLUMNS,
  MAX_WORKSPACE_FILE_BYTES,
  MAX_WORKSPACE_ROWS,
  WORKSPACE_SAVE_BATCH_SIZE,
  type ImportSourceFormat,
  type SaveWorkspaceRowsInput,
  type TradeImportBatch,
  type TradeImportMapping,
  type WorkspaceActionResult,
  type WorkspaceColumn,
  type WorkspaceTableRow,
} from "@/lib/data-workspace/types";
import { formatSupabaseError } from "@/lib/supabase/errors";
import { createSupabaseServerClient } from "@/lib/supabase/server";

interface ActionContext {
  supabase: NonNullable<Awaited<ReturnType<typeof createSupabaseServerClient>>>;
  userId: string;
}

interface CreateImportWorkspaceInput {
  name: string;
  filename?: string | null;
  sourceFormat: ImportSourceFormat;
  columns: WorkspaceColumn[];
  rows: Array<Record<string, string | number | boolean | null>>;
  accountId?: string | null;
  newAccountName?: string | null;
}

function cleanText(value: FormDataEntryValue | null) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function safeError(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

async function getActionContext(): Promise<WorkspaceActionResult<ActionContext>> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { error: "Data service is not configured." };

  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return { error: "You must be signed in." };
  return { success: true, data: { supabase, userId: data.user.id } };
}

async function ownsWorkspace(context: ActionContext, tableId: string) {
  const { data } = await context.supabase
    .from("workspace_tables")
    .select("id")
    .eq("id", tableId)
    .eq("user_id", context.userId)
    .maybeSingle();
  return Boolean(data);
}

async function getOwnedBatch(context: ActionContext, batchId: string) {
  const { data, error } = await context.supabase
    .from("trade_import_batches")
    .select("id,user_id,workspace_table_id,trading_account_id,filename,source_format,status,mapping_json,next_position,total_rows,valid_rows,invalid_rows,imported_count,skipped_count,error_count,last_error,created_at,updated_at,completed_at,rolled_back_at")
    .eq("id", batchId)
    .eq("user_id", context.userId)
    .maybeSingle();
  if (error) return { error: formatSupabaseError(error.message) };
  if (!data) return { error: "Import batch was not found." };
  return { data: data as TradeImportBatch };
}

export async function createWorkspaceTableAction(_state: WorkspaceActionResult, formData: FormData): Promise<WorkspaceActionResult> {
  const contextResult = await getActionContext();
  if (!contextResult.data) return { error: contextResult.error };

  const name = cleanText(formData.get("name"));
  if (!name) return { error: "Table name is required." };
  const template = getWorkspaceTemplate(cleanText(formData.get("template")) ?? "blank");

  const { data, error } = await contextResult.data.supabase
    .from("workspace_tables")
    .insert({
      user_id: contextResult.data.userId,
      name,
      description: cleanText(formData.get("description")),
      kind: "custom",
      columns_json: template.columns,
      settings_json: { template: template.id },
    })
    .select("id")
    .single();

  if (error || !data) return { error: error ? formatSupabaseError(error.message) : "Unable to create table." };
  revalidatePath("/data-workspace");
  redirect(`/data-workspace/${data.id}`);
}

export async function deleteWorkspaceTableAction(tableId: string): Promise<WorkspaceActionResult> {
  const contextResult = await getActionContext();
  if (!contextResult.data) return { error: contextResult.error };
  if (!(await ownsWorkspace(contextResult.data, tableId))) return { error: "Table was not found." };

  const { error } = await contextResult.data.supabase
    .from("workspace_tables")
    .delete()
    .eq("id", tableId)
    .eq("user_id", contextResult.data.userId);
  if (error) return { error: formatSupabaseError(error.message) };

  revalidatePath("/data-workspace");
  return { success: true };
}

export async function updateWorkspaceTableAction(tableId: string, name: string, description: string): Promise<WorkspaceActionResult> {
  const contextResult = await getActionContext();
  if (!contextResult.data) return { error: contextResult.error };
  const cleanName = name.trim().slice(0, 120);
  if (!cleanName) return { error: "Table name is required." };
  if (!(await ownsWorkspace(contextResult.data, tableId))) return { error: "Table was not found." };

  const { error } = await contextResult.data.supabase
    .from("workspace_tables")
    .update({ name: cleanName, description: description.trim().slice(0, 500) || null, updated_at: new Date().toISOString() })
    .eq("id", tableId)
    .eq("user_id", contextResult.data.userId);
  if (error) return { error: formatSupabaseError(error.message) };
  revalidatePath("/data-workspace");
  revalidatePath(`/data-workspace/${tableId}`);
  return { success: true };
}

export async function updateWorkspaceColumnsAction(tableId: string, columns: WorkspaceColumn[]): Promise<WorkspaceActionResult> {
  const contextResult = await getActionContext();
  if (!contextResult.data) return { error: contextResult.error };
  if (!columns.length || columns.length > MAX_WORKSPACE_COLUMNS) return { error: `Tables support 1-${MAX_WORKSPACE_COLUMNS} columns.` };
  if (!(await ownsWorkspace(contextResult.data, tableId))) return { error: "Table was not found." };

  const normalized = columns.map((column) => ({
    ...column,
    key: column.key.trim().slice(0, 80),
    name: column.name.trim().slice(0, 120) || "Untitled",
    width: Math.min(Math.max(Number(column.width) || 160, 100), 480),
  }));
  if (new Set(normalized.map((column) => column.key)).size !== normalized.length) return { error: "Column keys must be unique." };

  const { error } = await contextResult.data.supabase
    .from("workspace_tables")
    .update({ columns_json: normalized, updated_at: new Date().toISOString() })
    .eq("id", tableId)
    .eq("user_id", contextResult.data.userId);
  if (error) return { error: formatSupabaseError(error.message) };
  revalidatePath(`/data-workspace/${tableId}`);
  return { success: true };
}

export async function saveWorkspaceRowsAction(input: SaveWorkspaceRowsInput): Promise<WorkspaceActionResult> {
  const contextResult = await getActionContext();
  if (!contextResult.data) return { error: contextResult.error };
  const context = contextResult.data;
  if (!input.rows.length) return { success: true };
  if (input.rows.length > WORKSPACE_SAVE_BATCH_SIZE) return { error: `Save batches are limited to ${WORKSPACE_SAVE_BATCH_SIZE} rows.` };
  if (JSON.stringify(input.rows).length > MAX_WORKSPACE_FILE_BYTES) return { error: "Save payload is too large." };
  if (!(await ownsWorkspace(context, input.tableId))) return { error: "Table was not found." };

  const rows = input.rows.map((row) => ({
    id: row.id,
    table_id: input.tableId,
    user_id: context.userId,
    position: Math.max(0, Math.trunc(row.position)),
    data_json: row.data_json,
    validation_status: row.validation_status,
    validation_errors: row.validation_errors.slice(0, 20),
    updated_at: new Date().toISOString(),
  }));
  const { error } = await context.supabase.from("workspace_table_rows").upsert(rows, { onConflict: "id" });
  if (error) return { error: formatSupabaseError(error.message) };
  return { success: true };
}

export async function deleteWorkspaceRowsAction(tableId: string, rowIds: string[]): Promise<WorkspaceActionResult> {
  const contextResult = await getActionContext();
  if (!contextResult.data) return { error: contextResult.error };
  if (!rowIds.length) return { success: true };
  if (!(await ownsWorkspace(contextResult.data, tableId))) return { error: "Table was not found." };

  const { error } = await contextResult.data.supabase
    .from("workspace_table_rows")
    .delete()
    .eq("table_id", tableId)
    .eq("user_id", contextResult.data.userId)
    .in("id", rowIds.slice(0, WORKSPACE_SAVE_BATCH_SIZE));
  if (error) return { error: formatSupabaseError(error.message) };
  return { success: true };
}

export async function createCsvTradingAccountAction(accountName: string): Promise<WorkspaceActionResult<{ accountId: string }>> {
  const contextResult = await getActionContext();
  if (!contextResult.data) return { error: contextResult.error };
  const cleanName = accountName.trim().slice(0, 120);
  if (!cleanName) return { error: "CSV account name is required." };

  const existing = await contextResult.data.supabase
    .from("trading_accounts")
    .select("id")
    .eq("user_id", contextResult.data.userId)
    .eq("provider", "csv")
    .eq("account_name", cleanName)
    .maybeSingle();
  if (existing.data) return { success: true, data: { accountId: existing.data.id } };

  const { data, error } = await contextResult.data.supabase
    .from("trading_accounts")
    .insert({ user_id: contextResult.data.userId, provider: "csv", account_name: cleanName, account_type: "import", status: "active", metadata: {} })
    .select("id")
    .single();
  if (error || !data) return { error: error ? formatSupabaseError(error.message) : "Unable to create CSV account." };
  return { success: true, data: { accountId: data.id } };
}

export async function createImportWorkspaceAction(input: CreateImportWorkspaceInput): Promise<WorkspaceActionResult<{ tableId: string; batchId: string }>> {
  const contextResult = await getActionContext();
  if (!contextResult.data) return { error: contextResult.error };
  const context = contextResult.data;

  if (!input.columns.length || input.columns.length > MAX_WORKSPACE_COLUMNS) return { error: `Import files must contain 1-${MAX_WORKSPACE_COLUMNS} columns.` };
  if (!input.rows.length || input.rows.length > MAX_WORKSPACE_ROWS) return { error: `Import files must contain 1-${MAX_WORKSPACE_ROWS.toLocaleString()} data rows.` };
  if (JSON.stringify(input.rows).length > MAX_WORKSPACE_FILE_BYTES) return { error: "Import data must be 5 MB or smaller." };

  let accountId = input.accountId ?? null;
  if (!accountId && input.newAccountName) {
    const accountResult = await createCsvTradingAccountAction(input.newAccountName);
    if (!accountResult.data) return { error: accountResult.error };
    accountId = accountResult.data.accountId;
  }
  if (!accountId) return { error: "Choose or create a CSV trading account." };

  const account = await context.supabase
    .from("trading_accounts")
    .select("id")
    .eq("id", accountId)
    .eq("user_id", context.userId)
    .eq("provider", "csv")
    .maybeSingle();
  if (!account.data) return { error: "CSV account was not found." };

  const name = input.name.trim().slice(0, 120) || `Trade Import ${new Date().toLocaleDateString("en-CA")}`;
  const { data: table, error: tableError } = await context.supabase
    .from("workspace_tables")
    .insert({ user_id: context.userId, name, kind: "trade_import", columns_json: input.columns, settings_json: { sourceFormat: input.sourceFormat } })
    .select("id")
    .single();
  if (tableError || !table) return { error: tableError ? formatSupabaseError(tableError.message) : "Unable to create import workspace." };

  try {
    for (let index = 0; index < input.rows.length; index += WORKSPACE_SAVE_BATCH_SIZE) {
      const chunk = input.rows.slice(index, index + WORKSPACE_SAVE_BATCH_SIZE).map((row, offset) => ({
        table_id: table.id,
        user_id: context.userId,
        position: index + offset,
        data_json: row,
        validation_status: "draft",
        validation_errors: [],
      }));
      const { error } = await context.supabase.from("workspace_table_rows").insert(chunk);
      if (error) throw new Error(formatSupabaseError(error.message));
    }

    const { data: batch, error: batchError } = await context.supabase
      .from("trade_import_batches")
      .insert({
        user_id: context.userId,
        workspace_table_id: table.id,
        trading_account_id: accountId,
        filename: input.filename?.slice(0, 255) || null,
        source_format: input.sourceFormat,
        status: "draft",
        total_rows: input.rows.length,
      })
      .select("id")
      .single();
    if (batchError || !batch) throw new Error(batchError ? formatSupabaseError(batchError.message) : "Unable to create import batch.");

    revalidatePath("/data-workspace");
    return { success: true, data: { tableId: table.id, batchId: batch.id } };
  } catch (error) {
    await context.supabase.from("workspace_tables").delete().eq("id", table.id).eq("user_id", context.userId);
    return { error: safeError(error, "Unable to stage import rows.") };
  }
}

export async function validateImportBatchAction(batchId: string, mapping: TradeImportMapping): Promise<WorkspaceActionResult<{ validRows: number; invalidRows: number }>> {
  const contextResult = await getActionContext();
  if (!contextResult.data) return { error: contextResult.error };
  const context = contextResult.data;
  const mappingError = validateRequiredMapping(mapping);
  if (mappingError) return { error: mappingError };

  const batchResult = await getOwnedBatch(context, batchId);
  if (!batchResult.data?.workspace_table_id) return { error: batchResult.error ?? "Import workspace was not found." };
  const { data: rows, error: rowsError } = await context.supabase
    .from("workspace_table_rows")
    .select("id,table_id,user_id,position,data_json,validation_status,validation_errors,created_at,updated_at")
    .eq("table_id", batchResult.data.workspace_table_id)
    .eq("user_id", context.userId)
    .order("position", { ascending: true })
    .limit(MAX_WORKSPACE_ROWS);
  if (rowsError) return { error: formatSupabaseError(rowsError.message) };

  let validRows = 0;
  let invalidRows = 0;
  const updates = (rows ?? []).map((row) => {
    const validation = validateTradeImportRow(row.data_json, mapping);
    if (validation.valid) validRows += 1;
    else invalidRows += 1;
    return {
      id: row.id,
      table_id: row.table_id,
      user_id: context.userId,
      position: row.position,
      data_json: row.data_json,
      validation_status: validation.valid ? "valid" : "invalid",
      validation_errors: validation.errors,
      updated_at: new Date().toISOString(),
    };
  });

  for (let index = 0; index < updates.length; index += WORKSPACE_SAVE_BATCH_SIZE) {
    const { error } = await context.supabase.from("workspace_table_rows").upsert(updates.slice(index, index + WORKSPACE_SAVE_BATCH_SIZE), { onConflict: "id" });
    if (error) return { error: formatSupabaseError(error.message) };
  }

  const { error: batchError } = await context.supabase
    .from("trade_import_batches")
    .update({ mapping_json: mapping, valid_rows: validRows, invalid_rows: invalidRows, status: "validated", next_position: 0, last_error: null, updated_at: new Date().toISOString() })
    .eq("id", batchId)
    .eq("user_id", context.userId);
  if (batchError) return { error: formatSupabaseError(batchError.message) };
  revalidatePath(`/data-workspace/${batchResult.data.workspace_table_id}`);
  return { success: true, data: { validRows, invalidRows } };
}

export async function processNextImportChunkAction(batchId: string): Promise<WorkspaceActionResult<{ status: TradeImportBatch["status"]; importedCount: number; skippedCount: number; hasMore: boolean }>> {
  const contextResult = await getActionContext();
  if (!contextResult.data) return { error: contextResult.error };
  const context = contextResult.data;
  const batchResult = await getOwnedBatch(context, batchId);
  if (!batchResult.data?.workspace_table_id || !batchResult.data.trading_account_id) return { error: batchResult.error ?? "Import batch is incomplete." };
  const batch = batchResult.data;
  if (!["validated", "importing", "failed"].includes(batch.status)) return { error: `Import cannot run while batch is ${batch.status}.` };
  const mappingError = validateRequiredMapping(batch.mapping_json);
  if (mappingError) return { error: mappingError };

  const { data: rows, error: rowsError } = await context.supabase
    .from("workspace_table_rows")
    .select("id,table_id,user_id,position,data_json,validation_status,validation_errors,created_at,updated_at")
    .eq("table_id", batch.workspace_table_id)
    .eq("user_id", context.userId)
    .eq("validation_status", "valid")
    .gte("position", batch.next_position)
    .order("position", { ascending: true })
    .limit(IMPORT_CHUNK_SIZE);
  if (rowsError) return { error: formatSupabaseError(rowsError.message) };

  if (!rows?.length) {
    await context.supabase.from("trade_import_batches").update({ status: "completed", completed_at: new Date().toISOString(), last_error: null }).eq("id", batchId).eq("user_id", context.userId);
    revalidatePath("/journal");
    revalidatePath("/dashboard");
    revalidatePath(`/data-workspace/${batch.workspace_table_id}`);
    return { success: true, data: { status: "completed", importedCount: batch.imported_count, skippedCount: batch.skipped_count, hasMore: false } };
  }

  try {
    await context.supabase.from("trade_import_batches").update({ status: "importing", last_error: null, updated_at: new Date().toISOString() }).eq("id", batchId).eq("user_id", context.userId);
    const prepared = (rows as WorkspaceTableRow[]).map((row) => ({ row, validation: validateTradeImportRow(row.data_json, batch.mapping_json) }));
    const invalid = prepared.filter((item) => !item.validation.valid);
    if (invalid.length) {
      const invalidRows = invalid.map((item) => ({ ...item.row, validation_status: "invalid", validation_errors: item.validation.errors, updated_at: new Date().toISOString() }));
      await context.supabase.from("workspace_table_rows").upsert(invalidRows, { onConflict: "id" });
    }

    const valid = prepared.filter((item) => item.validation.valid && item.validation.trade);
    const hashed = await Promise.all(valid.map(async (item) => ({ ...item, hash: await createImportRowHash(item.validation.trade!) })));
    const hashes = hashed.map((item) => item.hash);
    const existingHashes = new Set<string>();
    if (hashes.length) {
      const { data: existing, error } = await context.supabase
        .from("trades")
        .select("import_row_hash")
        .eq("user_id", context.userId)
        .eq("trading_account_id", batch.trading_account_id)
        .in("import_row_hash", hashes);
      if (error) throw new Error(formatSupabaseError(error.message));
      (existing ?? []).forEach((trade) => { if (trade.import_row_hash) existingHashes.add(trade.import_row_hash); });
    }

    const duplicates = hashed.filter((item) => existingHashes.has(item.hash));
    const newRows = hashed.filter((item) => !existingHashes.has(item.hash));
    const tradePayloads = newRows.map((item) => ({
      user_id: context.userId,
      trading_account_id: batch.trading_account_id,
      source: "csv",
      import_batch_id: batch.id,
      import_row_hash: item.hash,
      ...item.validation.trade!,
    }));

    let inserted: Array<{ id: string; import_row_hash: string | null }> = [];
    if (tradePayloads.length) {
      const insertResult = await context.supabase.from("trades").insert(tradePayloads).select("id,import_row_hash");
      if (insertResult.error) throw new Error(formatSupabaseError(insertResult.error.message));
      inserted = insertResult.data ?? [];
    }

    const insertedByHash = new Map(inserted.map((trade) => [trade.import_row_hash, trade.id]));
    const journals = newRows.flatMap((item) => {
      const tradeId = insertedByHash.get(item.hash);
      const journal = item.validation.journal;
      const hasJournal = journal && Object.values(journal).some((value) => Array.isArray(value) ? value.length > 0 : Boolean(value));
      return tradeId && hasJournal ? [{ trade_id: tradeId, user_id: context.userId, ...journal }] : [];
    });
    if (journals.length) {
      const journalResult = await context.supabase.from("trade_journal_entries").insert(journals);
      if (journalResult.error) throw new Error(formatSupabaseError(journalResult.error.message));
    }

    const importedIds = newRows.map((item) => item.row.id);
    const duplicateIds = duplicates.map((item) => item.row.id);
    if (importedIds.length) await context.supabase.from("workspace_table_rows").update({ validation_status: "imported", updated_at: new Date().toISOString() }).in("id", importedIds).eq("user_id", context.userId);
    if (duplicateIds.length) await context.supabase.from("workspace_table_rows").update({ validation_status: "skipped", validation_errors: ["Duplicate trade skipped."], updated_at: new Date().toISOString() }).in("id", duplicateIds).eq("user_id", context.userId);

    const nextPosition = Math.max(...rows.map((row) => row.position)) + 1;
    const importedCount = batch.imported_count + inserted.length;
    const skippedCount = batch.skipped_count + duplicates.length;
    const hasMoreResult = await context.supabase
      .from("workspace_table_rows")
      .select("id", { count: "exact", head: true })
      .eq("table_id", batch.workspace_table_id)
      .eq("user_id", context.userId)
      .eq("validation_status", "valid")
      .gte("position", nextPosition);
    const hasMore = (hasMoreResult.count ?? 0) > 0;
    const status = hasMore ? "importing" : "completed";
    const { error: updateError } = await context.supabase
      .from("trade_import_batches")
      .update({ status, next_position: nextPosition, imported_count: importedCount, skipped_count: skippedCount, error_count: batch.error_count + invalid.length, completed_at: hasMore ? null : new Date().toISOString(), last_error: null, updated_at: new Date().toISOString() })
      .eq("id", batch.id)
      .eq("user_id", context.userId);
    if (updateError) throw new Error(formatSupabaseError(updateError.message));

    revalidatePath("/journal");
    revalidatePath("/dashboard");
    revalidatePath(`/data-workspace/${batch.workspace_table_id}`);
    return { success: true, data: { status, importedCount, skippedCount, hasMore } };
  } catch (error) {
    const message = safeError(error, "Import chunk failed.").slice(0, 300);
    await context.supabase.from("trade_import_batches").update({ status: "failed", last_error: message, updated_at: new Date().toISOString() }).eq("id", batch.id).eq("user_id", context.userId);
    return { error: message };
  }
}

export async function rollbackImportBatchAction(batchId: string): Promise<WorkspaceActionResult> {
  const contextResult = await getActionContext();
  if (!contextResult.data) return { error: contextResult.error };
  const context = contextResult.data;
  const batchResult = await getOwnedBatch(context, batchId);
  if (!batchResult.data?.workspace_table_id) return { error: batchResult.error ?? "Import batch was not found." };

  const { error: deleteError } = await context.supabase.from("trades").delete().eq("user_id", context.userId).eq("import_batch_id", batchId);
  if (deleteError) return { error: formatSupabaseError(deleteError.message) };
  await context.supabase
    .from("workspace_table_rows")
    .update({ validation_status: "valid", validation_errors: [], updated_at: new Date().toISOString() })
    .eq("table_id", batchResult.data.workspace_table_id)
    .eq("user_id", context.userId)
    .in("validation_status", ["imported", "skipped"]);
  const { error: batchError } = await context.supabase
    .from("trade_import_batches")
    .update({ status: "rolled_back", imported_count: 0, skipped_count: 0, next_position: 0, rolled_back_at: new Date().toISOString(), completed_at: null, last_error: null, updated_at: new Date().toISOString() })
    .eq("id", batchId)
    .eq("user_id", context.userId);
  if (batchError) return { error: formatSupabaseError(batchError.message) };

  revalidatePath("/journal");
  revalidatePath("/dashboard");
  revalidatePath(`/data-workspace/${batchResult.data.workspace_table_id}`);
  return { success: true };
}
