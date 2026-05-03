import type { MarketScanResult, MarketSymbol, NewsRiskLevel } from "@/lib/scanner/types";
import type { Strategy, StrategyRules } from "@/lib/strategies/types";

export type SignalDirection = "Long" | "Short";
export type SignalStatus = "watching" | "forming" | "ready" | "dismissed" | "archived";
export type SignalConfidenceBand = "All" | "70+" | "80+" | "90+";
export type SignalSetupType = "BOS + FVG Continuation" | "Liquidity Sweep Reversal" | "Order Block Retest" | "Session Continuation";

export interface Signal {
  id: string;
  user_id: string;
  strategy_id: string | null;
  symbol: string;
  market_type: string | null;
  direction: SignalDirection;
  entry_zone: string | null;
  stop_loss: number | null;
  take_profit: number | null;
  confidence: number | null;
  reasoning: string | null;
  status: SignalStatus;
  news_risk: NewsRiskLevel | null;
  setup_type: string | null;
  timeframe: string | null;
  engine_type: string | null;
  scanner_snapshot: MarketScanResult | null;
  created_at: string | null;
  updated_at: string | null;
  strategies?: { name: string | null } | null;
}

export interface SignalInput {
  strategy: Strategy;
  rules: StrategyRules;
  scanner: MarketScanResult;
}

export interface SignalEngineResult {
  strategy_id: string;
  symbol: MarketSymbol;
  market_type: string;
  direction: SignalDirection;
  entry_zone: string;
  stop_loss: number;
  take_profit: number;
  confidence: number;
  reasoning: string;
  status: SignalStatus;
  news_risk: NewsRiskLevel;
  setup_type: SignalSetupType;
  timeframe: string;
  engine_type: "simulated";
  scanner_snapshot: MarketScanResult;
}

export interface SignalFilterState {
  symbol: MarketSymbol | "All";
  direction: SignalDirection | "All";
  status: SignalStatus | "All";
  confidence: SignalConfidenceBand;
  newsRisk: NewsRiskLevel | "All";
}

export interface SignalActionState {
  error?: string;
  success?: boolean;
}

export const signalStatuses: SignalStatus[] = ["watching", "forming", "ready", "dismissed", "archived"];
export const signalDirections: SignalDirection[] = ["Long", "Short"];
export const signalConfidenceBands: SignalConfidenceBand[] = ["All", "70+", "80+", "90+"];
