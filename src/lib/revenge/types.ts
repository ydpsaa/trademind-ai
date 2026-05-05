export interface RevengeEvent {
  id: string;
  user_id: string;
  previous_trade_id: string | null;
  next_trade_id: string | null;
  revenge_score: number | null;
  gap_minutes: number | null;
  size_increase_ratio: number | null;
  triggered_rules: string[] | null;
  created_at: string;
}

export interface RevengeEventInput {
  previous_trade_id?: string | null;
  next_trade_id?: string | null;
  revenge_score?: number | null;
  gap_minutes?: number | null;
  size_increase_ratio?: number | null;
  triggered_rules?: string[] | null;
}

export interface RevengeEventDetection {
  previous_trade_id: string;
  next_trade_id: string;
  revenge_score: number;
  gap_minutes: number;
  size_increase_ratio: number | null;
  triggered_rules: string[];
}
