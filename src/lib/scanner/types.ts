export type MarketSymbol = "XAUUSD" | "EURUSD" | "GBPUSD" | "NAS100" | "US30" | "BTCUSDT" | "ETHUSDT";
export type MarketType = "Gold" | "Forex" | "Indices" | "Crypto";
export type MarketBias = "bullish" | "bearish" | "neutral";
export type StructureState = "trending" | "ranging" | "reversal" | "unclear";
export type ScannerSignalState = "no-setup" | "watching" | "forming" | "ready";
export type PremiumDiscountState = "premium" | "discount" | "equilibrium" | "unknown";
export type NewsRiskLevel = "low" | "medium" | "high" | "extreme";
export type ScannerTimeframe = "5m" | "15m" | "1h" | "4h";

export interface KeyLevel {
  label: string;
  value: string;
}

export interface MarketScanResult {
  symbol: MarketSymbol;
  marketType: MarketType;
  timeframe: ScannerTimeframe;
  bias: MarketBias;
  structureState: StructureState;
  bosDetected: boolean;
  chochDetected: boolean;
  liquiditySweepDetected: boolean;
  fvgDetected: boolean;
  orderBlockDetected: boolean;
  premiumDiscountState: PremiumDiscountState;
  newsRiskLevel: NewsRiskLevel;
  setupReadiness: ScannerSignalState;
  confidence: number;
  summary: string;
  keyLevels: KeyLevel[];
  warnings: string[];
  updatedAt: string;
}

export interface ScannerFilterState {
  marketType: MarketType | "All";
  bias: MarketBias | "All";
  setupReadiness: ScannerSignalState | "All";
  newsRiskLevel: NewsRiskLevel | "All";
  timeframe: ScannerTimeframe;
}

export const scannerSymbols: MarketSymbol[] = ["XAUUSD", "EURUSD", "GBPUSD", "NAS100", "US30", "BTCUSDT", "ETHUSDT"];
export const scannerTimeframes: ScannerTimeframe[] = ["5m", "15m", "1h", "4h"];
export const scannerMarketTypes: MarketType[] = ["Forex", "Gold", "Indices", "Crypto"];
export const scannerBiases: MarketBias[] = ["bullish", "bearish", "neutral"];
export const scannerSetups: ScannerSignalState[] = ["watching", "forming", "ready", "no-setup"];
export const scannerNewsRisks: NewsRiskLevel[] = ["low", "medium", "high", "extreme"];
