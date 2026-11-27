export type Bar = Readonly<{ time: number; open: number; high: number; low: number; close: number; volume?: number }>;
export type Market = Readonly<Record<string, readonly Bar[]>>;
export type Weights = Readonly<Record<string, number>>;
export type Signal = Readonly<{ weights: Weights; reason: string }>;
export type Strategy = (market: Market, index: number, previous: Weights) => Signal | null;
export type DataProvenance = Readonly<{ kind: 'synthetic' | 'historical'; source: string; datasetId: string }>;
export type EquityPoint = Readonly<{ time: number; equity: number; drawdown: number }>;
export type Fill = Readonly<{ time: number; symbol: string; quantity: number; referencePrice: number; price: number; commission: number; reason: string }>;
export type BacktestConfig = Readonly<{ initialCapital: number; feeBps: number; slippageBps: number; maxGross?: number; provenance: DataProvenance }>;
