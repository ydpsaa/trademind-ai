import "server-only";

import type { MarketDataProvider } from "@/lib/market-data/types";

export function getMarketDataProvider(): MarketDataProvider {
  const configured = (process.env.MARKET_DATA_PROVIDER || "bybit").toLowerCase();
  return configured === "twelve-data" ? "twelve-data" : "bybit";
}
export function getMarketDataApiKey() {
  return process.env.TWELVE_DATA_API_KEY || process.env.MARKET_DATA_API_KEY || null;
}

export function isMarketDataConfigured() {
  const configuredProvider = getMarketDataProvider();
  return configuredProvider === "bybit" || Boolean(getMarketDataApiKey());
}
