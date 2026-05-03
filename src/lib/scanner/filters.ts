import type { MarketBias, MarketScanResult, MarketType, NewsRiskLevel, ScannerFilterState, ScannerSignalState, ScannerTimeframe } from "@/lib/scanner/types";
import { scannerBiases, scannerMarketTypes, scannerNewsRisks, scannerSetups, scannerTimeframes } from "@/lib/scanner/types";

function oneOf<T extends string>(value: string | string[] | undefined, allowed: readonly T[], fallback: T | "All") {
  const normalized = Array.isArray(value) ? value[0] : value;
  return normalized && allowed.includes(normalized as T) ? (normalized as T) : fallback;
}

export function parseScannerFilters(params: Record<string, string | string[] | undefined>): ScannerFilterState {
  return {
    marketType: oneOf(params.marketType, scannerMarketTypes, "All") as MarketType | "All",
    bias: oneOf(params.bias, scannerBiases, "All") as MarketBias | "All",
    setupReadiness: oneOf(params.setup, scannerSetups, "All") as ScannerSignalState | "All",
    newsRiskLevel: oneOf(params.newsRisk, scannerNewsRisks, "All") as NewsRiskLevel | "All",
    timeframe: oneOf(params.timeframe, scannerTimeframes, "15m") as ScannerTimeframe,
  };
}

export function filterMarketScans(results: MarketScanResult[], filters: ScannerFilterState) {
  return results.filter((result) => {
    if (filters.marketType !== "All" && result.marketType !== filters.marketType) return false;
    if (filters.bias !== "All" && result.bias !== filters.bias) return false;
    if (filters.setupReadiness !== "All" && result.setupReadiness !== filters.setupReadiness) return false;
    if (filters.newsRiskLevel !== "All" && result.newsRiskLevel !== filters.newsRiskLevel) return false;
    return true;
  });
}

export function scannerFilterHref(current: ScannerFilterState, key: keyof ScannerFilterState, value: string) {
  const next = new URLSearchParams();
  const state = { ...current, [key]: value };

  if (state.marketType !== "All") next.set("marketType", state.marketType);
  if (state.bias !== "All") next.set("bias", state.bias);
  if (state.setupReadiness !== "All") next.set("setup", state.setupReadiness);
  if (state.newsRiskLevel !== "All") next.set("newsRisk", state.newsRiskLevel);
  if (state.timeframe !== "15m") next.set("timeframe", state.timeframe);

  const query = next.toString();
  return query ? `/market-scanner?${query}` : "/market-scanner";
}

export function getBiasTone(bias: MarketBias) {
  if (bias === "bullish") return "positive";
  if (bias === "bearish") return "negative";
  return "neutral";
}

export function getSetupTone(setup: ScannerSignalState) {
  if (setup === "ready") return "positive";
  if (setup === "forming") return "warning";
  return "neutral";
}

export function getNewsRiskTone(risk: NewsRiskLevel) {
  if (risk === "extreme" || risk === "high") return "negative";
  if (risk === "medium") return "warning";
  return "positive";
}
