import type { MarketSymbol, MarketType } from "@/lib/scanner/types";

export type BybitMarketCategory = "spot" | "linear";

interface MarketInstrumentDefinition {
  symbol: MarketSymbol;
  twelveDataSymbol?: string;
  bybit?: {
    symbol: string;
    category: BybitMarketCategory;
  };
  marketType: MarketType;
  precision: number;
}
export const MARKET_INSTRUMENTS: Record<MarketSymbol, MarketInstrumentDefinition> = {
  XAUUSD: { symbol: "XAUUSD", twelveDataSymbol: "XAU/USD", marketType: "Gold", precision: 2 },
  EURUSD: { symbol: "EURUSD", twelveDataSymbol: "EUR/USD", marketType: "Forex", precision: 5 },
  GBPUSD: { symbol: "GBPUSD", twelveDataSymbol: "GBP/USD", marketType: "Forex", precision: 5 },
  NAS100: { symbol: "NAS100", twelveDataSymbol: "NDX", marketType: "Indices", precision: 2 },
  US30: { symbol: "US30", twelveDataSymbol: "DJI", marketType: "Indices", precision: 2 },
  BTCUSDT: { symbol: "BTCUSDT", twelveDataSymbol: "BTC/USDT", bybit: { symbol: "BTCUSDT", category: "spot" }, marketType: "Crypto", precision: 2 },
  ETHUSDT: { symbol: "ETHUSDT", twelveDataSymbol: "ETH/USDT", bybit: { symbol: "ETHUSDT", category: "spot" }, marketType: "Crypto", precision: 2 },
  XAUUSDT: { symbol: "XAUUSDT", bybit: { symbol: "XAUUSDT", category: "linear" }, marketType: "Gold", precision: 2 },
  XAGUSDT: { symbol: "XAGUSDT", bybit: { symbol: "XAGUSDT", category: "linear" }, marketType: "Commodities", precision: 3 },
  CLUSDT: { symbol: "CLUSDT", bybit: { symbol: "CLUSDT", category: "linear" }, marketType: "Commodities", precision: 2 },
  BZUSDT: { symbol: "BZUSDT", bybit: { symbol: "BZUSDT", category: "linear" }, marketType: "Commodities", precision: 2 },
  SPXUSDT: { symbol: "SPXUSDT", bybit: { symbol: "SPXUSDT", category: "linear" }, marketType: "Indices", precision: 2 },
  QQQUSDT: { symbol: "QQQUSDT", bybit: { symbol: "QQQUSDT", category: "linear" }, marketType: "Indices", precision: 2 },
};

export const BYBIT_MARKET_SYMBOLS = (Object.values(MARKET_INSTRUMENTS)
  .filter((instrument) => instrument.bybit)
  .map((instrument) => instrument.symbol)) as MarketSymbol[];

export const TWELVE_DATA_MARKET_SYMBOLS = (Object.values(MARKET_INSTRUMENTS)
  .filter((instrument) => instrument.twelveDataSymbol)
  .map((instrument) => instrument.symbol)) as MarketSymbol[];

export function getMarketInstrument(symbol: MarketSymbol) {
  return MARKET_INSTRUMENTS[symbol];
}

export function getMarketDataSymbols(provider: "bybit" | "twelve-data") {
  return provider === "bybit" ? BYBIT_MARKET_SYMBOLS : TWELVE_DATA_MARKET_SYMBOLS;
}

export function formatMarketPrice(symbol: MarketSymbol, value: number) {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: MARKET_INSTRUMENTS[symbol].precision,
    maximumFractionDigits: MARKET_INSTRUMENTS[symbol].precision,
  });
}
