import type { DisciplineScore } from "@/lib/discipline/types";
import type { RevengeEvent } from "@/lib/revenge/types";
import type { Trade } from "@/lib/trading/types";

export type PropAccountScope = "manual" | "account";
export type PropDrawdownType = "static" | "trailing";
export type PropProfileStatus = "active" | "paused" | "completed" | "failed";
export type PropReadinessStatus = "ready" | "caution" | "high_risk" | "blocked" | "not_enough_data";
export type PropDataQuality = "estimated" | "not_enough_data";
export type PropViolationType = "daily_loss" | "max_drawdown" | "risk_per_trade" | "consistency";
export type PropViolationSeverity = "warning" | "breach";

export interface PropReadinessProfile {
  id: string;
  user_id: string;
  trading_account_id: string | null;
  account_scope: PropAccountScope;
  name: string;
  initial_balance: number;
  profit_target_percent: number;
  max_daily_loss_percent: number;
  max_total_drawdown_percent: number;
  drawdown_type: PropDrawdownType;
  minimum_trading_days: number;
  max_risk_per_trade_percent: number;
  consistency_rule_percent: number | null;
  timezone: string;
  trading_day_start_time: string;
  status: PropProfileStatus;
  started_at: string;
  created_at: string;
  updated_at: string;
}

export interface PropReadinessSnapshot {
  id: string;
  user_id: string;
  profile_id: string;
  trading_account_id: string | null;
  snapshot_at: string;
  current_balance: number;
  current_equity: number;
  peak_balance: number;
  total_pnl: number;
  today_pnl: number;
  profit_target_progress: number;
  daily_loss_used_percent: number;
  daily_loss_remaining: number;
  drawdown_used_percent: number;
  drawdown_remaining: number;
  trading_days_count: number;
  consistency_score: number | null;
  discipline_score: number | null;
  revenge_risk: number | null;
  readiness_score: number | null;
  readiness_status: PropReadinessStatus;
  data_quality: PropDataQuality;
  summary: string | null;
  warnings: string[];
  recommendations: string[];
  created_at: string;
}

export interface PropRuleViolation {
  id: string;
  user_id: string;
  profile_id: string;
  trading_account_id: string | null;
  trade_id: string | null;
  violation_key: string;
  violation_type: PropViolationType;
  severity: PropViolationSeverity;
  limit_value: number | null;
  actual_value: number | null;
  message: string;
  occurred_at: string;
  created_at: string;
}

export type PropViolationCandidate = Omit<PropRuleViolation, "id" | "user_id" | "profile_id" | "trading_account_id" | "created_at">;

export interface PropReadinessCalculationInput {
  profile: PropReadinessProfile;
  trades: Trade[];
  latestDisciplineScore?: DisciplineScore | null;
  revengeEvents?: RevengeEvent[];
  now?: Date;
}

export interface PropReadinessCalculation {
  snapshot: Omit<PropReadinessSnapshot, "id" | "user_id" | "profile_id" | "created_at">;
  violations: PropViolationCandidate[];
  closedTradesCount: number;
}

export interface PropProfileFormState {
  error?: string;
  success?: boolean;
}

export interface PropReadinessContext {
  status: "available" | "not_available";
  profile_id: string | null;
  profile_name: string | null;
  readiness_status: PropReadinessStatus | "not_available";
  readiness_score: number | null;
  daily_loss_used_percent: number | null;
  daily_loss_remaining: number | null;
  drawdown_used_percent: number | null;
  drawdown_remaining: number | null;
  profit_target_progress: number | null;
  data_quality: PropDataQuality | "not_available";
  active_violations: Array<Pick<PropRuleViolation, "violation_type" | "severity" | "message">>;
  summary: string;
}
