import "server-only";
import { createHash } from "node:crypto";
import type { NormalizedImportTrade } from "@/lib/data-workspace/types";

export function createImportRowHash(trade: NormalizedImportTrade) {
  const identity = trade.external_trade_id
    ? `external:${trade.external_trade_id.trim().toLowerCase()}`
    : [trade.symbol, trade.direction, trade.opened_at, trade.entry_price, trade.position_size ?? ""].join("|");
  return createHash("sha256").update(identity).digest("hex");
}
