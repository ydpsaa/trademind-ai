import type { EconomicEvent } from "@/lib/calendar/types";
import type { TradePsychology } from "@/lib/psychology/types";
import type { RuleAutoCondition, TradeRuleCheckInput, TradingRule } from "@/lib/rules/types";
import type { Trade } from "@/lib/trading/types";

interface AutoCheckContext {
  trade: Pick<Trade, "id" | "risk_percent" | "opened_at" | "position_size" | "result" | "pnl">;
  psychology?: Partial<TradePsychology> | null;
  priorTrades?: Trade[];
  nearbyEconomicEvents?: EconomicEvent[];
}

function isAutoCondition(value: unknown): value is RuleAutoCondition {
  if (!value || typeof value !== "object") return false;
  const condition = value as Record<string, unknown>;
  return typeof condition.field === "string" && typeof condition.operator === "string" && condition.value !== undefined;
}

function compareNumber(actual: number | null, operator: string, expected: number) {
  if (actual === null || !Number.isFinite(actual)) return { passed: false, reason: "Required value is missing." };
  if (operator === "lte") return { passed: actual <= expected, reason: actual <= expected ? null : `Value ${actual} is above ${expected}.` };
  if (operator === "gte") return { passed: actual >= expected, reason: actual >= expected ? null : `Value ${actual} is below ${expected}.` };
  if (operator === "eq") return { passed: actual === expected, reason: actual === expected ? null : `Value ${actual} does not equal ${expected}.` };
  return { passed: false, reason: "Unsupported auto-check operator." };
}

function sameDay(left: string | null | undefined, right: string | null | undefined) {
  if (!left || !right) return false;
  return new Date(left).toDateString() === new Date(right).toDateString();
}

export function evaluateAutoCheck(rule: TradingRule, context: AutoCheckContext): TradeRuleCheckInput {
  const condition = isAutoCondition(rule.auto_condition) ? rule.auto_condition : null;
  if (!condition) {
    return { trade_id: context.trade.id, rule_id: rule.id, passed: false, violation_reason: "Auto-check condition is missing." };
  }

  let result: { passed: boolean; reason: string | null };

  if (condition.field === "risk_percent") {
    result = compareNumber(Number(context.trade.risk_percent), condition.operator, Number(condition.value));
  } else if (condition.field === "fomo_score") {
    result = compareNumber(Number(context.psychology?.fomo_score), condition.operator, Number(condition.value));
  } else if (condition.field === "trades_per_day") {
    const count = (context.priorTrades ?? []).filter((trade) => sameDay(trade.opened_at, context.trade.opened_at)).length + 1;
    result = compareNumber(count, condition.operator, Number(condition.value));
  } else if (condition.field === "cooldown_after_loss") {
    const minutes = Number(condition.value);
    const openedAt = context.trade.opened_at ? new Date(context.trade.opened_at).getTime() : 0;
    const recentLoss = (context.priorTrades ?? []).some((trade) => {
      const tradeTime = trade.closed_at || trade.opened_at;
      if (!tradeTime || (trade.result !== "Loss" && !(Number(trade.pnl) < 0))) return false;
      const gap = (openedAt - new Date(tradeTime).getTime()) / 60_000;
      return gap >= 0 && gap <= minutes;
    });
    result = { passed: !recentLoss, reason: recentLoss ? `Trade opened within ${minutes} minutes after a loss.` : null };
  } else if (condition.field === "news_risk") {
    const hasHighImpactNews = (context.nearbyEconomicEvents ?? []).some((event) => event.impact === "High");
    result = { passed: !hasHighImpactNews, reason: hasHighImpactNews ? "High-impact news detected near trade open time." : null };
  } else {
    result = { passed: false, reason: "Unsupported auto-check field." };
  }

  return {
    trade_id: context.trade.id,
    rule_id: rule.id,
    passed: result.passed,
    violation_reason: result.passed ? null : result.reason,
  };
}
