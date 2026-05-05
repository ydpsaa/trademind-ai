export const emotionValues = ["neutral", "confident", "fear", "greed", "fomo", "revenge", "tired", "anxious"] as const;

export type TradeEmotion = (typeof emotionValues)[number];

export interface TradePsychology {
  id: string;
  user_id: string;
  trade_id: string;
  emotion_before: string | null;
  emotion_after: string | null;
  confidence_level: number | null;
  stress_level: number | null;
  fomo_score: number | null;
  discipline_note: string | null;
  created_at: string;
  updated_at: string;
}

export interface TradePsychologyInput {
  trade_id: string;
  user_id?: string;
  emotion_before?: string | null;
  emotion_after?: string | null;
  confidence_level?: number | null;
  stress_level?: number | null;
  fomo_score?: number | null;
  discipline_note?: string | null;
}

export function isTradeEmotion(value: string | null | undefined): value is TradeEmotion {
  return Boolean(value && emotionValues.includes(value as TradeEmotion));
}
