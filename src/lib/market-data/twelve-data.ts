import "server-only";

import { getMarketInstrument } from "@/lib/market-data/instruments";
import type { MarketCandle } from "@/lib/market-data/types";
import type { MarketSymbol, ScannerTimeframe } from "@/lib/scanner/types";

const intervalMap: Record<ScannerTimeframe, string> = {
  "5m": "5min",
  "15m": "15min",
  "1h": "1h",
  "4h": "4h",
};

interface FetchInput {
  apiKey: string;
  symbol: MarketSymbol;
  timeframe: ScannerTimeframe;
  outputSize?: number;
}
interface ProviderValue {
  datetime?: string;
  open?: string;
  high?: string;
  low?: string;
  close?: string;
  volume?: string;
}

interface ProviderResponse {
  status?: string;
  code?: number;
  message?: string;
  values?: ProviderValue[];
}

function parseNumber(value: string | undefined) {
  if (value == null || value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseProviderDate(value: string | undefined) {
  if (!value) return null;
  const normalized = /(?:Z|[+-]\d{2}:?\d{2})$/.test(value) ? value : `${value.replace(" ", "T")}Z`;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function safeProviderError(response: ProviderResponse) {
  if (response.code === 401 || response.code === 403) return "MARKET_DATA_AUTH_FAILED";
  if (response.code === 429) return "MARKET_DATA_RATE_LIMITED";
  if (response.message?.toLowerCase().includes("not available")) return "MARKET_DATA_SYMBOL_UNAVAILABLE";
  return "MARKET_DATA_REQUEST_FAILED";
}

export async function fetchTwelveDataCandles({ apiKey, symbol, timeframe, outputSize = 120 }: FetchInput): Promise<MarketCandle[]> {
  const instrument = getMarketInstrument(symbol);
  const params = new URLSearchParams({
    symbol: instrument.providerSymbol,
    interval: intervalMap[timeframe],
    outputsize: String(Math.min(500, Math.max(30, outputSize))),
    timezone: "UTC",
    order: "ASC",
    apikey: apiKey,
  });

  let response: Response;
  try {
    response = await fetch(`https://api.twelvedata.com/time_series?${params.toString()}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new Error("MARKET_DATA_UNREACHABLE");
  }

  let payload: ProviderResponse;
  try {
    payload = (await response.json()) as ProviderResponse;
  } catch {
    throw new Error("MARKET_DATA_INVALID_RESPONSE");
  }

  if (!response.ok || payload.status === "error" || !Array.isArray(payload.values)) {
    throw new Error(safeProviderError(payload));
  }

  const fetchedAt = new Date().toISOString();
  const candles = payload.values.flatMap((value) => {
    const openedAt = parseProviderDate(value.datetime);
    const open = parseNumber(value.open);
    const high = parseNumber(value.high);
    const low = parseNumber(value.low);
    const close = parseNumber(value.close);
    const volume = parseNumber(value.volume);

    if (!openedAt || open == null || high == null || low == null || close == null) return [];
    if (high < Math.max(open, close) || low > Math.min(open, close) || high < low) return [];

    return [{
      provider: "twelve-data" as const,
      symbol,
      timeframe,
      openedAt,
      open,
      high,
      low,
      close,
      volume,
      isClosed: true,
      fetchedAt,
    }];
  });

  if (candles.length < 20) throw new Error("MARKET_DATA_INSUFFICIENT_HISTORY");
  return candles;
}
