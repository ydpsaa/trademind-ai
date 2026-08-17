import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileSpreadsheet, TableProperties } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { ImportControls } from "@/components/data-workspace/ImportControls";
import { WorkspaceGridLoader } from "@/components/data-workspace/WorkspaceGridLoader";
import { WorkspaceTableMetadata } from "@/components/data-workspace/WorkspaceTableMetadata";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { TradeImportBatch, WorkspaceTable, WorkspaceTableRow } from "@/lib/data-workspace/types";

interface WorkspaceDetailPageProps { params: Promise<{ tableId: string }> }

export default async function WorkspaceDetailPage({ params }: WorkspaceDetailPageProps) {
  const { tableId } = await params;
  const supabase = await createSupabaseServerClient();
  if (!supabase) notFound();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) notFound();

  const [tableResult, rowsResult, batchResult] = await Promise.all([
    supabase.from("workspace_tables").select("id,user_id,name,description,kind,columns_json,settings_json,created_at,updated_at").eq("id", tableId).eq("user_id", userData.user.id).maybeSingle(),
    supabase.from("workspace_table_rows").select("id,table_id,user_id,position,data_json,validation_status,validation_errors,created_at,updated_at").eq("table_id", tableId).eq("user_id", userData.user.id).order("position", { ascending: true }).limit(5000),
    supabase.from("trade_import_batches").select("id,user_id,workspace_table_id,trading_account_id,filename,source_format,status,mapping_json,next_position,total_rows,valid_rows,invalid_rows,imported_count,skipped_count,error_count,last_error,created_at,updated_at,completed_at,rolled_back_at").eq("workspace_table_id", tableId).eq("user_id", userData.user.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  if (!tableResult.data) notFound();
  const table = tableResult.data as WorkspaceTable;
  const rows = (rowsResult.data ?? []) as WorkspaceTableRow[];
  const batch = batchResult.data as TradeImportBatch | null;

  return <AppShell title={table.name} subtitle={table.kind === "trade_import" ? "Staged trade import" : "Custom data table"}><div className="space-y-4"><Link href="/data-workspace" className="inline-flex items-center gap-2 text-sm text-zinc-500 transition hover:text-white"><ArrowLeft className="h-4 w-4" />Data Workspace</Link><header className="glass-panel rounded-2xl p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex flex-wrap items-center gap-3">{table.kind === "trade_import" ? <FileSpreadsheet className="h-5 w-5" /> : <TableProperties className="h-5 w-5" />}<h1 className="text-xl font-semibold">{table.name}</h1><StatusBadge>{table.kind === "trade_import" ? "Import Staging" : "Custom Table"}</StatusBadge></div><p className="mt-2 text-sm text-zinc-500">{table.description || (table.kind === "trade_import" ? "Fix invalid rows, map columns, then import only valid trades." : "Editable workspace with autosave and multi-cell paste.")}</p><WorkspaceTableMetadata table={table} /></div><div className="text-xs text-zinc-600">{rows.length.toLocaleString()} rows · {table.columns_json.length} columns</div></div></header>{batch ? <ImportControls batch={batch} columns={table.columns_json} /> : null}<WorkspaceGridLoader table={table} initialRows={rows} /></div></AppShell>;
}
