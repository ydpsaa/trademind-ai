export type PlanName = "Free" | "Pro" | "Trader+" | "Team";

export interface Plan {
  id: string;
  name: PlanName | string;
  price_monthly: number;
  trade_limit: number | null;
  ai_reviews_limit: number | null;
  vector_memory_enabled: boolean;
  revenge_index_enabled: boolean;
  ocr_enabled: boolean;
  backtest_enabled: boolean;
  team_enabled: boolean;
  created_at: string;
}

export interface UserUsage {
  id: string;
  user_id: string;
  period_start: string;
  period_end: string;
  trades_count: number;
  ai_reviews_count: number;
  ocr_count: number;
  created_at: string;
  updated_at: string;
}

export interface UserUsageInput {
  period_start: string;
  period_end: string;
  trades_count?: number;
  ai_reviews_count?: number;
  ocr_count?: number;
}
