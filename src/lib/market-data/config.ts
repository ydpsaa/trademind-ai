import "server-only";

import type { MarketDataProvider } from "@/lib/market-data/types";

export function getMarketDataProvider(): MarketDataProvider {
  return "twelve-data";
}
export function getMarketDataApiKey() {
  return process.env.TWELVE_DATA_API_KEY || process.env.MARKET_DATA_API_KEY || null;
}

export function isMarketDataConfigured() {
  const configuredProvider = (process.env.MARKET_DATA_PROVIDER || "twelve-data").toLowerCase();
  return configuredProvider === "twelve-data" && Boolean(getMarketDataApiKey());
}
