import "server-only";

import { getMarketDataApiKey, getMarketDataProvider } from "@/lib/market-data/config";
import { fetchTwelveDataCandles } from "@/lib/market-data/twelve-data";
import type { MarketCandle } from "@/lib/market-data/types";
import type { MarketSymbol, ScannerTimeframe } from "@/lib/scanner/types";

interface FetchMarketCandlesInput {
  symbol: MarketSymbol;
  timeframe: ScannerTimeframe;
  outputSize?: number;
}
export async function fetchMarketCandles(input: FetchMarketCandlesInput): Promise<MarketCandle[]> {
  const apiKey = getMarketDataApiKey();
  if (!apiKey) throw new Error("MARKET_DATA_NOT_CONFIGURED");

  const provider = getMarketDataProvider();
  if (provider === "twelve-data") {
    return fetchTwelveDataCandles({ ...input, apiKey });
  }

  throw new Error("MARKET_DATA_PROVIDER_UNSUPPORTED");
}
