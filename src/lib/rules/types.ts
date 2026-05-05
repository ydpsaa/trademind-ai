export type TradingRuleType = "manual_check" | "auto_check";
export type AutoCheckField = "risk_percent" | "fomo_score" | "news_risk" | "trades_per_day" | "cooldown_after_loss";
export type AutoCheckOperator = "lte" | "gte" | "eq";

export interface RuleAutoCondition {
  field: AutoCheckField;
  operator: AutoCheckOperator;
  value: number | string;
}

export interface TradingRule {
  id: string;
  user_id: string;
  text: string;
  type: TradingRuleType;
  auto_condition: RuleAutoCondition | Record<string, unknown> | null;
  active: boolean;
  violation_count: number;
  streak_days: number;
  created_at: string;
  updated_at: string;
}

export interface TradeRuleCheck {
  id: string;
  user_id: string;
  trade_id: string;
  rule_id: string;
  passed: boolean | null;
  violation_reason: string | null;
  created_at: string;
}

export interface TradingRuleInput {
  text: string;
  type?: TradingRuleType;
  auto_condition?: RuleAutoCondition | null;
  active?: boolean;
}

export interface TradeRuleCheckInput {
  trade_id: string;
  rule_id: string;
  passed?: boolean | null;
  violation_reason?: string | null;
}

export interface TradeRuleCheckWithRule extends TradeRuleCheck {
  trading_rules?: TradingRule | null;
}

export interface RuleStats {
  totalActiveRules: number;
  totalRuleChecks: number;
  passedChecks: number;
  failedChecks: number;
  ruleAdherence: number;
  topViolatedRule: string;
  currentStreakWithoutViolation: number;
}
