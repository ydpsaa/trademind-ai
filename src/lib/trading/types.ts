import type { TradePsychology } from "@/lib/psychology/types";

export type JournalPeriod = "day" | "week" | "month" | "quarter" | "half-year" | "year";
export type JournalSource = "all" | "manual" | "imported";

export interface TradeJournalEntry {
  id: string;
  trade_id: string;
  user_id: string;
  reason_for_entry: string | null;
  emotion_before: string | null;
  emotion_after: string | null;
  screenshot_url: string | null;
  notes_before: string | null;
  notes_after: string | null;
  mistake_tags: string[] | null;
  setup_tags: string[] | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface Trade {
  id: string;
  user_id: string;
  trading_account_id: string | null;
  source: string | null;
  symbol: string;
  market_type: string | null;
  direction: string;
  entry_price: number | null;
  exit_price: number | null;
  stop_loss: number | null;
  take_profit: number | null;
  position_size: number | null;
  risk_percent: number | null;
  rr: number | null;
  pnl: number | null;
  fees: number | null;
  result: string | null;
  session: string | null;
  strategy_id: string | null;
  opened_at: string | null;
  closed_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  trade_journal_entries?: TradeJournalEntry[] | TradeJournalEntry | null;
  trade_psychology?: TradePsychology[] | TradePsychology | null;
}

export interface AITradeReview {
  id: string;
  trade_id: string;
  user_id: string;
  total_score: number | null;
  structure_score: number | null;
  liquidity_score: number | null;
  ict_score: number | null;
  risk_score: number | null;
  news_score: number | null;
  psychology_score: number | null;
  summary: string | null;
  strengths: string[] | null;
  weaknesses: string[] | null;
  recommendations: string[] | null;
  generation_source?: string | null;
  model?: string | null;
  created_at: string | null;
  trades?: Trade | null;
}
