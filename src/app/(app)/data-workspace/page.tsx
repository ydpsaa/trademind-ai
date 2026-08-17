import Link from "next/link";
import { Database, FileSpreadsheet, Plus, TableProperties, Upload } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { GlassCard } from "@/components/ui/GlassCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatSupabaseError } from "@/lib/supabase/errors";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { TradeImportBatch, WorkspaceTable } from "@/lib/data-workspace/types";

export default async function DataWorkspacePage() {
  const supabase = await createSupabaseServerClient();
  let tables: WorkspaceTable[] = [];
  let batches: TradeImportBatch[] = [];
  let error: string | null = null;

  if (!supabase) {
    error = "Data service is not configured.";
  } else {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      error = "You must be signed in.";
    } else {
      const [tablesResult, batchesResult] = await Promise.all([
        supabase
          .from("workspace_tables")
          .select("id,user_id,name,description,kind,columns_json,settings_json,created_at,updated_at")
          .eq("user_id", userData.user.id)
          .order("updated_at", { ascending: false })
          .limit(100),
        supabase
          .from("trade_import_batches")
          .select("id,user_id,workspace_table_id,trading_account_id,filename,source_format,status,mapping_json,next_position,total_rows,valid_rows,invalid_rows,imported_count,skipped_count,error_count,last_error,created_at,updated_at,completed_at,rolled_back_at")
          .eq("user_id", userData.user.id)
          .order("created_at", { ascending: false })
          .limit(10),
      ]);
      const queryError = tablesResult.error?.message ?? batchesResult.error?.message;
      error = queryError ? formatSupabaseError(queryError) : null;
      tables = (tablesResult.data ?? []) as WorkspaceTable[];
      batches = (batchesResult.data ?? []) as TradeImportBatch[];
    }
  }

  const customCount = tables.filter((table) => table.kind === "custom").length;
  const completedImports = batches.filter((batch) => batch.status === "completed").length;
  const importedTrades = batches.reduce((total, batch) => total + batch.imported_count, 0);
  const metrics = [
    { label: "Workspace Tables", value: tables.length, icon: TableProperties },
    { label: "Custom Tables", value: customCount, icon: Database },
    { label: "Completed Imports", value: completedImports, icon: FileSpreadsheet },
    { label: "Imported Trades", value: importedTrades, icon: Upload },
  ];

  return (
    <AppShell title="Data Workspace" subtitle="Import real trades and organize structured trading research.">
      <div className="space-y-4">
        <header className="glass-panel rounded-2xl p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div><div className="flex flex-wrap items-center gap-3"><h1 className="text-2xl font-semibold">Data Workspace</h1><StatusBadge>Real Data Tools</StatusBadge></div><p className="mt-2 text-sm text-zinc-400">CSV/XLSX trade imports and flexible tables for plans, research, and risk tracking.</p></div>
            <div className="flex flex-wrap gap-2"><Link href="/data-workspace/new" className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/10 px-4 text-sm"><Plus className="h-4 w-4" />New Table</Link><Link href="/data-workspace/import" className="inline-flex h-10 items-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-black"><Upload className="h-4 w-4" />Import Trades</Link></div>
          </div>
        </header>

        {error ? <GlassCard className="border-rose-300/20 bg-rose-400/10 p-4 text-sm text-rose-200">{error}</GlassCard> : null}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map(({ label, value, icon: Icon }) => (
            <GlassCard key={label} className="p-4"><Icon className="h-4 w-4 text-zinc-500" /><div className="mt-4 text-2xl font-semibold">{value}</div><div className="mt-1 text-xs text-zinc-500">{label}</div></GlassCard>
          ))}
        </div>

        <section>
          <div className="mb-3 flex items-center justify-between"><h2 className="font-semibold">Tables</h2><span className="text-xs text-zinc-600">Autosaved, private to your account</span></div>
          {tables.length ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {tables.map((table) => (
                <Link href={`/data-workspace/${table.id}`} key={table.id} className="glass-panel group rounded-2xl p-5 transition hover:border-white/25">
                  <div className="flex items-start justify-between gap-3"><div className="grid h-9 w-9 place-items-center rounded-xl bg-white/[0.08]">{table.kind === "trade_import" ? <FileSpreadsheet className="h-4 w-4" /> : <TableProperties className="h-4 w-4" />}</div><span className="rounded-full border border-white/10 px-2 py-1 text-[10px] uppercase tracking-[0.1em] text-zinc-500">{table.kind === "trade_import" ? "Trade Import" : "Custom"}</span></div>
                  <h3 className="mt-5 font-medium text-white group-hover:text-zinc-200">{table.name}</h3><p className="mt-1 line-clamp-2 min-h-10 text-xs leading-5 text-zinc-500">{table.description || `${table.columns_json.length} structured columns`}</p><div className="mt-4 text-[11px] text-zinc-600">Updated {new Date(table.updated_at).toLocaleDateString()}</div>
                </Link>
              ))}
            </div>
          ) : (
            <GlassCard className="p-8 text-center"><TableProperties className="mx-auto h-7 w-7 text-zinc-600" /><h3 className="mt-4 font-medium">No workspace tables yet</h3><p className="mx-auto mt-2 max-w-md text-sm text-zinc-500">Create a planning table or import a real trade export. No sample rows are added.</p><div className="mt-5 flex justify-center gap-2"><Link href="/data-workspace/new" className="rounded-xl border border-white/10 px-4 py-2 text-sm">Create Table</Link><Link href="/data-workspace/import" className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black">Import Trades</Link></div></GlassCard>
          )}
        </section>

        <section>
          <h2 className="mb-3 font-semibold">Recent Imports</h2>
          <GlassCard className="overflow-hidden">
            {batches.length ? <div className="divide-y divide-white/[0.07]">{batches.map((batch) => <Link key={batch.id} href={batch.workspace_table_id ? `/data-workspace/${batch.workspace_table_id}` : "/data-workspace"} className="grid gap-3 p-4 transition hover:bg-white/[0.03] sm:grid-cols-[minmax(0,1fr)_110px_110px_130px] sm:items-center"><div><div className="text-sm font-medium">{batch.filename || "Clipboard import"}</div><div className="mt-1 text-xs text-zinc-600">{batch.total_rows} staged rows · {batch.source_format.toUpperCase()}</div></div><div className="text-xs capitalize text-zinc-400">{batch.status.replace("_", " ")}</div><div className="text-xs text-zinc-400">{batch.imported_count} imported</div><div className="text-xs text-zinc-600 sm:text-right">{new Date(batch.created_at).toLocaleString()}</div></Link>)}</div> : <div className="p-6 text-sm text-zinc-500">No trade imports yet.</div>}
          </GlassCard>
        </section>
      </div>
    </AppShell>
  );
}
