import type { StrategyRules } from "@/lib/strategies/types";

export type BacktestTimeframe = "1m" | "5m" | "15m" | "1h" | "4h" | "1D";

export interface BacktestInput {
  strategyId: string;
  strategyName: string;
  symbol: string;
  marketType: string;
  timeframe: BacktestTimeframe;
  periodStart: string;
  periodEnd: string;
  initialBalance: number;
  riskPerTrade: number;
  minimumRr: number;
  strategyRules: StrategyRules;
}

export interface EquityPoint {
  index: number;
  date: string;
  balance: number;
}

export interface SimulatedTrade {
  id: string;
  openedAt: string;
  symbol: string;
  direction: "Long" | "Short";
  result: "Win" | "Loss" | "Breakeven";
  rr: number;
  pnl: number;
  balanceAfter: number;
}

export interface BacktestReport {
  engineType: "simulated";
  equityCurve: EquityPoint[];
  simulatedTrades: SimulatedTrade[];
  summary: string;
  warnings: string[];
  strategySnapshot: {
    id: string;
    name: string;
    rules: StrategyRules;
  };
  input: BacktestInput;
}

export interface BacktestResult {
  finalBalance: number;
  totalTrades: number;
  winrate: number;
  profitFactor: number;
  maxDrawdown: number;
  avgRr: number;
  report: BacktestReport;
}

export interface BacktestRow {
  id: string;
  user_id: string;
  strategy_id: string | null;
  symbol: string | null;
  timeframe: string | null;
  period_start: string | null;
  period_end: string | null;
  initial_balance: number | null;
  final_balance: number | null;
  total_trades: number | null;
  winrate: number | null;
  profit_factor: number | null;
  max_drawdown: number | null;
  avg_rr: number | null;
  report_json: BacktestReport | null;
  engine_type?: string | null;
  created_at: string | null;
  strategies?: { name: string | null } | null;
}

export interface BacktestFormState {
  error?: string;
  success?: boolean;
}

export const backtestSymbols = ["XAUUSD", "EURUSD", "GBPUSD", "NAS100", "US30", "BTCUSDT", "ETHUSDT"];
export const backtestMarkets = ["Forex", "Gold", "Indices", "Crypto"];
export const backtestTimeframes: BacktestTimeframe[] = ["1m", "5m", "15m", "1h", "4h", "1D"];
