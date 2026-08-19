import type { EconomicEvent } from "@/lib/calendar/types";
import { getMarketNewsRisk } from "@/lib/market-data/news-risk";
import type { MarketSnapshot } from "@/lib/market-data/types";
import type { MarketScanResult } from "@/lib/scanner/types";

export function marketSnapshotToScanResult(snapshot: MarketSnapshot, events: EconomicEvent[]): MarketScanResult {
  return {
    symbol: snapshot.symbol,
    marketType: snapshot.marketType,
    timeframe: snapshot.timeframe,
    bias: snapshot.bias,
    structureState: snapshot.structureState,
    bosDetected: snapshot.bosDetected,
    chochDetected: snapshot.chochDetected,
    liquiditySweepDetected: snapshot.liquiditySweepDetected,
    fvgDetected: snapshot.fvgDetected,
    orderBlockDetected: snapshot.orderBlockDetected,
    premiumDiscountState: snapshot.premiumDiscountState,
    newsRiskLevel: getMarketNewsRisk(snapshot.symbol, events),
    setupReadiness: snapshot.setupReadiness,
    confidence: snapshot.confidence,
    summary: snapshot.summary,
    keyLevels: snapshot.keyLevels,
    warnings: snapshot.warnings,
    updatedAt: snapshot.sourceTime,
  };
}
