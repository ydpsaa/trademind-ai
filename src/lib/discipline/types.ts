export type DisciplinePeriodType = "day" | "week" | "month" | "quarter" | "half-year" | "year";

export interface DisciplineScore {
  id: string;
  user_id: string;
  period_type: DisciplinePeriodType | string;
  period_start: string;
  period_end: string;
  rule_adherence: number | null;
  risk_control: number | null;
  emotion_balance: number | null;
  revenge_avoidance: number | null;
  time_discipline: number | null;
  total_score: number | null;
  created_at: string;
}

export interface DisciplineScoreResult {
  rule_adherence: number;
  risk_control: number;
  emotion_balance: number;
  revenge_avoidance: number;
  time_discipline: number;
  total_score: number;
  summary: string;
  warnings: string[];
  recommendations: string[];
}

export interface DisciplineScoreInput {
  period_type: DisciplinePeriodType | string;
  period_start: string;
  period_end: string;
  rule_adherence?: number | null;
  risk_control?: number | null;
  emotion_balance?: number | null;
  revenge_avoidance?: number | null;
  time_discipline?: number | null;
  total_score?: number | null;
}
