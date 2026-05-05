import { normalizeEmotion } from "@/lib/psychology/emotions";
import type { TradePsychology } from "@/lib/psychology/types";
import type { Trade } from "@/lib/trading/types";

export interface DetectedRevengeEvent {
  previous_trade_id: string;
  next_trade_id: string;
  revenge_score: number;
  gap_minutes: number;
  size_increase_ratio: number | null;
  triggered_rules: string[];
}

export function detectPotentialRevengeEvents(trades: Trade[], psychologyByTradeId: Map<string, TradePsychology>) {
  const sortedTrades = [...trades]
    .filter((trade) => trade.opened_at)
    .sort((a, b) => new Date(a.opened_at ?? 0).getTime() - new Date(b.opened_at ?? 0).getTime());

  const events: DetectedRevengeEvent[] = [];

  for (let index = 0; index < sortedTrades.length - 1; index += 1) {
    const previous = sortedTrades[index];
    const next = sortedTrades[index + 1];

    if (previous.result !== "Loss" || !previous.opened_at || !next.opened_at) continue;

    const gapMinutes = (new Date(next.opened_at).getTime() - new Date(previous.opened_at).getTime()) / 60_000;
    if (gapMinutes < 0 || gapMinutes > 5) continue;

    let score = 0.35;
    const triggeredRules = ["loss followed by another trade within 5 minutes"];
    const previousRisk = Number(previous.risk_percent) || 0;
    const nextRisk = Number(next.risk_percent) || 0;
    const previousSize = Number(previous.position_size) || 0;
    const nextSize = Number(next.position_size) || 0;
    const sizeIncreaseRatio = previousSize > 0 && nextSize > 0 ? nextSize / previousSize : null;

    if (nextRisk > previousRisk && nextRisk > 0) {
      score += 0.25;
      triggeredRules.push("next trade risk was higher");
    }

    if (sizeIncreaseRatio && sizeIncreaseRatio > 1) {
      score += 0.2;
      triggeredRules.push("next trade size was higher");
    }

    const nextEmotion = normalizeEmotion(psychologyByTradeId.get(next.id)?.emotion_before);
    if (nextEmotion === "revenge" || nextEmotion === "fomo" || nextEmotion === "greed") {
      score += 0.25;
      triggeredRules.push(`next trade emotion was ${nextEmotion}`);
    }

    events.push({
      previous_trade_id: previous.id,
      next_trade_id: next.id,
      revenge_score: Math.min(1, score),
      gap_minutes: Math.round(gapMinutes * 10) / 10,
      size_increase_ratio: sizeIncreaseRatio ? Math.round(sizeIncreaseRatio * 100) / 100 : null,
      triggered_rules: triggeredRules,
    });
  }

  return events;
}
