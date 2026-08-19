import "server-only";

import { analyzeMarketCandles } from "@/lib/market-data/analysis";
import { fetchMarketCandles } from "@/lib/market-data/provider";
import type { MarketDataSyncResult } from "@/lib/market-data/types";
import type { MarketSymbol, ScannerTimeframe } from "@/lib/scanner/types";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

interface SyncInput {
  requestedBy: string;
  symbol: MarketSymbol;
  timeframe: ScannerTimeframe;
}
const safeMessages: Record<string, string> = {
  MARKET_DATA_NOT_CONFIGURED: "Market Data Service is not configured.",
  MARKET_DATA_AUTH_FAILED: "Market Data Service authentication failed.",
  MARKET_DATA_RATE_LIMITED: "Market Data Service rate limit reached. Try again later.",
  MARKET_DATA_SYMBOL_UNAVAILABLE: "This instrument is not available on the current data plan.",
  MARKET_DATA_UNREACHABLE: "Market Data Service could not be reached.",
  MARKET_DATA_INVALID_RESPONSE: "Market Data Service returned an invalid response.",
  MARKET_DATA_INSUFFICIENT_HISTORY: "Not enough verified candles were returned for analysis.",
  MARKET_DATA_REQUEST_FAILED: "Market Data Service request failed.",
};

function safeErrorCode(error: unknown) {
  const code = error instanceof Error ? error.message : "MARKET_DATA_REQUEST_FAILED";
  return safeMessages[code] ? code : "MARKET_DATA_REQUEST_FAILED";
}

export async function syncMarketData({ requestedBy, symbol, timeframe }: SyncInput): Promise<MarketDataSyncResult> {
  const service = createSupabaseServiceRoleClient();
  const provider = "twelve-data";
  const { data: run, error: runError } = await service
    .from("market_data_sync_runs")
    .insert({ requested_by: requestedBy, provider, symbol, timeframe, status: "running" })
    .select("id")
    .single();

  if (runError || !run) {
    return { ok: false, status: "error", symbol, timeframe, fetchedCount: 0, message: "Market data sync storage is not ready." };
  }

  try {
    const candles = await fetchMarketCandles({ symbol, timeframe, outputSize: 120 });
    const snapshot = analyzeMarketCandles(candles);
    const candleRows = candles.map((candle) => ({
      provider: candle.provider,
      symbol: candle.symbol,
      timeframe: candle.timeframe,
      opened_at: candle.openedAt,
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
      volume: candle.volume,
      is_closed: candle.isClosed,
      fetched_at: candle.fetchedAt,
    }));

    const { error: candleError } = await service.from("market_candles").upsert(candleRows, {
      onConflict: "provider,symbol,timeframe,opened_at",
    });
    if (candleError) throw new Error("MARKET_DATA_STORAGE_FAILED");

    const { error: snapshotError } = await service.from("market_snapshots").upsert({
      provider: snapshot.provider,
      symbol: snapshot.symbol,
      market_type: snapshot.marketType,
      timeframe: snapshot.timeframe,
      last_price: snapshot.lastPrice,
      change_percent: snapshot.changePercent,
      bias: snapshot.bias,
      structure_state: snapshot.structureState,
      bos_detected: snapshot.bosDetected,
      choch_detected: snapshot.chochDetected,
      liquidity_sweep_detected: snapshot.liquiditySweepDetected,
      fvg_detected: snapshot.fvgDetected,
      order_block_detected: snapshot.orderBlockDetected,
      premium_discount_state: snapshot.premiumDiscountState,
      setup_readiness: snapshot.setupReadiness,
      confidence: snapshot.confidence,
      candle_count: snapshot.candleCount,
      summary: snapshot.summary,
      key_levels: snapshot.keyLevels,
      warnings: snapshot.warnings,
      source_time: snapshot.sourceTime,
      fetched_at: snapshot.fetchedAt,
      analysis_version: snapshot.analysisVersion,
    }, { onConflict: "provider,symbol,timeframe" });
    if (snapshotError) throw new Error("MARKET_DATA_STORAGE_FAILED");

    await service.from("market_data_sync_runs").update({
      status: "completed",
      fetched_count: candles.length,
      upserted_count: candles.length,
      completed_at: new Date().toISOString(),
    }).eq("id", run.id);

    return { ok: true, status: "connected", symbol, timeframe, fetchedCount: candles.length, message: `${symbol} ${timeframe} market data updated.` };
  } catch (error) {
    const errorCode = safeErrorCode(error);
    const message = safeMessages[errorCode] ?? "Market Data Service request failed.";
    await service.from("market_data_sync_runs").update({
      status: "failed",
      error_code: errorCode,
      error_message: message,
      completed_at: new Date().toISOString(),
    }).eq("id", run.id);
    return { ok: false, status: errorCode === "MARKET_DATA_NOT_CONFIGURED" ? "not_connected" : "error", symbol, timeframe, fetchedCount: 0, message };
  }
}
