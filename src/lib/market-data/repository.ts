import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getMarketDataProvider } from "@/lib/market-data/config";
import type { MarketSnapshot, MarketSnapshotRow } from "@/lib/market-data/types";
import type { MarketSymbol, ScannerTimeframe } from "@/lib/scanner/types";

const snapshotFields = "id,provider,symbol,market_type,timeframe,last_price,change_percent,bias,structure_state,bos_detected,choch_detected,liquidity_sweep_detected,fvg_detected,order_block_detected,premium_discount_state,setup_readiness,confidence,candle_count,summary,key_levels,warnings,source_time,fetched_at,analysis_version";

export function mapMarketSnapshot(row: MarketSnapshotRow): MarketSnapshot {
  return {
    id: row.id,
    provider: row.provider,
    symbol: row.symbol,
    marketType: row.market_type,
    timeframe: row.timeframe,
    lastPrice: Number(row.last_price),
    changePercent: row.change_percent == null ? null : Number(row.change_percent),
    bias: row.bias,
    structureState: row.structure_state,
    bosDetected: row.bos_detected,
    chochDetected: row.choch_detected,
    liquiditySweepDetected: row.liquidity_sweep_detected,
    fvgDetected: row.fvg_detected,
    orderBlockDetected: row.order_block_detected,
    premiumDiscountState: row.premium_discount_state,
    setupReadiness: row.setup_readiness,
    confidence: Number(row.confidence),
    candleCount: row.candle_count,
    summary: row.summary,
    keyLevels: Array.isArray(row.key_levels) ? row.key_levels : [],
    warnings: row.warnings ?? [],
    sourceTime: row.source_time,
    fetchedAt: row.fetched_at,
    analysisVersion: row.analysis_version,
  };
}

export async function getMarketSnapshots(timeframe: ScannerTimeframe) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { snapshots: [] as MarketSnapshot[], error: "Market data storage is not configured." };

  const { data, error } = await supabase
    .from("market_snapshots")
    .select(snapshotFields)
    .eq("provider", getMarketDataProvider())
    .eq("timeframe", timeframe)
    .order("symbol", { ascending: true });

  if (error) return { snapshots: [] as MarketSnapshot[], error: error.message };
  return { snapshots: ((data ?? []) as unknown as MarketSnapshotRow[]).map(mapMarketSnapshot), error: null };
}

export async function getMarketSnapshot(symbol: MarketSymbol, timeframe: ScannerTimeframe) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { snapshot: null as MarketSnapshot | null, error: "Market data storage is not configured." };

  const { data, error } = await supabase
    .from("market_snapshots")
    .select(snapshotFields)
    .eq("provider", getMarketDataProvider())
    .eq("symbol", symbol)
    .eq("timeframe", timeframe)
    .order("fetched_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return { snapshot: null as MarketSnapshot | null, error: error.message };
  return { snapshot: data ? mapMarketSnapshot(data as unknown as MarketSnapshotRow) : null, error: null };
}

const freshnessMs: Record<ScannerTimeframe, number> = {
  "5m": 20 * 60_000,
  "15m": 45 * 60_000,
  "1h": 3 * 60 * 60_000,
  "4h": 10 * 60 * 60_000,
};

export function isMarketSnapshotStale(snapshot: Pick<MarketSnapshot, "timeframe" | "sourceTime">) {
  return Date.now() - Date.parse(snapshot.sourceTime) > freshnessMs[snapshot.timeframe];
}
