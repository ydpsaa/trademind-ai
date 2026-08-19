import "server-only";

import { getMarketDataApiKey, getMarketDataProvider } from "@/lib/market-data/config";
import { fetchBybitCandles } from "@/lib/market-data/bybit";
import { fetchTwelveDataCandles } from "@/lib/market-data/twelve-data";
import type { MarketCandle } from "@/lib/market-data/types";
import type { MarketSymbol, ScannerTimeframe } from "@/lib/scanner/types";

interface FetchMarketCandlesInput {
  symbol: MarketSymbol;
  timeframe: ScannerTimeframe;
  outputSize?: number;
}
export async function fetchMarketCandles(input: FetchMarketCandlesInput): Promise<MarketCandle[]> {
  const provider = getMarketDataProvider();
  if (provider === "bybit") {
    return fetchBybitCandles(input);
  }

  if (provider === "twelve-data") {
    const apiKey = getMarketDataApiKey();
    if (!apiKey) throw new Error("MARKET_DATA_NOT_CONFIGURED");
    return fetchTwelveDataCandles({ ...input, apiKey });
  }

  throw new Error("MARKET_DATA_PROVIDER_UNSUPPORTED");
}
