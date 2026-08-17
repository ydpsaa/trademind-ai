"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { DataGrid, SelectColumn, renderTextEditor, type Column, type PositionChangeArgs, type SortColumn } from "react-data-grid";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Check, CircleAlert, Plus, Save, Search, Trash2 } from "lucide-react";
import {
  deleteWorkspaceRowsAction,
  deleteWorkspaceTableAction,
  saveWorkspaceRowsAction,
  updateWorkspaceColumnsAction,
} from "@/app/data-workspace/actions";
import { parseClipboardText } from "@/lib/data-workspace/parsers";
import {
  MAX_WORKSPACE_ROWS,
  WORKSPACE_SAVE_BATCH_SIZE,
  type WorkspaceCellValue,
  type WorkspaceColumn,
  type WorkspaceColumnType,
  type WorkspaceTable,
  type WorkspaceTableRow,
} from "@/lib/data-workspace/types";

type GridRow = {
  _id: string;
  _position: number;
  _status: WorkspaceTableRow["validation_status"];
  _errors: string[];
} & Record<string, WorkspaceCellValue | string[] | number>;

type SaveState = "idle" | "saving" | "saved" | "failed";

const columnTypes: WorkspaceColumnType[] = ["text", "number", "currency", "percent", "date", "datetime", "select", "checkbox", "url"];

function toGridRow(row: WorkspaceTableRow): GridRow {
  return { _id: row.id, _position: row.position, _status: row.validation_status, _errors: row.validation_errors, ...row.data_json };
}

function fromGridRow(row: GridRow, columns: WorkspaceColumn[]) {
  return {
    id: row._id,
    position: row._position,
    data_json: Object.fromEntries(columns.map((column) => [column.key, row[column.key] as WorkspaceCellValue ?? null])),
    validation_status: row._status,
    validation_errors: row._errors,
  };
}

function coercePastedValue(value: WorkspaceCellValue, type: WorkspaceColumnType): WorkspaceCellValue {
  if (type === "checkbox") return ["true", "yes", "1", "checked"].includes(String(value).trim().toLowerCase());
  if (["number", "currency", "percent"].includes(type)) {
    const parsed = Number(String(value).replace(/[,%$€£\s]/g, ""));
    return Number.isFinite(parsed) ? parsed : value;
  }
  return value;
}

interface WorkspaceGridProps {
  table: WorkspaceTable;
  initialRows: WorkspaceTableRow[];
}

export function WorkspaceGrid({ table, initialRows }: WorkspaceGridProps) {
  const router = useRouter();
  const [columns, setColumns] = useState(table.columns_json);
  const [rows, setRows] = useState<GridRow[]>(() => initialRows.map(toGridRow));
  const [selectedRows, setSelectedRows] = useState<ReadonlySet<string>>(() => new Set());
  const [sortColumns, setSortColumns] = useState<readonly SortColumn[]>([]);
  const [query, setQuery] = useState("");
  const [activeCell, setActiveCell] = useState<{ rowId: string; columnKey: string } | null>(null);
  const [selectedColumnKey, setSelectedColumnKey] = useState(columns[0]?.key ?? "");
  const [columnName, setColumnName] = useState(columns[0]?.name ?? "");
  const [columnType, setColumnType] = useState<WorkspaceColumnType>(columns[0]?.type ?? "text");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const dirtyIds = useRef(new Set<string>());
  const rowsRef = useRef(rows);

  useEffect(() => { rowsRef.current = rows; }, [rows]);

  const persistDirtyRows = useCallback(async () => {
    const ids = Array.from(dirtyIds.current);
    if (!ids.length) return;
    dirtyIds.current.clear();
    setSaveState("saving");
    const dirtyRows = rowsRef.current.filter((row) => ids.includes(row._id));
    for (let index = 0; index < dirtyRows.length; index += WORKSPACE_SAVE_BATCH_SIZE) {
      const result = await saveWorkspaceRowsAction({ tableId: table.id, rows: dirtyRows.slice(index, index + WORKSPACE_SAVE_BATCH_SIZE).map((row) => fromGridRow(row, columns)) });
      if (!result.success) {
        ids.forEach((id) => dirtyIds.current.add(id));
        setError(result.error ?? "Save failed.");
        setSaveState("failed");
        return;
      }
    }
    setError(null);
    setSaveState("saved");
  }, [columns, table.id]);

  useEffect(() => {
    if (!dirtyIds.current.size) return;
    const timer = window.setTimeout(() => void persistDirtyRows(), 800);
    return () => window.clearTimeout(timer);
  }, [rows, persistDirtyRows]);

  const visibleRows = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    let result = normalized ? rows.filter((row) => columns.some((column) => String(row[column.key] ?? "").toLowerCase().includes(normalized))) : [...rows];
    const sort = sortColumns[0];
    if (sort) {
      result = [...result].sort((left, right) => {
        const comparison = String(left[sort.columnKey] ?? "").localeCompare(String(right[sort.columnKey] ?? ""), undefined, { numeric: true });
        return sort.direction === "ASC" ? comparison : -comparison;
      });
    }
    return result;
  }, [columns, query, rows, sortColumns]);

  const gridColumns = useMemo<Column<GridRow>[]>(() => [
    SelectColumn,
    ...columns.map((column) => ({
      key: column.key,
      name: column.name,
      width: column.width ?? 180,
      minWidth: 100,
      resizable: true,
      sortable: true,
      draggable: true,
      renderEditCell: renderTextEditor,
      renderCell: ({ row }: { row: GridRow }) => {
        const value = row[column.key];
        if (column.type === "checkbox") return <span className="text-zinc-300">{value === true ? "Yes" : value === false ? "No" : ""}</span>;
        if (column.type === "url" && typeof value === "string" && /^https?:\/\//.test(value)) return <a href={value} target="_blank" rel="noreferrer" className="text-zinc-200 underline decoration-white/20 underline-offset-2">{value}</a>;
        if (column.type === "currency" && typeof value === "number") return <span>{value.toLocaleString(undefined, { style: "currency", currency: "USD" })}</span>;
        if (column.type === "percent" && value !== null && value !== undefined && value !== "") return <span>{String(value)}%</span>;
        return <span>{String(value ?? "")}</span>;
      },
    })),
  ], [columns]);

  function handleRowsChange(changedRows: GridRow[]) {
    const changedById = new Map(changedRows.map((row) => [row._id, { ...row, _status: table.kind === "trade_import" ? "draft" as const : row._status, _errors: table.kind === "trade_import" ? [] : row._errors }]));
    changedRows.forEach((row) => dirtyIds.current.add(row._id));
    setRows((current) => current.map((row) => changedById.get(row._id) ?? row));
    setSaveState("idle");
  }

  function addRow() {
    if (rows.length >= MAX_WORKSPACE_ROWS) return setError(`Tables are limited to ${MAX_WORKSPACE_ROWS.toLocaleString()} rows.`);
    const row = { _id: crypto.randomUUID(), _position: rows.length ? Math.max(...rows.map((item) => item._position)) + 1 : 0, _status: "draft" as const, _errors: [], ...Object.fromEntries(columns.map((column) => [column.key, null])) } as GridRow;
    dirtyIds.current.add(row._id);
    setRows((current) => [...current, row]);
  }

  function deleteSelected() {
    const ids = Array.from(selectedRows);
    if (!ids.length) return;
    startTransition(async () => {
      const result = await deleteWorkspaceRowsAction(table.id, ids);
      if (!result.success) return setError(result.error ?? "Delete failed.");
      ids.forEach((id) => dirtyIds.current.delete(id));
      setRows((current) => current.filter((row) => !selectedRows.has(row._id)));
      setSelectedRows(new Set());
    });
  }

  function moveSelectedRow(direction: -1 | 1) {
    if (selectedRows.size !== 1) return;
    const selectedId = Array.from(selectedRows)[0];
    setRows((current) => {
      const ordered = [...current].sort((left, right) => left._position - right._position);
      const index = ordered.findIndex((row) => row._id === selectedId);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= ordered.length) return current;
      const currentPosition = ordered[index]._position;
      ordered[index] = { ...ordered[index], _position: ordered[target]._position };
      ordered[target] = { ...ordered[target], _position: currentPosition };
      dirtyIds.current.add(ordered[index]._id);
      dirtyIds.current.add(ordered[target]._id);
      return ordered.sort((left, right) => left._position - right._position);
    });
  }

  async function persistColumns(nextColumns: WorkspaceColumn[]) {
    setColumns(nextColumns);
    const result = await updateWorkspaceColumnsAction(table.id, nextColumns);
    if (!result.success) setError(result.error ?? "Unable to save columns.");
    else setError(null);
  }

  function selectColumn(key: string) {
    const column = columns.find((item) => item.key === key);
    setSelectedColumnKey(key);
    setColumnName(column?.name ?? "");
    setColumnType(column?.type ?? "text");
  }

  function updateSelectedColumn() {
    void persistColumns(columns.map((column) => column.key === selectedColumnKey ? { ...column, name: columnName.trim() || column.name, type: columnType } : column));
  }

  function addColumn() {
    if (columns.length >= 50) return setError("Tables are limited to 50 columns.");
    let key = `column_${columns.length + 1}`;
    let suffix = 2;
    while (columns.some((column) => column.key === key)) key = `column_${columns.length + 1}_${suffix++}`;
    const next = [...columns, { key, name: `Column ${columns.length + 1}`, type: "text" as const, width: 180 }];
    setRows((current) => current.map((row) => ({ ...row, [key]: null })));
    void persistColumns(next);
    selectColumn(key);
  }

  function removeColumn() {
    if (columns.length <= 1) return setError("A table must keep at least one column.");
    const next = columns.filter((column) => column.key !== selectedColumnKey);
    setRows((current) => current.map((row) => {
      const copy = { ...row };
      delete copy[selectedColumnKey];
      dirtyIds.current.add(row._id);
      return copy;
    }));
    void persistColumns(next);
    selectColumn(next[0].key);
  }

  function moveColumn(direction: -1 | 1) {
    const index = columns.findIndex((column) => column.key === selectedColumnKey);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= columns.length) return;
    const next = [...columns];
    [next[index], next[target]] = [next[target], next[index]];
    void persistColumns(next);
  }

  function pasteMatrix(event: React.ClipboardEvent<HTMLDivElement>) {
    if (!activeCell) return;
    const clipboard = event.clipboardData.getData("text/plain");
    if (!clipboard.includes("\t") && !clipboard.includes("\n")) return;
    event.preventDefault();
    const parsed = parseClipboardText(clipboard);
    if (!parsed.rows.length && !parsed.columns.length) return;
    const matrix = [parsed.columns.map((column) => column.name), ...parsed.rows.map((row) => parsed.columns.map((column) => row[column.key]))];
    const startColumn = columns.findIndex((column) => column.key === activeCell.columnKey);
    const startVisibleRow = visibleRows.findIndex((row) => row._id === activeCell.rowId);
    if (startColumn < 0 || startVisibleRow < 0) return;

    setRows((current) => {
      const next = [...current];
      matrix.forEach((matrixRow, rowOffset) => {
        const targetVisible = visibleRows[startVisibleRow + rowOffset];
        let index = targetVisible ? next.findIndex((row) => row._id === targetVisible._id) : -1;
        if (index < 0) {
          if (next.length >= MAX_WORKSPACE_ROWS) return;
          const created = {
            _id: crypto.randomUUID(),
            _position: next.length ? Math.max(...next.map((row) => row._position)) + 1 : 0,
            _status: "draft" as const,
            _errors: [],
            ...Object.fromEntries(columns.map((column) => [column.key, null])),
          } as GridRow;
          next.push(created);
          index = next.length - 1;
        }
        const updated = { ...next[index] };
        matrixRow.forEach((value, columnOffset) => {
          const column = columns[startColumn + columnOffset];
          if (column) updated[column.key] = coercePastedValue(value, column.type);
        });
        updated._status = table.kind === "trade_import" ? "draft" : updated._status;
        updated._errors = [];
        next[index] = updated;
        dirtyIds.current.add(updated._id);
      });
      return next;
    });
  }

  function handleActivePosition(args: PositionChangeArgs<GridRow>) {
    if (args.row && args.column && args.column.key !== SelectColumn.key) setActiveCell({ rowId: args.row._id, columnKey: String(args.column.key) });
  }

  function deleteTable() {
    if (!window.confirm("Delete this workspace table? Imported trades will not be deleted.")) return;
    startTransition(async () => {
      const result = await deleteWorkspaceTableAction(table.id);
      if (!result.success) return setError(result.error ?? "Unable to delete table.");
      router.push("/data-workspace");
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="glass-panel rounded-2xl p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={addRow} className="inline-flex h-9 items-center gap-2 rounded-xl bg-white px-3 text-xs font-semibold text-black"><Plus className="h-3.5 w-3.5" />Add Row</button>
            <button onClick={deleteSelected} disabled={!selectedRows.size} className="inline-flex h-9 items-center gap-2 rounded-xl border border-white/10 px-3 text-xs disabled:opacity-40"><Trash2 className="h-3.5 w-3.5" />Delete Rows</button>
            <button onClick={() => moveSelectedRow(-1)} disabled={selectedRows.size !== 1} className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 disabled:opacity-40" aria-label="Move row up"><ArrowUp className="h-3.5 w-3.5" /></button>
            <button onClick={() => moveSelectedRow(1)} disabled={selectedRows.size !== 1} className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 disabled:opacity-40" aria-label="Move row down"><ArrowDown className="h-3.5 w-3.5" /></button>
            <div className="relative"><Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-600" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filter rows" className="h-9 w-52 rounded-xl border border-white/10 bg-black/30 pl-9 pr-3 text-xs outline-none focus:border-white/25" /></div>
          </div>
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            {saveState === "saving" ? <><Save className="h-3.5 w-3.5 animate-pulse" />Saving</> : null}
            {saveState === "saved" ? <><Check className="h-3.5 w-3.5 text-emerald-300" />Saved</> : null}
            {saveState === "failed" ? <><CircleAlert className="h-3.5 w-3.5 text-rose-300" />Save failed</> : null}
            <span>{rows.length.toLocaleString()} rows</span>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-end gap-2 border-t border-white/[0.08] pt-3">
          <label className="space-y-1"><span className="block text-[10px] text-zinc-600">Column</span><select value={selectedColumnKey} onChange={(event) => selectColumn(event.target.value)} className="h-8 rounded-lg border border-white/10 bg-zinc-950 px-2 text-xs">{columns.map((column) => <option key={column.key} value={column.key}>{column.name}</option>)}</select></label>
          <label className="space-y-1"><span className="block text-[10px] text-zinc-600">Name</span><input value={columnName} onChange={(event) => setColumnName(event.target.value)} className="h-8 w-40 rounded-lg border border-white/10 bg-black/30 px-2 text-xs" /></label>
          <label className="space-y-1"><span className="block text-[10px] text-zinc-600">Type</span><select value={columnType} onChange={(event) => setColumnType(event.target.value as WorkspaceColumnType)} className="h-8 rounded-lg border border-white/10 bg-zinc-950 px-2 text-xs">{columnTypes.map((type) => <option key={type} value={type}>{type}</option>)}</select></label>
          <button onClick={updateSelectedColumn} className="h-8 rounded-lg border border-white/10 px-3 text-xs">Apply</button>
          <button onClick={() => moveColumn(-1)} className="grid h-8 w-8 place-items-center rounded-lg border border-white/10" aria-label="Move column left"><ArrowLeft className="h-3.5 w-3.5" /></button>
          <button onClick={() => moveColumn(1)} className="grid h-8 w-8 place-items-center rounded-lg border border-white/10" aria-label="Move column right"><ArrowRight className="h-3.5 w-3.5" /></button>
          <button onClick={addColumn} className="h-8 rounded-lg border border-white/10 px-3 text-xs">Add Column</button>
          <button onClick={removeColumn} className="h-8 rounded-lg border border-rose-300/15 px-3 text-xs text-rose-200">Delete Column</button>
          <button onClick={deleteTable} className="ml-auto h-8 rounded-lg border border-rose-300/15 px-3 text-xs text-rose-200">Delete Table</button>
        </div>
        {error ? <p className="mt-3 rounded-xl border border-rose-300/20 bg-rose-400/10 p-3 text-xs text-rose-200">{error}</p> : null}
      </div>
      <div onPasteCapture={pasteMatrix} className="overflow-hidden rounded-2xl border border-white/10 bg-[#090909]">
        <DataGrid
          columns={gridColumns}
          rows={visibleRows}
          rowKeyGetter={(row) => row._id}
          onRowsChange={handleRowsChange}
          selectedRows={selectedRows}
          onSelectedRowsChange={setSelectedRows}
          sortColumns={sortColumns}
          onSortColumnsChange={setSortColumns}
          onActivePositionChange={handleActivePosition}
          onColumnsReorder={(source, target) => {
            const sourceIndex = columns.findIndex((column) => column.key === source);
            const targetIndex = columns.findIndex((column) => column.key === target);
            if (sourceIndex < 0 || targetIndex < 0) return;
            const next = [...columns];
            const [moved] = next.splice(sourceIndex, 1);
            next.splice(targetIndex, 0, moved);
            void persistColumns(next);
          }}
          defaultColumnOptions={{ resizable: true, sortable: true, draggable: true }}
          className="rdg-dark h-[min(66vh,720px)] min-h-[420px] border-0"
          rowHeight={38}
          headerRowHeight={40}
          enableVirtualization
        />
      </div>
      <p className="px-1 text-xs text-zinc-600">Paste rectangular ranges from Excel, Google Sheets, or Notion into the selected cell. Changes autosave after 800 ms.</p>
    </div>
  );
}
