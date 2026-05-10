import type { TradingAccount } from "@/lib/accounts/types";
import type { EconomicEvent } from "@/lib/calendar/types";
import type { NewsRiskLevel } from "@/lib/calendar/news-risk";
import type { DisciplineScore } from "@/lib/discipline/types";
import type { TradePsychology } from "@/lib/psychology/types";
import type { RevengeEvent } from "@/lib/revenge/types";
import type { TradeRuleCheckWithRule } from "@/lib/rules/types";
import type { Strategy } from "@/lib/strategies/types";
import type { Trade } from "@/lib/trading/types";

export type TradeLifecycleStage = "before_trade" | "trade_entry" | "after_trade" | "review" | "improvement";
export type TradeReadinessStatus = "allowed" | "caution" | "blocked" | "not_enough_data";
export type ContextAvailability = "available" | "missing" | "not_connected" | "not_applicable";

export interface TradeQualityScore {
  status: TradeReadinessStatus;
  score: number;
  main_risks: string[];
  recommendations: string[];
}

export interface RiskContext {
  status: ContextAvailability;
  risk_percent: number | null;
  rr: number | null;
  has_stop_loss: boolean;
  has_take_profit: boolean;
  summary: string;
}

export interface NewsContext {
  status: ContextAvailability | "sample";
  risk_level: NewsRiskLevel | "Unknown";
  nearby_events_count: number;
  high_impact_events_count: number;
  summary: string;
  events: EconomicEvent[];
}

export interface PsychologyContext {
  status: ContextAvailability;
  emotion_before: string | null;
  confidence_level: number | null;
  stress_level: number | null;
  fomo_score: number | null;
  risk_level: "low" | "medium" | "high" | "unknown";
  summary: string;
}

export interface RulesContext {
  status: ContextAvailability;
  total_checks: number;
  passed_checks: number;
  failed_checks: number;
  failed_rules: string[];
  adherence: number | null;
  checks: TradeRuleCheckWithRule[];
}

export interface StrategyContext {
  status: "linked" | "not_linked";
  strategy_id: string | null;
  name: string | null;
  rules_json: Strategy["rules_json"] | null;
}

export interface AccountContext {
  status: "manual" | "linked" | "not_connected";
  account_id: string | null;
  provider: string;
  account_name: string;
  source: string | null;
}

export interface DisciplineContext {
  status: ContextAvailability;
  total_score: number | null;
  rule_adherence: number | null;
  risk_control: number | null;
  emotion_balance: number | null;
  latest_score: DisciplineScore | null;
}

export interface RevengeContext {
  status: ContextAvailability;
  events_count: number;
  max_score: number | null;
  trade_is_involved: boolean;
  events: RevengeEvent[];
}

export interface PropReadinessContextPlaceholder {
  status: "not_available";
  reason: string;
}

export interface TradingOSContext {
  lifecycle_stage: TradeLifecycleStage;
  trade_id: string | null;
  symbol: string | null;
  account: AccountContext;
  strategy: StrategyContext;
  risk: RiskContext;
  news: NewsContext;
  psychology: PsychologyContext;
  rules: RulesContext;
  discipline: DisciplineContext;
  revenge: RevengeContext;
  data_availability: {
    trade: boolean;
    account: boolean;
    strategy: boolean;
    risk: boolean;
    news: boolean;
    psychology: boolean;
    rule_checks: boolean;
    discipline_score: boolean;
    revenge_events: boolean;
    market_data: false;
  };
  prop_readiness: PropReadinessContextPlaceholder;
}

export interface BuildTradeContextInput {
  lifecycleStage?: TradeLifecycleStage;
  trade?: Trade | null;
  account?: TradingAccount | null;
  strategy?: Strategy | null;
  psychology?: TradePsychology | null;
  ruleChecks?: TradeRuleCheckWithRule[];
  economicEvents?: EconomicEvent[];
  latestDisciplineScore?: DisciplineScore | null;
  revengeEvents?: RevengeEvent[];
}
