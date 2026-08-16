import "server-only";
import { createHash } from "node:crypto";
import type { TradePsychology } from "@/lib/psychology/types";
import type { TradeRuleCheckWithRule } from "@/lib/rules/types";
import type { Trade, TradeJournalEntry } from "@/lib/trading/types";
import type { TradeMemoryMetadata } from "@/lib/vector-memory/types";

interface BuildTradeMemoryContentInput {
  trade: Trade;
  journalEntry: TradeJournalEntry | null;
  psychology?: TradePsychology | null;
  ruleChecks?: TradeRuleCheckWithRule[];
  strategyName?: string | null;
}

function compact<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== null && item !== undefined && item !== ""));
}

export function buildTradeMemoryContent({ trade, journalEntry, psychology = null, ruleChecks = [], strategyName = null }: BuildTradeMemoryContentInput) {
  const failedRules = ruleChecks
    .filter((check) => check.passed === false)
    .map((check) => check.trading_rules?.text || check.violation_reason || "Checklist rule failed");
  const passedRules = ruleChecks
    .filter((check) => check.passed === true)
    .map((check) => check.trading_rules?.text || "Checklist rule passed");

  const memory = compact({
    symbol: trade.symbol,
    market_type: trade.market_type,
    direction: trade.direction,
    result: trade.result,
    session: trade.session,
    strategy: strategyName,
    source: trade.source,
    risk_percent: trade.risk_percent,
    rr: trade.rr,
    pnl: trade.pnl,
    reason_for_entry: journalEntry?.reason_for_entry,
    notes_before: journalEntry?.notes_before,
    notes_after: journalEntry?.notes_after,
    setup_tags: journalEntry?.setup_tags,
    mistake_tags: journalEntry?.mistake_tags,
    emotion_before: psychology?.emotion_before,
    emotion_after: psychology?.emotion_after,
    confidence_level: psychology?.confidence_level,
    stress_level: psychology?.stress_level,
    fomo_score: psychology?.fomo_score,
    discipline_note: psychology?.discipline_note,
    passed_rules: passedRules.length ? passedRules : undefined,
    failed_rules: failedRules.length ? failedRules : undefined,
  });

  const content = JSON.stringify(memory);
  const summaryParts = [trade.symbol, trade.direction, trade.result, trade.session, strategyName].filter(Boolean);
  const metadata: TradeMemoryMetadata = {
    symbol: trade.symbol,
    direction: trade.direction,
    result: trade.result,
    session: trade.session,
    source: trade.source,
    opened_at: trade.opened_at,
  };

  return {
    content,
    contentHash: createHash("sha256").update(content).digest("hex"),
    summary: summaryParts.join(" · ") || `${trade.symbol} trade`,
    metadata,
  };
}
