import { scannerNewsRisks, scannerSymbols } from "@/lib/scanner/types";
import type { MarketSymbol, NewsRiskLevel } from "@/lib/scanner/types";
import type { Signal, SignalConfidenceBand, SignalDirection, SignalFilterState, SignalStatus } from "@/lib/signals/types";
import { signalConfidenceBands, signalDirections, signalStatuses } from "@/lib/signals/types";

function oneOf<T extends string>(value: string | string[] | undefined, allowed: readonly T[], fallback: T | "All") {
  const normalized = Array.isArray(value) ? value[0] : value;
  return normalized && allowed.includes(normalized as T) ? (normalized as T) : fallback;
}

export function parseSignalFilters(params: Record<string, string | string[] | undefined>): SignalFilterState {
  return {
    symbol: oneOf(params.symbol, scannerSymbols, "All") as MarketSymbol | "All",
    direction: oneOf(params.direction, signalDirections, "All") as SignalDirection | "All",
    status: oneOf(params.status, signalStatuses, "All") as SignalStatus | "All",
    confidence: oneOf(params.confidence, signalConfidenceBands, "All") as SignalConfidenceBand,
    newsRisk: oneOf(params.newsRisk, scannerNewsRisks, "All") as NewsRiskLevel | "All",
  };
}

export function filterSignals(signals: Signal[], filters: SignalFilterState) {
  const minConfidence = filters.confidence === "90+" ? 90 : filters.confidence === "80+" ? 80 : filters.confidence === "70+" ? 70 : 0;

  return signals.filter((signal) => {
    if (filters.symbol !== "All" && signal.symbol !== filters.symbol) return false;
    if (filters.direction !== "All" && signal.direction !== filters.direction) return false;
    if (filters.status !== "All" && signal.status !== filters.status) return false;
    if (filters.newsRisk !== "All" && signal.news_risk !== filters.newsRisk) return false;
    if (Number(signal.confidence ?? 0) < minConfidence) return false;
    return true;
  });
}

export function signalFilterHref(current: SignalFilterState, key: keyof SignalFilterState, value: string) {
  const state = { ...current, [key]: value };
  const params = new URLSearchParams();

  if (state.symbol !== "All") params.set("symbol", state.symbol);
  if (state.direction !== "All") params.set("direction", state.direction);
  if (state.status !== "All") params.set("status", state.status);
  if (state.confidence !== "All") params.set("confidence", state.confidence);
  if (state.newsRisk !== "All") params.set("newsRisk", state.newsRisk);

  const query = params.toString();
  return query ? `/signals?${query}` : "/signals";
}

export function signalDirectionTone(direction: SignalDirection) {
  return direction === "Long" ? "positive" : "negative";
}

export function signalStatusTone(status: SignalStatus) {
  if (status === "ready") return "positive";
  if (status === "forming") return "warning";
  if (status === "dismissed" || status === "archived") return "neutral";
  return "neutral";
}

export function signalNewsTone(risk: NewsRiskLevel | null) {
  if (risk === "extreme" || risk === "high") return "negative";
  if (risk === "medium") return "warning";
  return "positive";
}
