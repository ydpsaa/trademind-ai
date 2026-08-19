import type {
  MarketBias,
  MarketSymbol,
  MarketType,
  PremiumDiscountState,
  ScannerSignalState,
  ScannerTimeframe,
  StructureState,
} from "@/lib/scanner/types";

export type MarketDataProvider = "twelve-data";
export type MarketDataStatus = "connected" | "not_connected" | "error";

export interface MarketCandle {
  provider: MarketDataProvider;
  symbol: MarketSymbol;
  timeframe: ScannerTimeframe;
  openedAt: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number | null;
  isClosed: boolean;
  fetchedAt: string;
}
export interface MarketSnapshot {
  id: string;
  provider: MarketDataProvider;
  symbol: MarketSymbol;
  marketType: MarketType;
  timeframe: ScannerTimeframe;
  lastPrice: number;
  changePercent: number | null;
  bias: MarketBias;
  structureState: StructureState;
  bosDetected: boolean;
  chochDetected: boolean;
  liquiditySweepDetected: boolean;
  fvgDetected: boolean;
  orderBlockDetected: boolean;
  premiumDiscountState: PremiumDiscountState;
  setupReadiness: ScannerSignalState;
  confidence: number;
  candleCount: number;
  summary: string;
  keyLevels: Array<{ label: string; value: string }>;
  warnings: string[];
  sourceTime: string;
  fetchedAt: string;
  analysisVersion: string;
}

export interface MarketDataSyncResult {
  ok: boolean;
  status: MarketDataStatus;
  symbol: MarketSymbol;
  timeframe: ScannerTimeframe;
  fetchedCount: number;
  message: string;
}

export interface MarketSnapshotRow {
  id: string;
  provider: MarketDataProvider;
  symbol: MarketSymbol;
  market_type: MarketType;
  timeframe: ScannerTimeframe;
  last_price: number | string;
  change_percent: number | string | null;
  bias: MarketBias;
  structure_state: StructureState;
  bos_detected: boolean;
  choch_detected: boolean;
  liquidity_sweep_detected: boolean;
  fvg_detected: boolean;
  order_block_detected: boolean;
  premium_discount_state: PremiumDiscountState;
  setup_readiness: ScannerSignalState;
  confidence: number | string;
  candle_count: number;
  summary: string;
  key_levels: Array<{ label: string; value: string }> | null;
  warnings: string[] | null;
  source_time: string;
  fetched_at: string;
  analysis_version: string;
}
