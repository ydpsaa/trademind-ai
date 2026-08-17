import type {
  PropReadinessCalculation,
  PropReadinessCalculationInput,
  PropReadinessProfile,
  PropViolationCandidate,
} from "@/lib/prop-readiness/types";
import type { Trade } from "@/lib/trading/types";

interface ClosedTradePoint {
  trade: Trade;
  occurredAt: string;
  pnl: number;
  dayKey: string;
}

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function round(value: number, digits = 2) {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function numberValue(value: number | string | null | undefined, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function localDateParts(date: Date, timeZone: string) {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(date);
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return {
      year: Number(values.year),
      month: Number(values.month),
      day: Number(values.day),
      hour: Number(values.hour),
      minute: Number(values.minute),
    };
  } catch {
    return {
      year: date.getUTCFullYear(),
      month: date.getUTCMonth() + 1,
      day: date.getUTCDate(),
      hour: date.getUTCHours(),
      minute: date.getUTCMinutes(),
    };
  }
}

export function getPropTradingDayKey(dateInput: string | Date, profile: Pick<PropReadinessProfile, "timezone" | "trading_day_start_time">) {
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (Number.isNaN(date.getTime())) return "invalid-date";
  const parts = localDateParts(date, profile.timezone || "UTC");
  const [startHour = 0, startMinute = 0] = (profile.trading_day_start_time || "00:00").split(":").map(Number);
  const localAsUtc = new Date(Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute));
  localAsUtc.setUTCMinutes(localAsUtc.getUTCMinutes() - (startHour * 60 + startMinute));
  return localAsUtc.toISOString().slice(0, 10);
}

function getClosedTradePoints(trades: Trade[], profile: PropReadinessProfile) {
  return trades
    .map((trade): ClosedTradePoint | null => {
      const isClosed = Boolean(trade.closed_at) || trade.result === "Win" || trade.result === "Loss" || trade.result === "Breakeven";
      const occurredAt = trade.closed_at || trade.opened_at || trade.created_at;
      const pnl = Number(trade.pnl);
      if (!isClosed || !occurredAt || !Number.isFinite(pnl)) return null;
      if (profile.started_at && new Date(occurredAt) < new Date(profile.started_at)) return null;
      return { trade, occurredAt, pnl, dayKey: getPropTradingDayKey(occurredAt, profile) };
    })
    .filter((point): point is ClosedTradePoint => Boolean(point))
    .sort((a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime());
}

function createRiskViolations(points: ClosedTradePoint[], profile: PropReadinessProfile) {
  return points.flatMap<PropViolationCandidate>((point) => {
    const risk = numberValue(point.trade.risk_percent, -1);
    if (risk < 0 || risk <= profile.max_risk_per_trade_percent) return [];
    return [{
      trade_id: point.trade.id,
      violation_key: `risk_per_trade:${point.trade.id}`,
      violation_type: "risk_per_trade",
      severity: risk >= profile.max_risk_per_trade_percent * 1.5 ? "breach" : "warning",
      limit_value: profile.max_risk_per_trade_percent,
      actual_value: round(risk),
      message: `Recorded risk of ${round(risk)}% exceeded the ${profile.max_risk_per_trade_percent}% profile limit.`,
      occurred_at: point.occurredAt,
    }];
  });
}

export function calculatePropReadiness(input: PropReadinessCalculationInput): PropReadinessCalculation {
  const { profile } = input;
  const now = input.now ?? new Date();
  const points = getClosedTradePoints(input.trades, profile);
  const initialBalance = numberValue(profile.initial_balance);
  const dailyLossLimit = initialBalance * numberValue(profile.max_daily_loss_percent) / 100;
  const maxDrawdownAmount = initialBalance * numberValue(profile.max_total_drawdown_percent) / 100;
  const profitTargetAmount = initialBalance * numberValue(profile.profit_target_percent) / 100;
  const pnlByDay = new Map<string, number>();
  const violations: PropViolationCandidate[] = createRiskViolations(points, profile);
  let currentBalance = initialBalance;
  let peakBalance = initialBalance;

  for (const point of points) {
    currentBalance += point.pnl;
    peakBalance = Math.max(peakBalance, currentBalance);
    pnlByDay.set(point.dayKey, (pnlByDay.get(point.dayKey) ?? 0) + point.pnl);

    const drawdownReference = profile.drawdown_type === "trailing" ? peakBalance : initialBalance;
    const drawdownLimit = profile.drawdown_type === "trailing"
      ? drawdownReference * numberValue(profile.max_total_drawdown_percent) / 100
      : maxDrawdownAmount;
    const floor = drawdownReference - drawdownLimit;
    if (currentBalance < floor) {
      violations.push({
        trade_id: point.trade.id,
        violation_key: `max_drawdown:${point.trade.id}`,
        violation_type: "max_drawdown",
        severity: "breach",
        limit_value: round(floor),
        actual_value: round(currentBalance),
        message: `Estimated closed-trade balance fell below the ${profile.drawdown_type} drawdown floor.`,
        occurred_at: point.occurredAt,
      });
    }
  }

  for (const [dayKey, dayPnl] of pnlByDay) {
    if (dayPnl < -dailyLossLimit) {
      violations.push({
        trade_id: null,
        violation_key: `daily_loss:${dayKey}`,
        violation_type: "daily_loss",
        severity: "breach",
        limit_value: round(dailyLossLimit),
        actual_value: round(Math.abs(dayPnl)),
        message: `Estimated loss for trading day ${dayKey} exceeded the daily loss limit.`,
        occurred_at: `${dayKey}T23:59:59.000Z`,
      });
    }
  }

  const totalPnl = round(currentBalance - initialBalance);
  const todayKey = getPropTradingDayKey(now, profile);
  const todayPnl = round(pnlByDay.get(todayKey) ?? 0);
  const todayLoss = Math.max(0, -todayPnl);
  const dailyLossUsedPercent = dailyLossLimit > 0 ? round(todayLoss / dailyLossLimit * 100) : 0;
  const dailyLossRemaining = round(Math.max(0, dailyLossLimit - todayLoss));
  const drawdownReference = profile.drawdown_type === "trailing" ? peakBalance : initialBalance;
  const activeDrawdownLimit = profile.drawdown_type === "trailing"
    ? drawdownReference * numberValue(profile.max_total_drawdown_percent) / 100
    : maxDrawdownAmount;
  const activeDrawdown = Math.max(0, drawdownReference - currentBalance);
  const drawdownUsedPercent = activeDrawdownLimit > 0 ? round(activeDrawdown / activeDrawdownLimit * 100) : 0;
  const drawdownRemaining = round(Math.max(0, activeDrawdownLimit - activeDrawdown));
  const profitTargetProgress = profitTargetAmount > 0 ? round(clamp(totalPnl / profitTargetAmount * 100)) : 0;
  const positiveDays = [...pnlByDay.values()].filter((value) => value > 0);
  const totalPositivePnl = positiveDays.reduce((sum, value) => sum + value, 0);
  const largestWinningDay = positiveDays.length ? Math.max(...positiveDays) : 0;
  const largestDayShare = totalPositivePnl > 0 ? largestWinningDay / totalPositivePnl * 100 : 0;
  const consistencyLimit = profile.consistency_rule_percent;
  const consistencyScore = consistencyLimit && totalPositivePnl > 0
    ? round(clamp(100 - Math.max(0, largestDayShare - consistencyLimit) * 2))
    : null;

  if (consistencyLimit && largestDayShare > consistencyLimit) {
    violations.push({
      trade_id: null,
      violation_key: `consistency:${todayKey}`,
      violation_type: "consistency",
      severity: largestDayShare > consistencyLimit * 1.25 ? "breach" : "warning",
      limit_value: consistencyLimit,
      actual_value: round(largestDayShare),
      message: `Largest winning day represents ${round(largestDayShare)}% of positive PnL, above the ${consistencyLimit}% consistency limit.`,
      occurred_at: now.toISOString(),
    });
  }

  const disciplineScore = input.latestDisciplineScore?.total_score == null ? null : numberValue(input.latestDisciplineScore.total_score);
  const revengeRisk = (input.revengeEvents ?? []).reduce<number | null>((max, event) => {
    const score = numberValue(event.revenge_score, -1);
    if (score < 0) return max;
    return max === null ? score : Math.max(max, score);
  }, null);
  const hardBreach = violations.some((violation) => violation.severity === "breach" && (violation.violation_type === "daily_loss" || violation.violation_type === "max_drawdown"));
  const riskViolationCount = violations.filter((violation) => violation.violation_type === "risk_per_trade").length;
  const warnings: string[] = [];
  const recommendations: string[] = [];
  let readinessStatus: "ready" | "caution" | "high_risk" | "blocked" | "not_enough_data" = "ready";
  let readinessScore: number | null = null;

  if (!points.length) {
    readinessStatus = "not_enough_data";
    warnings.push("No closed trades with PnL are available for this profile.");
    recommendations.push("Add or import closed trades for the linked account, then recalculate.");
  } else {
    const dailySafety = clamp(100 - dailyLossUsedPercent);
    const drawdownSafety = clamp(100 - drawdownUsedPercent);
    const riskAdherence = clamp(100 - riskViolationCount / points.length * 100);
    const disciplineComponent = disciplineScore ?? 75;
    const revengeSafety = revengeRisk === null ? 75 : clamp(100 - revengeRisk * 100);
    const consistencyComponent = consistencyScore ?? 75;
    readinessScore = Math.round(
      dailySafety * 0.25 +
      drawdownSafety * 0.25 +
      riskAdherence * 0.2 +
      disciplineComponent * 0.12 +
      revengeSafety * 0.1 +
      consistencyComponent * 0.08,
    );

    if (hardBreach) readinessStatus = "blocked";
    else if (dailyLossUsedPercent >= 90 || drawdownUsedPercent >= 90 || (revengeRisk ?? 0) >= 0.8) readinessStatus = "high_risk";
    else if (dailyLossUsedPercent >= 75 || drawdownUsedPercent >= 75 || riskViolationCount > 0 || (disciplineScore !== null && disciplineScore < 50) || violations.some((item) => item.violation_type === "consistency")) readinessStatus = "caution";

    if (dailyLossUsedPercent >= 75) warnings.push("Estimated daily loss usage is near or above the caution threshold.");
    if (drawdownUsedPercent >= 75) warnings.push("Estimated drawdown usage is near or above the caution threshold.");
    if (riskViolationCount) warnings.push(`${riskViolationCount} trade${riskViolationCount === 1 ? "" : "s"} exceeded the profile risk-per-trade limit.`);
    if ((revengeRisk ?? 0) >= 0.7) warnings.push("Recent history contains an elevated revenge pattern.");
    if (readinessStatus === "blocked") recommendations.push("Stop new risk and reconcile the account with the prop firm dashboard before trading again.");
    else if (readinessStatus === "high_risk") recommendations.push("Reduce exposure and verify remaining limits before another trade.");
    else if (readinessStatus === "caution") recommendations.push("Review active warnings and reduce risk before entering.");
    else recommendations.push("Current journal evidence is within the configured profile limits.");
  }

  if (profile.minimum_trading_days > pnlByDay.size) {
    recommendations.push(`${profile.minimum_trading_days - pnlByDay.size} more trading day${profile.minimum_trading_days - pnlByDay.size === 1 ? " is" : "s are"} needed for the configured minimum.`);
  }

  const summary = readinessStatus === "not_enough_data"
    ? "Not enough closed-trade data to calculate Prop Readiness."
    : readinessStatus === "blocked"
      ? "One or more estimated hard limits have been breached. Verify against the prop firm dashboard."
      : readinessStatus === "high_risk"
        ? "Estimated limits are close to breach or behavioral risk is elevated."
        : readinessStatus === "caution"
          ? "The account remains measurable, but one or more configured rules needs review."
          : "Closed-trade journal data is within the configured Prop Profile limits.";

  return {
    snapshot: {
      trading_account_id: profile.trading_account_id,
      snapshot_at: now.toISOString(),
      current_balance: round(currentBalance),
      current_equity: round(currentBalance),
      peak_balance: round(peakBalance),
      total_pnl: totalPnl,
      today_pnl: todayPnl,
      profit_target_progress: profitTargetProgress,
      daily_loss_used_percent: dailyLossUsedPercent,
      daily_loss_remaining: dailyLossRemaining,
      drawdown_used_percent: drawdownUsedPercent,
      drawdown_remaining: drawdownRemaining,
      trading_days_count: pnlByDay.size,
      consistency_score: consistencyScore,
      discipline_score: disciplineScore,
      revenge_risk: revengeRisk,
      readiness_score: readinessScore,
      readiness_status: readinessStatus,
      data_quality: points.length ? "estimated" : "not_enough_data",
      summary,
      warnings: [...new Set(warnings)],
      recommendations: [...new Set(recommendations)],
    },
    violations,
    closedTradesCount: points.length,
  };
}
