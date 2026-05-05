import { damagingEmotions, normalizeEmotion, stableEmotions } from "@/lib/psychology/emotions";
import type { TradePsychology } from "@/lib/psychology/types";
import type { DisciplineScoreResult } from "@/lib/discipline/types";
import type { RevengeEvent, RevengeEventDetection } from "@/lib/revenge/types";
import type { Trade } from "@/lib/trading/types";

interface TradingProfileLike {
  max_trade_risk?: number | null;
  max_trade_risk_percent?: number | null;
  preferred_sessions?: string[] | null;
}

interface TradeRuleCheckLike {
  trade_id?: string | null;
  passed?: boolean | null;
}

interface CalculateDisciplineScoreInput {
  trades: Trade[];
  tradePsychology: TradePsychology[];
  tradingProfile?: TradingProfileLike | null;
  tradeRuleChecks?: TradeRuleCheckLike[];
  revengeEvents?: Array<RevengeEvent | RevengeEventDetection>;
  periodStart: string;
  periodEnd: string;
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function average(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function scoreRevengeAvoidance(revengeEvents: Array<RevengeEvent | RevengeEventDetection>) {
  if (!revengeEvents.length) return 100;
  const severityPenalty = revengeEvents.reduce((sum, event) => sum + (Number(event.revenge_score) || 0) * 28, 0);
  const countPenalty = Math.max(0, revengeEvents.length - 1) * 8;
  return clampScore(100 - severityPenalty - countPenalty);
}

export function calculateDisciplineScore(input: CalculateDisciplineScoreInput): DisciplineScoreResult {
  const warnings: string[] = [];
  const recommendations: string[] = [];
  const checks = input.tradeRuleChecks ?? [];
  const passedChecks = checks.filter((check) => check.passed === true).length;
  const ruleAdherence = checks.length ? (passedChecks / checks.length) * 100 : 75;

  const maxRisk = Number(input.tradingProfile?.max_trade_risk ?? input.tradingProfile?.max_trade_risk_percent) || 1;
  const tradesWithRisk = input.trades.filter((trade) => Number(trade.risk_percent) > 0);
  const riskControlled = tradesWithRisk.filter((trade) => Number(trade.risk_percent) <= maxRisk).length;
  const riskControl = tradesWithRisk.length ? (riskControlled / tradesWithRisk.length) * 100 : 75;

  const emotions = input.tradePsychology.map((row) => normalizeEmotion(row.emotion_before)).filter(Boolean);
  const stableEmotionCount = emotions.filter((emotion) => emotion && stableEmotions.has(emotion)).length;
  const riskyEmotionCount = emotions.filter((emotion) => emotion && damagingEmotions.has(emotion)).length;
  const emotionBalance = emotions.length ? (stableEmotionCount / emotions.length) * 100 : 70;

  const revengeAvoidance = scoreRevengeAvoidance(input.revengeEvents ?? []);
  const preferredSessions = input.tradingProfile?.preferred_sessions ?? [];
  const tradesWithSession = input.trades.filter((trade) => trade.session);
  const alignedSessions = preferredSessions.length ? tradesWithSession.filter((trade) => trade.session && preferredSessions.includes(trade.session)).length : 0;
  const timeDiscipline = preferredSessions.length && tradesWithSession.length ? (alignedSessions / tradesWithSession.length) * 100 : 75;

  if (ruleAdherence < 65) {
    warnings.push("Rule adherence is below target.");
    recommendations.push("Use a pre-trade checklist before taking new setups.");
  }

  if (riskControl < 70) {
    warnings.push("Risk control is inconsistent.");
    recommendations.push(`Keep risk at or below ${maxRisk}% until discipline improves.`);
  }

  if (riskyEmotionCount > stableEmotionCount) {
    warnings.push("Risky emotions dominate recent psychology entries.");
    recommendations.push("Pause when fear, greed, FOMO, revenge, anxiety, or tiredness is present before entry.");
  }

  if (revengeAvoidance < 75) {
    warnings.push("Potential revenge-trading patterns were detected.");
    recommendations.push("Use a mandatory cooldown after losses before opening another trade.");
  }

  const totalScore = clampScore(
    ruleAdherence * 0.3 +
    riskControl * 0.25 +
    emotionBalance * 0.2 +
    revengeAvoidance * 0.15 +
    timeDiscipline * 0.1,
  );

  if (!recommendations.length) {
    recommendations.push("Keep using psychology notes and risk limits to maintain discipline quality.");
  }

  const summary =
    totalScore >= 80
      ? "Discipline is strong across rule adherence, risk control, and behavioral inputs."
      : totalScore >= 60
        ? "Discipline is workable, but one or more behavioral or risk-control areas needs attention."
        : "Discipline risk is elevated. Reduce risk and focus on checklist execution before increasing activity.";

  return {
    rule_adherence: clampScore(ruleAdherence),
    risk_control: clampScore(riskControl),
    emotion_balance: clampScore(emotionBalance),
    revenge_avoidance: clampScore(revengeAvoidance),
    time_discipline: clampScore(timeDiscipline),
    total_score: totalScore,
    summary,
    warnings,
    recommendations: [...new Set(recommendations)],
  };
}

export function summarizeDisciplineHistory(scores: Array<{ total_score: number | null }>) {
  return average(scores.map((score) => Number(score.total_score)).filter(Number.isFinite));
}
