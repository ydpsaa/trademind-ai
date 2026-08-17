import type {
  ImportRowValidation,
  TradeImportField,
  TradeImportFieldOption,
  TradeImportMapping,
  WorkspaceCellValue,
} from "@/lib/data-workspace/types";

export const tradeImportFields: TradeImportFieldOption[] = [
  { value: "external_trade_id", label: "External Trade ID", aliases: ["trade id", "order id", "deal id", "ticket"] },
  { value: "symbol", label: "Symbol", required: true, aliases: ["symbol", "instrument", "ticker", "market"] },
  { value: "market_type", label: "Market Type", aliases: ["market type", "asset class", "category"] },
  { value: "direction", label: "Direction", required: true, aliases: ["direction", "side", "type", "buy/sell"] },
  { value: "entry_price", label: "Entry Price", required: true, aliases: ["entry", "entry price", "open price", "price"] },
  { value: "exit_price", label: "Exit Price", aliases: ["exit", "exit price", "close price"] },
  { value: "stop_loss", label: "Stop Loss", aliases: ["stop loss", "stop_loss", "sl"] },
  { value: "take_profit", label: "Take Profit", aliases: ["take profit", "take_profit", "tp"] },
  { value: "position_size", label: "Position Size", aliases: ["position size", "size", "quantity", "qty", "volume"] },
  { value: "risk_percent", label: "Risk %", aliases: ["risk", "risk %", "risk percent"] },
  { value: "rr", label: "RR", aliases: ["rr", "r:r", "risk reward", "risk/reward"] },
  { value: "pnl", label: "PnL", aliases: ["pnl", "p&l", "profit", "profit loss", "realized pnl"] },
  { value: "fees", label: "Fees", aliases: ["fees", "fee", "commission"] },
  { value: "result", label: "Result", aliases: ["result", "outcome", "status"] },
  { value: "session", label: "Session", aliases: ["session", "trading session"] },
  { value: "opened_at", label: "Opened At", required: true, aliases: ["opened at", "open time", "entry time", "date", "timestamp"] },
  { value: "closed_at", label: "Closed At", aliases: ["closed at", "close time", "exit time"] },
  { value: "reason_for_entry", label: "Entry Reason", aliases: ["reason", "entry reason", "setup"] },
  { value: "notes_before", label: "Notes Before", aliases: ["notes before", "pre trade notes"] },
  { value: "notes_after", label: "Notes After", aliases: ["notes", "notes after", "post trade notes"] },
  { value: "setup_tags", label: "Setup Tags", aliases: ["setup tags", "tags"] },
  { value: "mistake_tags", label: "Mistake Tags", aliases: ["mistake tags", "mistakes"] },
];

function text(value: WorkspaceCellValue | undefined) {
  if (value === null || value === undefined) return null;
  const normalized = String(value).trim();
  return normalized || null;
}

function numberValue(value: WorkspaceCellValue | undefined) {
  const raw = text(value);
  if (!raw) return null;
  let normalized = raw.replace(/[\s%$€£¥]/g, "");
  const lastComma = normalized.lastIndexOf(",");
  const lastDot = normalized.lastIndexOf(".");
  if (lastComma >= 0 && lastDot >= 0) {
    normalized = lastComma > lastDot ? normalized.replaceAll(".", "").replace(",", ".") : normalized.replaceAll(",", "");
  } else if (lastComma >= 0) {
    normalized = normalized.replace(",", ".");
  }
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function dateValue(value: WorkspaceCellValue | undefined) {
  if (value === null || value === undefined || value === "") return null;
  const raw = String(value).trim();
  const european = raw.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  const date = european
    ? new Date(Date.UTC(Number(european[3]), Number(european[2]) - 1, Number(european[1]), Number(european[4] ?? 0), Number(european[5] ?? 0), Number(european[6] ?? 0)))
    : new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function directionValue(value: WorkspaceCellValue | undefined) {
  const normalized = text(value)?.toLowerCase();
  if (["buy", "long", "b"].includes(normalized ?? "")) return "Long" as const;
  if (["sell", "short", "s"].includes(normalized ?? "")) return "Short" as const;
  return null;
}

function tags(value: WorkspaceCellValue | undefined) {
  const raw = text(value);
  if (!raw) return null;
  return raw.split(/[,;|]/).map((item) => item.trim()).filter(Boolean).slice(0, 20);
}

function mapped(row: Record<string, WorkspaceCellValue>, mapping: TradeImportMapping, field: TradeImportField) {
  const sourceKey = mapping[field];
  return sourceKey ? row[sourceKey] : undefined;
}

export function suggestTradeImportMapping(columns: Array<{ key: string; name: string }>): TradeImportMapping {
  const mapping: TradeImportMapping = {};
  for (const field of tradeImportFields) {
    const match = columns.find((column) => {
      const normalized = column.name.trim().toLowerCase().replaceAll("_", " ");
      return field.aliases.includes(normalized) || field.value.replaceAll("_", " ") === normalized;
    });
    if (match) mapping[field.value] = match.key;
  }
  return mapping;
}

export function validateTradeImportRow(row: Record<string, WorkspaceCellValue>, mapping: TradeImportMapping): ImportRowValidation {
  const errors: string[] = [];
  const symbol = text(mapped(row, mapping, "symbol"))?.toUpperCase() ?? null;
  const direction = directionValue(mapped(row, mapping, "direction"));
  const openedAt = dateValue(mapped(row, mapping, "opened_at"));
  const entryPrice = numberValue(mapped(row, mapping, "entry_price"));

  if (!symbol) errors.push("Symbol is required.");
  if (!direction) errors.push("Direction must be Long/Short or Buy/Sell.");
  if (!openedAt) errors.push("Opened At must be a valid date.");
  if (entryPrice === null || Number.isNaN(entryPrice)) errors.push("Entry Price must be a valid number.");

  const numericFields = ["exit_price", "stop_loss", "take_profit", "position_size", "risk_percent", "rr", "pnl", "fees"] as const;
  const numeric = Object.fromEntries(numericFields.map((field) => [field, numberValue(mapped(row, mapping, field))])) as Record<(typeof numericFields)[number], number | null>;
  numericFields.forEach((field) => {
    if (numeric[field] !== null && Number.isNaN(numeric[field])) errors.push(`${tradeImportFields.find((item) => item.value === field)?.label ?? field} must be a valid number.`);
  });

  const closedRaw = mapped(row, mapping, "closed_at");
  const closedAt = dateValue(closedRaw);
  if (text(closedRaw) && !closedAt) errors.push("Closed At must be a valid date.");
  if (errors.length || !symbol || !direction || !openedAt || entryPrice === null || Number.isNaN(entryPrice)) {
    return { valid: false, errors, trade: null, journal: null };
  }

  return {
    valid: true,
    errors: [],
    trade: {
      external_trade_id: text(mapped(row, mapping, "external_trade_id")),
      symbol,
      market_type: text(mapped(row, mapping, "market_type")),
      direction,
      entry_price: entryPrice,
      exit_price: numeric.exit_price,
      stop_loss: numeric.stop_loss,
      take_profit: numeric.take_profit,
      position_size: numeric.position_size,
      risk_percent: numeric.risk_percent,
      rr: numeric.rr,
      pnl: numeric.pnl,
      fees: numeric.fees,
      result: text(mapped(row, mapping, "result")) || (closedAt ? "Closed" : "Open"),
      session: text(mapped(row, mapping, "session")),
      opened_at: openedAt,
      closed_at: closedAt,
    },
    journal: {
      reason_for_entry: text(mapped(row, mapping, "reason_for_entry")),
      notes_before: text(mapped(row, mapping, "notes_before")),
      notes_after: text(mapped(row, mapping, "notes_after")),
      setup_tags: tags(mapped(row, mapping, "setup_tags")),
      mistake_tags: tags(mapped(row, mapping, "mistake_tags")),
    },
  };
}

export function validateRequiredMapping(mapping: TradeImportMapping) {
  const missing = tradeImportFields.filter((field) => field.required && !mapping[field.value]).map((field) => field.label);
  return missing.length ? `Map required fields: ${missing.join(", ")}.` : null;
}
