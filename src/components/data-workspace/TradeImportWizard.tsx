"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileSpreadsheet, LoaderCircle, Upload, ClipboardPaste, ShieldCheck } from "lucide-react";
import { createImportWorkspaceAction } from "@/app/data-workspace/actions";
import { parseClipboardText, parseDelimitedText, parseSpreadsheetMatrix, validateWorkspaceFile, type ParsedWorkspaceData } from "@/lib/data-workspace/parsers";
import type { ImportSourceFormat } from "@/lib/data-workspace/types";
import type { TradingAccount } from "@/lib/accounts/types";

interface ExcelSheet {
  sheet: string;
  data: unknown[][];
}

interface TradeImportWizardProps {
  accounts: TradingAccount[];
}

export function TradeImportWizard({ accounts }: TradeImportWizardProps) {
  const router = useRouter();
  const csvAccounts = accounts.filter((account) => account.provider === "csv");
  const [mode, setMode] = useState<"file" | "clipboard">("file");
  const [sourceFormat, setSourceFormat] = useState<ImportSourceFormat>("csv");
  const [filename, setFilename] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParsedWorkspaceData | null>(null);
  const [sheets, setSheets] = useState<ExcelSheet[]>([]);
  const [sheetName, setSheetName] = useState("");
  const [clipboard, setClipboard] = useState("");
  const [accountValue, setAccountValue] = useState(csvAccounts[0]?.id ?? "new");
  const [accountName, setAccountName] = useState("CSV Import");
  const [workspaceName, setWorkspaceName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const previewRows = useMemo(() => parsed?.rows.slice(0, 8) ?? [], [parsed]);

  async function readFile(file: File) {
    setError(null);
    const validationError = validateWorkspaceFile(file);
    if (validationError) return setError(validationError);
    setFilename(file.name);
    setWorkspaceName(file.name.replace(/\.(csv|xlsx)$/i, ""));
    if (file.name.toLowerCase().endsWith(".csv")) {
      setSourceFormat("csv");
      setSheets([]);
      setParsed(parseDelimitedText(await file.text()));
      return;
    }

    try {
      setSourceFormat("xlsx");
      const { default: readExcelFile } = await import("read-excel-file/browser");
      const workbook = await readExcelFile(file) as ExcelSheet[];
      setSheets(workbook);
      const first = workbook[0];
      setSheetName(first?.sheet ?? "");
      setParsed(first ? parseSpreadsheetMatrix(first.data) : null);
    } catch {
      setError("Unable to read this XLSX file.");
    }
  }

  function selectSheet(name: string) {
    setSheetName(name);
    const sheet = sheets.find((item) => item.sheet === name);
    setParsed(sheet ? parseSpreadsheetMatrix(sheet.data) : null);
  }

  function parsePaste() {
    setError(null);
    setSourceFormat("clipboard");
    setFilename(null);
    setParsed(parseClipboardText(clipboard));
    if (!workspaceName) setWorkspaceName("Pasted Trade Import");
  }

  function stageImport() {
    if (!parsed?.rows.length) return setError("Load a CSV/XLSX file or paste a table first.");
    if (!workspaceName.trim()) return setError("Workspace name is required.");
    if (accountValue === "new" && !accountName.trim()) return setError("CSV account name is required.");
    setError(null);
    startTransition(async () => {
      const result = await createImportWorkspaceAction({
        name: workspaceName,
        filename: filename ? `${filename}${sheetName ? ` · ${sheetName}` : ""}` : null,
        sourceFormat,
        columns: parsed.columns,
        rows: parsed.rows,
        accountId: accountValue === "new" ? null : accountValue,
        newAccountName: accountValue === "new" ? accountName : null,
      });
      if (!result.data) return setError(result.error ?? "Unable to stage import.");
      router.push(`/data-workspace/${result.data.tableId}`);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <section className="glass-panel rounded-2xl p-5">
        <div className="flex gap-2">
          <button onClick={() => setMode("file")} className={`inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm ${mode === "file" ? "bg-white text-black" : "border border-white/10 text-zinc-300"}`}><Upload className="h-4 w-4" />CSV / XLSX</button>
          <button onClick={() => setMode("clipboard")} className={`inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm ${mode === "clipboard" ? "bg-white text-black" : "border border-white/10 text-zinc-300"}`}><ClipboardPaste className="h-4 w-4" />Paste Range</button>
        </div>
        {mode === "file" ? (
          <div className="mt-5">
            <label className="grid min-h-44 cursor-pointer place-items-center rounded-2xl border border-dashed border-white/15 bg-black/20 p-6 text-center transition hover:border-white/30 hover:bg-white/[0.03]">
              <div><FileSpreadsheet className="mx-auto h-7 w-7 text-zinc-400" /><div className="mt-3 text-sm font-medium">Choose CSV or XLSX</div><p className="mt-1 text-xs text-zinc-600">Up to 5 MB, 5,000 rows, 50 columns</p></div>
              <input type="file" accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; if (file) void readFile(file); }} />
            </label>
            {sheets.length > 1 ? <label className="mt-4 block space-y-2"><span className="text-xs text-zinc-500">Worksheet</span><select value={sheetName} onChange={(event) => selectSheet(event.target.value)} className="h-10 w-full max-w-sm rounded-xl border border-white/10 bg-zinc-950 px-3 text-sm">{sheets.map((sheet) => <option key={sheet.sheet} value={sheet.sheet}>{sheet.sheet}</option>)}</select></label> : null}
          </div>
        ) : (
          <div className="mt-5 space-y-3">
            <textarea value={clipboard} onChange={(event) => setClipboard(event.target.value)} rows={10} placeholder="Paste rows copied from Excel, Google Sheets, or Notion" className="w-full rounded-2xl border border-white/10 bg-black/30 p-4 font-mono text-xs outline-none focus:border-white/30" />
            <button onClick={parsePaste} className="h-10 rounded-xl border border-white/10 bg-white/10 px-4 text-sm">Parse Pasted Data</button>
          </div>
        )}
      </section>

      {parsed ? (
        <section className="glass-panel rounded-2xl p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><h2 className="font-semibold">Preview</h2><p className="mt-1 text-sm text-zinc-500">First row is used as column headers. Trades are not created until you validate and confirm import.</p></div>
            <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-zinc-400">{parsed.rows.length.toLocaleString()} rows · {parsed.columns.length} columns</span>
          </div>
          {parsed.warnings.length ? <div className="mt-4 rounded-xl border border-amber-300/15 bg-amber-400/[0.07] p-3 text-xs text-amber-100">{parsed.warnings.join(" ")}</div> : null}
          <div className="mt-4 overflow-auto rounded-xl border border-white/10">
            <table className="min-w-full text-left text-xs"><thead className="bg-white/[0.05] text-zinc-400"><tr>{parsed.columns.map((column) => <th key={column.key} className="whitespace-nowrap px-3 py-2 font-medium">{column.name}</th>)}</tr></thead><tbody>{previewRows.map((row, index) => <tr key={index} className="border-t border-white/[0.06]">{parsed.columns.map((column) => <td key={column.key} className="max-w-56 truncate px-3 py-2 text-zinc-300">{String(row[column.key] ?? "")}</td>)}</tr>)}</tbody></table>
          </div>
        </section>
      ) : null}

      <section className="glass-panel rounded-2xl p-5">
        <div className="grid gap-4 lg:grid-cols-3">
          <label className="space-y-2"><span className="text-xs text-zinc-500">Workspace name</span><input value={workspaceName} onChange={(event) => setWorkspaceName(event.target.value)} placeholder="August broker export" className="h-10 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-sm" /></label>
          <label className="space-y-2"><span className="text-xs text-zinc-500">CSV trading account</span><select value={accountValue} onChange={(event) => setAccountValue(event.target.value)} className="h-10 w-full rounded-xl border border-white/10 bg-zinc-950 px-3 text-sm"><option value="new">Create new CSV account</option>{csvAccounts.map((account) => <option key={account.id} value={account.id}>{account.account_name || "CSV Account"}</option>)}</select></label>
          {accountValue === "new" ? <label className="space-y-2"><span className="text-xs text-zinc-500">New account name</span><input value={accountName} onChange={(event) => setAccountName(event.target.value)} maxLength={120} className="h-10 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-sm" /></label> : <div className="glass-subtle rounded-xl p-3 text-xs leading-5 text-zinc-500">Imported trades will be scoped to the selected account and available in Dashboard and Journal filters.</div>}
        </div>
        {error ? <p className="mt-4 rounded-xl border border-rose-300/20 bg-rose-400/10 p-3 text-sm text-rose-200">{error}</p> : null}
        <div className="mt-5 flex items-center justify-between gap-4">
          <p className="max-w-xl text-xs leading-5 text-zinc-600"><ShieldCheck className="mr-1 inline h-3.5 w-3.5" />Staging is private to your account. Existing trades are never overwritten.</p>
          <button onClick={stageImport} disabled={pending || !parsed?.rows.length} className="inline-flex h-11 shrink-0 items-center gap-2 rounded-xl bg-white px-5 text-sm font-semibold text-black disabled:opacity-50">{pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}Continue to Mapping</button>
        </div>
      </section>
    </div>
  );
}
