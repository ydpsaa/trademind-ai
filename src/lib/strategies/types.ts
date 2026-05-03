export type DirectionBias = "trend-following" | "reversal" | "both";
export type EntryModel = "fvg-retest" | "order-block-retest" | "liquidity-sweep-confirmation" | "manual";
export type StopLossModel = "swing-high-low" | "order-block-invalid" | "fixed-pips" | "manual";
export type TakeProfitModel = "next-liquidity" | "fixed-rr" | "session-high-low" | "manual";

export interface StrategyRules {
  markets: string[];
  symbols: string[];
  sessions: string[];
  directionBias: DirectionBias;
  requiresBos: boolean;
  requiresChoch: boolean;
  requiresLiquiditySweep: boolean;
  requiresFvg: boolean;
  requiresOrderBlock: boolean;
  minimumRr: number;
  maxRiskPercent: number;
  avoidHighImpactNews: boolean;
  newsBufferMinutes: number;
  entryModel: EntryModel;
  stopLossModel: StopLossModel;
  takeProfitModel: TakeProfitModel;
}

export interface Strategy {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  rules_json: StrategyRules | null;
  is_active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface StrategyFormState {
  error?: string;
  success?: boolean;
}

export const marketOptions = ["Forex", "Gold", "Indices", "Crypto"];
export const symbolOptions = ["XAUUSD", "EURUSD", "NAS100", "US30", "BTCUSDT"];
export const sessionOptions = ["London", "New York", "Asia", "Other"];
