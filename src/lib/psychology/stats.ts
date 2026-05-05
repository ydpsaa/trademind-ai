import { damagingEmotions, normalizeEmotion } from "@/lib/psychology/emotions";
import type { TradePsychology, TradeEmotion } from "@/lib/psychology/types";
import type { Trade } from "@/lib/trading/types";

export interface PsychologyTradeRecord {
  trade: Trade;
  psychology: TradePsychology | null;
}

export interface EmotionPerformance {
  emotion: TradeEmotion;
  count: number;
  averagePnl: number;
  winRate: number;
}

function average(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

export function calculatePsychologyStats(records: PsychologyTradeRecord[]) {
  const withPsychology = records.filter((record) => record.psychology);
  const emotionBuckets = new Map<TradeEmotion, PsychologyTradeRecord[]>();

  for (const record of withPsychology) {
    const emotion = normalizeEmotion(record.psychology?.emotion_before);
    if (!emotion) continue;
    emotionBuckets.set(emotion, [...(emotionBuckets.get(emotion) ?? []), record]);
  }

  const emotionPerformance: EmotionPerformance[] = [...emotionBuckets.entries()]
    .map(([emotion, items]) => {
      const closed = items.filter((item) => item.trade.result && item.trade.result !== "Open");
      const wins = closed.filter((item) => item.trade.result === "Win").length;

      return {
        emotion,
        count: items.length,
        averagePnl: average(items.map((item) => Number(item.trade.pnl) || 0)),
        winRate: closed.length ? (wins / closed.length) * 100 : 0,
      };
    })
    .sort((a, b) => b.count - a.count);

  const confidenceValues = withPsychology.map((record) => Number(record.psychology?.confidence_level)).filter(Number.isFinite);
  const stressValues = withPsychology.map((record) => Number(record.psychology?.stress_level)).filter(Number.isFinite);
  const fomoValues = withPsychology.map((record) => Number(record.psychology?.fomo_score)).filter(Number.isFinite);

  const bestPerformingEmotion = [...emotionPerformance].sort((a, b) => b.averagePnl - a.averagePnl)[0]?.emotion ?? null;
  const mostDamagingEmotion =
    [...emotionPerformance].filter((item) => damagingEmotions.has(item.emotion)).sort((a, b) => a.averagePnl - b.averagePnl)[0]?.emotion ??
    [...emotionPerformance].sort((a, b) => a.averagePnl - b.averagePnl)[0]?.emotion ??
    null;

  return {
    totalTradesWithPsychology: withPsychology.length,
    emotionDistribution: emotionPerformance.map(({ emotion, count }) => ({ emotion, count })),
    emotionPerformance,
    averageConfidence: average(confidenceValues),
    averageStress: average(stressValues),
    averageFomo: average(fomoValues),
    mostDamagingEmotion,
    bestPerformingEmotion,
  };
}
