import type { MarketSymbol, MarketType } from "@/lib/scanner/types";

interface MarketInstrumentDefinition {
  symbol: MarketSymbol;
  providerSymbol: string;
  marketType: MarketType;
  precision: number;
}
export const MARKET_INSTRUMENTS: Record<MarketSymbol, MarketInstrumentDefinition> = {
  XAUUSD: { symbol: "XAUUSD", providerSymbol: "XAU/USD", marketType: "Gold", precision: 2 },
  EURUSD: { symbol: "EURUSD", providerSymbol: "EUR/USD", marketType: "Forex", precision: 5 },
  GBPUSD: { symbol: "GBPUSD", providerSymbol: "GBP/USD", marketType: "Forex", precision: 5 },
  NAS100: { symbol: "NAS100", providerSymbol: "NDX", marketType: "Indices", precision: 2 },
  US30: { symbol: "US30", providerSymbol: "DJI", marketType: "Indices", precision: 2 },
  BTCUSDT: { symbol: "BTCUSDT", providerSymbol: "BTC/USDT", marketType: "Crypto", precision: 2 },
  ETHUSDT: { symbol: "ETHUSDT", providerSymbol: "ETH/USDT", marketType: "Crypto", precision: 2 },
};

export function getMarketInstrument(symbol: MarketSymbol) {
  return MARKET_INSTRUMENTS[symbol];
}

export function formatMarketPrice(symbol: MarketSymbol, value: number) {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: MARKET_INSTRUMENTS[symbol].precision,
    maximumFractionDigits: MARKET_INSTRUMENTS[symbol].precision,
  });
}
