import "server-only";

import { getMarketInstrument } from "@/lib/market-data/instruments";
import type { MarketCandle } from "@/lib/market-data/types";
import type { MarketSymbol, ScannerTimeframe } from "@/lib/scanner/types";

const intervalMap: Record<ScannerTimeframe, string> = {
  "5m": "5",
  "15m": "15",
  "1h": "60",
  "4h": "240",
};

const intervalMs: Record<ScannerTimeframe, number> = {
  "5m": 5 * 60_000,
  "15m": 15 * 60_000,
  "1h": 60 * 60_000,
  "4h": 4 * 60 * 60_000,
};

interface FetchInput {
  symbol: MarketSymbol;
  timeframe: ScannerTimeframe;
  outputSize?: number;
}

interface BybitKlineResponse {
  retCode?: number;
  retMsg?: string;
  result?: {
    category?: string;
    symbol?: string;
    list?: unknown[];
  };
}

function parseNumber(value: unknown) {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function safeProviderError(status: number, payload: BybitKlineResponse) {
  if (status === 403) return "MARKET_DATA_AUTH_FAILED";
  if (status === 429 || payload.retCode === 10006) return "MARKET_DATA_RATE_LIMITED";
  const message = payload.retMsg?.toLowerCase() ?? "";
  if (message.includes("symbol") || message.includes("instrument") || message.includes("category")) {
    return "MARKET_DATA_SYMBOL_UNAVAILABLE";
  }
  return "MARKET_DATA_REQUEST_FAILED";
}

export async function fetchBybitCandles({ symbol, timeframe, outputSize = 120 }: FetchInput): Promise<MarketCandle[]> {
  const instrument = getMarketInstrument(symbol);
  if (!instrument.bybit) throw new Error("MARKET_DATA_SYMBOL_UNAVAILABLE");

  const requestedCount = Math.min(1000, Math.max(30, outputSize) + 1);
  const params = new URLSearchParams({
    category: instrument.bybit.category,
    symbol: instrument.bybit.symbol,
    interval: intervalMap[timeframe],
    limit: String(requestedCount),
  });
  const baseUrl = process.env.BYBIT_MARKET_DATA_BASE_URL || "https://api.bybit.com";

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/v5/market/kline?${params.toString()}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new Error("MARKET_DATA_UNREACHABLE");
  }

  let payload: BybitKlineResponse;
  try {
    payload = (await response.json()) as BybitKlineResponse;
  } catch {
    throw new Error("MARKET_DATA_INVALID_RESPONSE");
  }

  if (!response.ok || payload.retCode !== 0 || !Array.isArray(payload.result?.list)) {
    throw new Error(safeProviderError(response.status, payload));
  }

  const fetchedAt = new Date().toISOString();
  const now = Date.now();
  const candles = payload.result.list.flatMap((raw) => {
    if (!Array.isArray(raw)) return [];
    const openedAtMs = parseNumber(raw[0]);
    const open = parseNumber(raw[1]);
    const high = parseNumber(raw[2]);
    const low = parseNumber(raw[3]);
    const close = parseNumber(raw[4]);
    const volume = parseNumber(raw[5]);

    if (openedAtMs == null || open == null || high == null || low == null || close == null) return [];
    if (openedAtMs + intervalMs[timeframe] > now) return [];
    if (high < Math.max(open, close) || low > Math.min(open, close) || high < low) return [];

    return [{
      provider: "bybit" as const,
      symbol,
      timeframe,
      openedAt: new Date(openedAtMs).toISOString(),
      open,
      high,
      low,
      close,
      volume,
      isClosed: true,
      fetchedAt,
    }];
  });

  const ordered = candles
    .sort((left, right) => Date.parse(left.openedAt) - Date.parse(right.openedAt))
    .slice(-Math.max(30, outputSize));
  if (ordered.length < 20) throw new Error("MARKET_DATA_INSUFFICIENT_HISTORY");
  return ordered;
}
