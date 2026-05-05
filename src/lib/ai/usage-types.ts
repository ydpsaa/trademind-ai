export type AIUsageStatus = "success" | "fallback" | "error";
export type AIFeature = "trade_review" | "weekly_report" | "ai_coach" | "ocr" | "vector_memory" | "strategy_coach" | "other";

export interface AIUsageLog {
  id: string;
  user_id: string;
  feature: AIFeature | string;
  provider: string | null;
  model: string | null;
  generation_source: string | null;
  input_tokens: number | null;
  output_tokens: number | null;
  estimated_cost: number | null;
  status: AIUsageStatus | string;
  error_message: string | null;
  created_at: string;
}

export interface AIUsageLogInput {
  user_id: string;
  feature: AIFeature | string;
  provider?: string | null;
  model?: string | null;
  generation_source?: string | null;
  input_tokens?: number | null;
  output_tokens?: number | null;
  estimated_cost?: number | null;
  status?: AIUsageStatus | string;
  error_message?: string | null;
}
