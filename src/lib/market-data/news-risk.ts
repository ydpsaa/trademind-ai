import type { EconomicEvent } from "@/lib/calendar/types";
import type { MarketSymbol, NewsRiskLevel } from "@/lib/scanner/types";

const symbolCurrencies: Record<MarketSymbol, string[]> = {
  XAUUSD: ["USD"],
  EURUSD: ["EUR", "USD"],
  GBPUSD: ["GBP", "USD"],
  NAS100: ["USD"],
  US30: ["USD"],
  BTCUSDT: ["USD"],
  ETHUSDT: ["USD"],
  XAUUSDT: ["USD"],
  XAGUSDT: ["USD"],
  CLUSDT: ["USD"],
  BZUSDT: ["USD"],
  SPXUSDT: ["USD"],
  QQQUSDT: ["USD"],
};

export function getMarketNewsRisk(symbol: MarketSymbol, events: EconomicEvent[], now = new Date()): NewsRiskLevel {
  const relevant = events.filter((event) => {
    if ((event.source || "manual") === "sample") return false;
    if (!symbolCurrencies[symbol].includes(event.currency.toUpperCase())) return false;
    const minutes = (Date.parse(event.event_time) - now.getTime()) / 60_000;
    return minutes >= 0 && minutes <= 240;
  });

  if (!relevant.length) return "unknown";
  const highMinutes = relevant
    .filter((event) => event.impact === "High")
    .map((event) => (Date.parse(event.event_time) - now.getTime()) / 60_000);
  if (highMinutes.some((minutes) => minutes <= 90)) return "extreme";
  if (highMinutes.length) return "high";
  if (relevant.some((event) => event.impact === "Medium")) return "medium";
  return "low";
}
