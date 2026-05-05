import { normalizeEmotion, stableEmotions } from "@/lib/psychology/emotions";
import type { TradePsychology } from "@/lib/psychology/types";
import { detectPotentialRevengeEvents } from "@/lib/revenge/detector";
import type { Trade } from "@/lib/trading/types";

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function average(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

export function calculateDisciplineScorePreview(trades: Trade[], psychologyRows: TradePsychology[], maxRiskPercent = 1) {
  const psychologyByTradeId = new Map(psychologyRows.map((row) => [row.trade_id, row]));
  const revengeEvents = detectPotentialRevengeEvents(trades, psychologyByTradeId);
  const tradesWithRisk = trades.filter((trade) => Number(trade.risk_percent) > 0);
  const riskControlled = tradesWithRisk.filter((trade) => Number(trade.risk_percent) <= maxRiskPercent).length;
  const emotions = psychologyRows.map((row) => normalizeEmotion(row.emotion_before)).filter(Boolean);
  const stableEmotionCount = emotions.filter((emotion) => emotion && stableEmotions.has(emotion)).length;
  const documentedTrades = trades.filter((trade) => trade.result && trade.result !== "Open" && (trade.rr !== null || trade.pnl !== null)).length;

  const riskControl = tradesWithRisk.length ? (riskControlled / tradesWithRisk.length) * 100 : 70;
  const emotionBalance = emotions.length ? (stableEmotionCount / emotions.length) * 100 : 70;
  const consistency = trades.length ? (documentedTrades / trades.length) * 100 : 70;
  const revengeAvoidance = clampScore(100 - revengeEvents.length * 18);
  const timeDiscipline = 70;

  const totalScore = average([riskControl, emotionBalance, consistency, revengeAvoidance, timeDiscipline]);

  return {
    totalScore: clampScore(totalScore),
    riskControl: clampScore(riskControl),
    emotionBalance: clampScore(emotionBalance),
    consistency: clampScore(consistency),
    revengeAvoidance,
    timeDiscipline,
    revengeEvents,
  };
}
