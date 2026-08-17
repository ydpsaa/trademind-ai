export type WorkspaceTableKind = "custom" | "trade_import";
export type WorkspaceColumnType = "text" | "number" | "currency" | "percent" | "date" | "datetime" | "select" | "checkbox" | "url";
export type WorkspaceCellValue = string | number | boolean | null;
export type WorkspaceRowStatus = "draft" | "valid" | "invalid" | "imported" | "skipped";
export type ImportSourceFormat = "csv" | "xlsx" | "clipboard";
export type ImportBatchStatus = "draft" | "validated" | "importing" | "completed" | "failed" | "rolled_back";

export interface WorkspaceColumn {
  key: string;
  name: string;
  type: WorkspaceColumnType;
  width?: number;
  options?: string[];
}

export interface WorkspaceTable {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  kind: WorkspaceTableKind;
  columns_json: WorkspaceColumn[];
  settings_json: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceTableRow {
  id: string;
  table_id: string;
  user_id: string;
  position: number;
  data_json: Record<string, WorkspaceCellValue>;
  validation_status: WorkspaceRowStatus;
  validation_errors: string[];
  created_at: string;
  updated_at: string;
}

export interface TradeImportBatch {
  id: string;
  user_id: string;
  workspace_table_id: string | null;
  trading_account_id: string | null;
  filename: string | null;
  source_format: ImportSourceFormat;
  status: ImportBatchStatus;
  mapping_json: TradeImportMapping;
  next_position: number;
  total_rows: number;
  valid_rows: number;
  invalid_rows: number;
  imported_count: number;
  skipped_count: number;
  error_count: number;
  last_error: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  rolled_back_at: string | null;
}

export type TradeImportField =
  | "external_trade_id"
  | "symbol"
  | "market_type"
  | "direction"
  | "entry_price"
  | "exit_price"
  | "stop_loss"
  | "take_profit"
  | "position_size"
  | "risk_percent"
  | "rr"
  | "pnl"
  | "fees"
  | "result"
  | "session"
  | "opened_at"
  | "closed_at"
  | "reason_for_entry"
  | "notes_before"
  | "notes_after"
  | "setup_tags"
  | "mistake_tags";

export type TradeImportMapping = Partial<Record<TradeImportField, string>>;

export interface TradeImportFieldOption {
  value: TradeImportField;
  label: string;
  required?: boolean;
  aliases: string[];
}

export interface NormalizedImportTrade {
  external_trade_id: string | null;
  symbol: string;
  market_type: string | null;
  direction: "Long" | "Short";
  entry_price: number;
  exit_price: number | null;
  stop_loss: number | null;
  take_profit: number | null;
  position_size: number | null;
  risk_percent: number | null;
  rr: number | null;
  pnl: number | null;
  fees: number | null;
  result: string;
  session: string | null;
  opened_at: string;
  closed_at: string | null;
}

export interface NormalizedImportJournal {
  reason_for_entry: string | null;
  notes_before: string | null;
  notes_after: string | null;
  setup_tags: string[] | null;
  mistake_tags: string[] | null;
}

export interface ImportRowValidation {
  valid: boolean;
  errors: string[];
  trade: NormalizedImportTrade | null;
  journal: NormalizedImportJournal | null;
}

export interface WorkspaceActionResult<T = undefined> {
  success?: boolean;
  error?: string;
  data?: T;
}

export interface SaveWorkspaceRowsInput {
  tableId: string;
  rows: Array<Pick<WorkspaceTableRow, "id" | "position" | "data_json" | "validation_status" | "validation_errors">>;
}

export const MAX_WORKSPACE_FILE_BYTES = 5 * 1024 * 1024;
export const MAX_WORKSPACE_ROWS = 5000;
export const MAX_WORKSPACE_COLUMNS = 50;
export const WORKSPACE_SAVE_BATCH_SIZE = 200;
export const IMPORT_CHUNK_SIZE = 250;
