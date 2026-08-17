"use client";

import { useMemo, useState, useTransition } from "react";
import { LoaderCircle, Play, RotateCcw, ShieldCheck } from "lucide-react";
import {
  processNextImportChunkAction,
  rollbackImportBatchAction,
  validateImportBatchAction,
} from "@/app/data-workspace/actions";
import { suggestTradeImportMapping, tradeImportFields } from "@/lib/data-workspace/import-validation";
import { IMPORT_CHUNK_SIZE, type TradeImportBatch, type TradeImportMapping, type WorkspaceColumn } from "@/lib/data-workspace/types";

interface ImportControlsProps {
  batch: TradeImportBatch;
  columns: WorkspaceColumn[];
}

export function ImportControls({ batch, columns }: ImportControlsProps) {
  const [mapping, setMapping] = useState<TradeImportMapping>(() => Object.keys(batch.mapping_json ?? {}).length ? batch.mapping_json : suggestTradeImportMapping(columns));
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(batch.last_error);
  const [status, setStatus] = useState(batch.status);
  const [counts, setCounts] = useState({ valid: batch.valid_rows, invalid: batch.invalid_rows, imported: batch.imported_count, skipped: batch.skipped_count });
  const [confirmRollback, setConfirmRollback] = useState(false);
  const [pending, startTransition] = useTransition();
  const usedColumns = useMemo(() => new Set(Object.values(mapping).filter(Boolean)), [mapping]);

  function validate() {
    setError(null);
    startTransition(async () => {
      const result = await validateImportBatchAction(batch.id, mapping);
      if (!result.data) return setError(result.error ?? "Validation failed.");
      setStatus("validated");
      setCounts((current) => ({ ...current, valid: result.data!.validRows, invalid: result.data!.invalidRows }));
      setMessage(`${result.data.validRows} valid rows ready to import.`);
    });
  }

  function runImport() {
    setError(null);
    startTransition(async () => {
      let hasMore = true;
      let iterations = 0;
      const maxIterations = Math.ceil(Math.max(counts.valid, batch.total_rows) / IMPORT_CHUNK_SIZE) + 1;
      while (hasMore && iterations < maxIterations) {
        const result = await processNextImportChunkAction(batch.id);
        if (!result.data) {
          setStatus("failed");
          setError(result.error ?? "Import failed.");
          return;
        }
        hasMore = result.data.hasMore;
        setStatus(result.data.status);
        setCounts((current) => ({ ...current, imported: result.data!.importedCount, skipped: result.data!.skippedCount }));
        iterations += 1;
      }
      setMessage("Import completed. Journal and Dashboard now include the imported trades.");
    });
  }

  function rollback() {
    setError(null);
    startTransition(async () => {
      const result = await rollbackImportBatchAction(batch.id);
      if (!result.success) return setError(result.error ?? "Rollback failed.");
      setStatus("rolled_back");
      setCounts((current) => ({ ...current, imported: 0, skipped: 0 }));
      setConfirmRollback(false);
      setMessage("Import rolled back. The staging table and CSV account were kept.");
    });
  }

  return (
    <section className="glass-panel rounded-2xl p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4" /><h2 className="font-semibold">Trade Mapping & Import</h2></div>
          <p className="mt-1 text-sm text-zinc-500">Server validation repeats every client check before a trade is created.</p>
        </div>
        <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-xs capitalize text-zinc-300">{status.replace("_", " ")}</span>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {tradeImportFields.map((field) => (
          <label key={field.value} className="space-y-1.5">
            <span className="text-[11px] text-zinc-500">{field.label}{field.required ? " *" : ""}</span>
            <select
              value={mapping[field.value] ?? ""}
              onChange={(event) => setMapping((current) => ({ ...current, [field.value]: event.target.value || undefined }))}
              className="h-9 w-full rounded-lg border border-white/10 bg-zinc-950 px-2 text-xs outline-none focus:border-white/30"
            >
              <option value="">Not mapped</option>
              {columns.map((column) => <option key={column.key} value={column.key} disabled={usedColumns.has(column.key) && mapping[field.value] !== column.key}>{column.name}</option>)}
            </select>
          </label>
        ))}
      </div>
      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[['Valid', counts.valid], ['Invalid', counts.invalid], ['Imported', counts.imported], ['Skipped', counts.skipped]].map(([label, value]) => (
          <div key={String(label)} className="glass-subtle rounded-xl p-3"><div className="text-[11px] text-zinc-500">{label}</div><div className="mt-1 text-lg font-semibold">{value}</div></div>
        ))}
      </div>
      {message ? <p className="mt-4 rounded-xl border border-emerald-300/15 bg-emerald-400/[0.08] p-3 text-sm text-emerald-200">{message}</p> : null}
      {error ? <p className="mt-4 rounded-xl border border-rose-300/20 bg-rose-400/10 p-3 text-sm text-rose-200">{error}</p> : null}
      <div className="mt-4 flex flex-wrap gap-2">
        <button onClick={validate} disabled={pending || status === "completed"} className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/10 px-4 text-sm disabled:opacity-50">
          {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />} Validate Rows
        </button>
        <button onClick={runImport} disabled={pending || counts.valid === 0 || !["validated", "failed", "importing"].includes(status)} className="inline-flex h-10 items-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-black disabled:opacity-50">
          <Play className="h-4 w-4" />{status === "failed" || status === "importing" ? "Resume Import" : "Import Valid Rows"}
        </button>
        <button onClick={() => setConfirmRollback(true)} disabled={pending || counts.imported === 0 || status === "rolled_back"} className="inline-flex h-10 items-center gap-2 rounded-xl border border-rose-300/20 px-4 text-sm text-rose-200 disabled:opacity-40">
          <RotateCcw className="h-4 w-4" />Rollback Import
        </button>
      </div>
      {confirmRollback ? (
        <div className="mt-4 flex flex-col gap-3 rounded-xl border border-rose-300/20 bg-rose-400/[0.07] p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-rose-100">Only trades created by this batch will be deleted. The staging table and CSV account will remain.</p>
          <div className="flex shrink-0 gap-2">
            <button onClick={() => setConfirmRollback(false)} className="h-9 rounded-lg border border-white/10 px-3 text-xs">Cancel</button>
            <button onClick={rollback} disabled={pending} className="h-9 rounded-lg bg-rose-200 px-3 text-xs font-semibold text-rose-950">Confirm Rollback</button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
