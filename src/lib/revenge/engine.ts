import { normalizeEmotion } from "@/lib/psychology/emotions";
import type { TradePsychology } from "@/lib/psychology/types";
import type { RevengeEventDetection } from "@/lib/revenge/types";
import type { Trade } from "@/lib/trading/types";

interface TradeRuleCheckLike {
  trade_id: string | null;
  passed: boolean | null;
}

function openedOrClosedTime(trade: Trade) {
  return trade.closed_at || trade.opened_at || trade.created_at;
}

export function detectRevengeEvents(trades: Trade[], tradePsychology: TradePsychology[], tradeRuleChecks: TradeRuleCheckLike[] = []): RevengeEventDetection[] {
  const psychologyByTradeId = new Map(tradePsychology.map((row) => [row.trade_id, row]));
  const ruleChecksByTradeId = new Map<string, TradeRuleCheckLike[]>();

  for (const check of tradeRuleChecks) {
    if (!check.trade_id) continue;
    ruleChecksByTradeId.set(check.trade_id, [...(ruleChecksByTradeId.get(check.trade_id) ?? []), check]);
  }

  const sortedTrades = [...trades]
    .filter((trade) => openedOrClosedTime(trade))
    .sort((a, b) => new Date(openedOrClosedTime(a) ?? 0).getTime() - new Date(openedOrClosedTime(b) ?? 0).getTime());

  const events: RevengeEventDetection[] = [];

  for (let index = 0; index < sortedTrades.length - 1; index += 1) {
    const previous = sortedTrades[index];
    const next = sortedTrades[index + 1];
    const previousTime = openedOrClosedTime(previous);
    const nextTime = next.opened_at || openedOrClosedTime(next);

    if (!previousTime || !nextTime) continue;
    if (previous.result !== "Loss" && !(Number(previous.pnl) < 0)) continue;

    const gapMinutes = (new Date(nextTime).getTime() - new Date(previousTime).getTime()) / 60_000;
    if (gapMinutes < 0 || gapMinutes > 5) continue;

    let score = 0.35;
    const triggeredRules = ["Losing trade followed by another trade within 5 minutes"];
    const previousSize = Number(previous.position_size) || 0;
    const nextSize = Number(next.position_size) || 0;
    const sizeIncreaseRatio = previousSize > 0 && nextSize > 0 ? nextSize / previousSize : null;
    const previousRisk = Number(previous.risk_percent) || 0;
    const nextRisk = Number(next.risk_percent) || 0;

    if (sizeIncreaseRatio && sizeIncreaseRatio > 1.5) {
      score += 0.3;
      triggeredRules.push("Next trade position size increased more than 1.5x");
    }

    if (nextRisk > previousRisk && nextRisk > 0) {
      score += 0.15;
      triggeredRules.push("Next trade risk percent increased");
    }

    const nextEmotion = normalizeEmotion(psychologyByTradeId.get(next.id)?.emotion_before);
    if (nextEmotion === "fomo" || nextEmotion === "greed" || nextEmotion === "revenge") {
      score += 0.15;
      triggeredRules.push(`Next trade emotion was ${nextEmotion}`);
    }

    const checks = ruleChecksByTradeId.get(next.id) ?? [];
    if (!checks.length || checks.some((check) => check.passed === false)) {
      score += 0.05;
      triggeredRules.push("Next trade had missing or failed discipline checks");
    }

    events.push({
      previous_trade_id: previous.id,
      next_trade_id: next.id,
      revenge_score: Math.min(1, Math.round(score * 100) / 100),
      gap_minutes: Math.round(gapMinutes * 10) / 10,
      size_increase_ratio: sizeIncreaseRatio ? Math.round(sizeIncreaseRatio * 100) / 100 : null,
      triggered_rules: triggeredRules,
    });
  }

  return events;
}
