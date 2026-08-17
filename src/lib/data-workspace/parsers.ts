import Papa from "papaparse";
import {
  MAX_WORKSPACE_COLUMNS,
  MAX_WORKSPACE_FILE_BYTES,
  MAX_WORKSPACE_ROWS,
  type WorkspaceCellValue,
  type WorkspaceColumn,
} from "@/lib/data-workspace/types";

export interface ParsedWorkspaceData {
  columns: WorkspaceColumn[];
  rows: Array<Record<string, WorkspaceCellValue>>;
  warnings: string[];
}

function cellValue(value: unknown): WorkspaceCellValue {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (value === null || value === undefined) return null;
  return String(value);
}

function columnKey(name: string, index: number, used: Set<string>) {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || `column_${index + 1}`;
  let key = base;
  let suffix = 2;
  while (used.has(key)) {
    key = `${base}_${suffix}`;
    suffix += 1;
  }
  used.add(key);
  return key;
}

function normalizeMatrix(matrix: unknown[][]): ParsedWorkspaceData {
  const warnings: string[] = [];
  const nonEmpty = matrix.filter((row) => row.some((value) => value !== null && value !== undefined && String(value).trim() !== ""));
  if (!nonEmpty.length) return { columns: [], rows: [], warnings: ["No tabular data was found."] };

  const width = Math.min(Math.max(...nonEmpty.map((row) => row.length)), MAX_WORKSPACE_COLUMNS);
  const headers = nonEmpty[0].slice(0, width).map((value, index) => String(value ?? "").trim() || `Column ${index + 1}`);
  const used = new Set<string>();
  const columns = headers.map((name, index) => ({ key: columnKey(name, index, used), name, type: "text" as const, width: 180 }));
  const sourceRows = nonEmpty.slice(1, MAX_WORKSPACE_ROWS + 1);
  const rows = sourceRows.map((sourceRow) => Object.fromEntries(columns.map((column, index) => [column.key, cellValue(sourceRow[index])])));

  if (nonEmpty.length - 1 > MAX_WORKSPACE_ROWS) warnings.push(`Only the first ${MAX_WORKSPACE_ROWS.toLocaleString()} rows were loaded.`);
  if (Math.max(...nonEmpty.map((row) => row.length)) > MAX_WORKSPACE_COLUMNS) warnings.push(`Only the first ${MAX_WORKSPACE_COLUMNS} columns were loaded.`);
  return { columns, rows, warnings };
}

export function parseDelimitedText(text: string): ParsedWorkspaceData {
  const result = Papa.parse<string[]>(text, { skipEmptyLines: "greedy" });
  const parsed = normalizeMatrix(result.data as unknown[][]);
  const parseWarnings = result.errors.slice(0, 8).map((error) => `Row ${typeof error.row === "number" ? error.row + 1 : "?"}: ${error.message}`);
  return { ...parsed, warnings: [...parseWarnings, ...parsed.warnings] };
}

export function parseClipboardText(text: string) {
  return parseDelimitedText(text);
}

export function parseSpreadsheetMatrix(matrix: unknown[][]) {
  return normalizeMatrix(matrix);
}

export function validateWorkspaceFile(file: File) {
  if (file.size > MAX_WORKSPACE_FILE_BYTES) return "Files must be 5 MB or smaller.";
  const lowerName = file.name.toLowerCase();
  if (!lowerName.endsWith(".csv") && !lowerName.endsWith(".xlsx")) return "Choose a CSV or XLSX file.";
  return null;
}
