import "server-only";
import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { BybitReadOnlyClient } from "@/lib/bybit/client";
import type { BybitCategory, BybitClosedPnlRow, BybitSyncSummary } from "@/lib/bybit/types";

const DAY_MS = 24 * 60 * 60 * 1000;
const WINDOW_MS = 7 * DAY_MS;
const MAX_PAGES_PER_WINDOW = 5;
const MAX_RECORDS = 5000;
const CATEGORIES: BybitCategory[] = ["linear", "inverse"];

function finiteNumber(value: string | undefined) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function getDirectionFromClosingSide(side: BybitClosedPnlRow["side"]) {
  return side === "Sell" ? "Long" : "Short";
}

function normalizeRow(row: BybitClosedPnlRow, category: BybitCategory, userId: string, accountId: string) {
  const externalTradeId = `${category}:${row.orderId}:${row.updatedTime}:${row.closedSize || row.qty}`;
  const importRowHash = createHash("sha256").update(`bybit:${externalTradeId}`).digest("hex");
  const pnl = finiteNumber(row.closedPnl);
  const openFee = finiteNumber(row.openFee) ?? 0;
  const closeFee = finiteNumber(row.closeFee) ?? 0;

  return {
    user_id: userId,
    trading_account_id: accountId,
    source: "bybit",
    symbol: row.symbol.toUpperCase(),
    market_type: "Crypto",
    direction: getDirectionFromClosingSide(row.side),
    entry_price: finiteNumber(row.avgEntryPrice),
    exit_price: finiteNumber(row.avgExitPrice),
    position_size: finiteNumber(row.closedSize || row.qty),
    pnl,
    fees: openFee + closeFee || null,
    result: pnl === null ? null : pnl > 0 ? "Win" : pnl < 0 ? "Loss" : "Breakeven",
    opened_at: null,
    closed_at: row.updatedTime ? new Date(Number(row.updatedTime)).toISOString() : null,
    external_trade_id: externalTradeId,
    import_row_hash: importRowHash,
  };
}

async function fetchClosedPnl(client: BybitReadOnlyClient, startTime: number, endTime: number) {
  const records: Array<{ category: BybitCategory; row: BybitClosedPnlRow }> = [];

  for (const category of CATEGORIES) {
    for (let windowStart = startTime; windowStart < endTime && records.length < MAX_RECORDS; windowStart += WINDOW_MS) {
      const windowEnd = Math.min(windowStart + WINDOW_MS - 1, endTime);
      let cursor: string | undefined;

      for (let pageNumber = 0; pageNumber < MAX_PAGES_PER_WINDOW && records.length < MAX_RECORDS; pageNumber += 1) {
        const page = await client.getClosedPnl({ category, startTime: windowStart, endTime: windowEnd, cursor });
        page.list.forEach((row) => records.push({ category, row }));
        cursor = page.nextPageCursor || undefined;
        if (!cursor || !page.list.length) break;
      }
    }
  }

  return records.slice(0, MAX_RECORDS);
}

export async function syncBybitClosedTrades(input: {
  supabase: SupabaseClient;
  client: BybitReadOnlyClient;
  userId: string;
  accountId: string;
  days: number;
}): Promise<BybitSyncSummary> {
  const rangeEndMs = Date.now();
  const rangeStartMs = rangeEndMs - input.days * DAY_MS;
  const fetched = await fetchClosedPnl(input.client, rangeStartMs, rangeEndMs);
  const normalizedMap = new Map<string, ReturnType<typeof normalizeRow>>();

  fetched.forEach(({ category, row }) => {
    const normalized = normalizeRow(row, category, input.userId, input.accountId);
    normalizedMap.set(normalized.import_row_hash, normalized);
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
    if (error) throw new Error("Could not save imported Bybit trades.");
    importedCount += data?.length ?? 0;
  }

  return {
    fetchedCount: normalized.length,
    importedCount,
    skippedCount: normalized.length - importedCount,
    rangeStart: new Date(rangeStartMs).toISOString(),
    rangeEnd: new Date(rangeEndMs).toISOString(),
  };
}
