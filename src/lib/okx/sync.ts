import "server-only";

import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { OkxReadOnlyClient } from "@/lib/okx/client";
import type { OkxPositionHistoryRow, OkxSyncSummary } from "@/lib/okx/types";

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_PAGES = 50;
const MAX_RECORDS = 5000;
const PAGE_SIZE = 100;
const SUPPORTED_TYPES = new Set(["MARGIN", "SWAP", "FUTURES"]);

function finiteNumber(value: string | undefined) {
  if (!value?.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function isoTimestamp(value: string | undefined) {
  if (!value) return null;
  const milliseconds = Number(value);
  if (!Number.isFinite(milliseconds)) return null;
  const date = new Date(milliseconds);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function tradeDirection(row: OkxPositionHistoryRow) {
  const value = row.direction === "long" || row.direction === "short" ? row.direction : row.posSide;
  if (value === "long") return "Long" as const;
  if (value === "short") return "Short" as const;
  return null;
}

function normalizePosition(row: OkxPositionHistoryRow, userId: string, accountId: string) {
  const direction = tradeDirection(row);
  const closedAt = isoTimestamp(row.uTime);
  if (!direction || !closedAt || !row.instId || !row.posId || !SUPPORTED_TYPES.has(row.instType)) return null;

  const externalTradeId = `${row.instType}:${row.posId}:${row.uTime}:${row.closeTotalPos}:${row.type ?? "close"}`;
  const importRowHash = createHash("sha256").update(`okx:${externalTradeId}`).digest("hex");
  const pnl = finiteNumber(row.realizedPnl) ?? finiteNumber(row.pnl);
  const fee = finiteNumber(row.fee);

  return {
    user_id: userId,
    trading_account_id: accountId,
    source: "okx",
    symbol: row.instId.toUpperCase(),
    market_type: "Crypto",
    direction,
    entry_price: finiteNumber(row.openAvgPx),
    exit_price: finiteNumber(row.closeAvgPx),
    position_size: finiteNumber(row.closeTotalPos),
    pnl,
    fees: fee === null ? null : Math.abs(fee),
    result: pnl === null ? null : pnl > 0 ? "Win" : pnl < 0 ? "Loss" : "Breakeven",
    opened_at: isoTimestamp(row.cTime),
    closed_at: closedAt,
    external_trade_id: externalTradeId,
    import_row_hash: importRowHash,
  };
}

async function fetchClosedPositions(client: OkxReadOnlyClient, rangeStartMs: number, rangeEndMs: number) {
  const records: OkxPositionHistoryRow[] = [];
  let after: string | undefined;

  for (let pageNumber = 0; pageNumber < MAX_PAGES && records.length < MAX_RECORDS; pageNumber += 1) {
    const page = await client.getPositionsHistory({ after, limit: PAGE_SIZE });
    if (!page.length) break;

    const timestamps = page.map((row) => Number(row.uTime)).filter(Number.isFinite);
    page.forEach((row) => {
      const timestamp = Number(row.uTime);
      if (timestamp >= rangeStartMs && timestamp <= rangeEndMs) records.push(row);
    });

    const oldestTimestamp = timestamps.length ? Math.min(...timestamps) : 0;
    if (!oldestTimestamp || oldestTimestamp <= rangeStartMs || page.length < PAGE_SIZE) break;
    const nextAfter = String(oldestTimestamp);
    if (nextAfter === after) break;
    after = nextAfter;
  }

  return records.slice(0, MAX_RECORDS);
}

export async function syncOkxClosedTrades(input: {
  supabase: SupabaseClient;
  client: OkxReadOnlyClient;
  userId: string;
  accountId: string;
  days: number;
}): Promise<OkxSyncSummary> {
  const rangeEndMs = Date.now();
  const rangeStartMs = rangeEndMs - input.days * DAY_MS;
  const fetched = await fetchClosedPositions(input.client, rangeStartMs, rangeEndMs);
  const normalizedMap = new Map<string, NonNullable<ReturnType<typeof normalizePosition>>>();

  fetched.forEach((row) => {
    const normalized = normalizePosition(row, input.userId, input.accountId);
    if (normalized) normalizedMap.set(normalized.import_row_hash, normalized);
  });

  const normalized = [...normalizedMap.values()];
  const existingHashes = new Set<string>();
  for (let index = 0; index < normalized.length; index += 200) {
    const hashes = normalized.slice(index, index + 200).map((trade) => trade.import_row_hash);
    const { data, error } = await input.supabase
      .from("trades")
      .select("import_row_hash")
      .eq("user_id", input.userId)
      .eq("trading_account_id", input.accountId)
      .in("import_row_hash", hashes);
    if (error) throw new Error("Could not check existing imported trades.");
    (data ?? []).forEach((row) => {
      if (row.import_row_hash) existingHashes.add(row.import_row_hash);
    });
  }

  const pending = normalized.filter((trade) => !existingHashes.has(trade.import_row_hash));
  let importedCount = 0;
  for (let index = 0; index < pending.length; index += 100) {
    const batch = pending.slice(index, index + 100);
    const { data, error } = await input.supabase.from("trades").insert(batch).select("id");
    if (error) throw new Error("Could not save imported OKX trades.");
    importedCount += data?.length ?? 0;
  }

  return {
    fetchedCount: fetched.length,
    importedCount,
    skippedCount: fetched.length - importedCount,
    rangeStart: new Date(rangeStartMs).toISOString(),
    rangeEnd: new Date(rangeEndMs).toISOString(),
  };
}
