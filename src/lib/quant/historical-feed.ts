import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  HISTORICAL_MAX_BARS,
  intervals,
  normalizeStoredSpotCandles,
  spotSymbols,
  type CandleRow,
  type SpotSymbol,
  type SpotTimeframe,
} from "./provider-data";
import type { Bar, DataProvenance } from "./types";

export { HISTORICAL_MAX_BARS } from "./provider-data";

const PAGE_SIZE = 256;
const MAX_DATE_MS = Date.UTC(10_000, 0, 1) - 1;
const PROVIDER = "bybit";
const VENUE = "spot";
const SOURCE = "Bybit spot / market_candles";
const CANDLE_FIELDS = "provider,symbol,timeframe,opened_at,open,high,low,close,volume,is_closed,fetched_at";

const errorMessages = {
  "invalid-range": "Select BTCUSDT or ETHUSDT and a UTC date range aligned to the timeframe. The end cannot be after the latest closed-candle boundary.",
  "insufficient-data": "The selected range or saved candle history has too few bars for this research mode.",
  "range-too-large": `The selected range exceeds ${HISTORICAL_MAX_BARS} candles. Shorten the range or increase the timeframe.`,
  "incomplete-coverage": "Saved Bybit spot candles do not cover the full interval without gaps. Choose another range or timeframe.",
  "invalid-candle": "The saved candles failed source, timestamp or price validation.",
  "storage-unavailable": "The Market Data Feed could not be read.",
} as const;

export class HistoricalFeedError extends Error {
  constructor(readonly code: keyof typeof errorMessages) {
    super(errorMessages[code]);
    this.name = "HistoricalFeedError";
  }
}

export type HistoricalFeedRequest = Readonly<{
  symbol: SpotSymbol;
  timeframe: SpotTimeframe;
  startMs: number;
  endMs: number;
  asOfMs: number;
  minimumBars: number;
}>;

export type HistoricalProvenance = DataProvenance & Readonly<{
  kind: "historical";
  provider: typeof PROVIDER;
  venue: typeof VENUE;
  quoteCurrency: "USDT";
  symbol: SpotSymbol;
  timeframe: SpotTimeframe;
  startMs: number;
  endMs: number;
  asOfMs: number;
  barCount: number;
  latestFetchedAt: string;
}>;

function expectedCoverage(request: HistoricalFeedRequest) {
  const { symbol, timeframe, startMs, endMs, asOfMs, minimumBars } = request;
  if (!spotSymbols.includes(symbol) || !Object.prototype.hasOwnProperty.call(intervals, timeframe)) {
    throw new HistoricalFeedError("invalid-range");
  }
  const interval = intervals[timeframe];
  const validTimestamps = [startMs, endMs, asOfMs].every(
    (time) => Number.isSafeInteger(time) && time > 0 && time <= MAX_DATE_MS,
  );
  if (!validTimestamps || startMs % interval !== 0 || endMs % interval !== 0 || endMs <= startMs || endMs > asOfMs) {
    throw new HistoricalFeedError("invalid-range");
  }

  const barCount = (endMs - startMs) / interval;
  if (barCount > HISTORICAL_MAX_BARS) throw new HistoricalFeedError("range-too-large");
  if (!Number.isSafeInteger(minimumBars) || minimumBars < 2 || barCount < minimumBars) {
    throw new HistoricalFeedError("insufficient-data");
  }
  return { interval, barCount };
}

async function readCandlePage(
  client: Pick<SupabaseClient, "from">,
  request: HistoricalFeedRequest,
  after: string | undefined,
) {
  try {
    const query = client.from("market_candles")
      .select(CANDLE_FIELDS)
      .eq("provider", PROVIDER)
      .eq("symbol", request.symbol)
      .eq("timeframe", request.timeframe)
      .eq("is_closed", true)
      .lt("opened_at", new Date(request.endMs).toISOString())
      .order("opened_at", { ascending: true })
      .limit(PAGE_SIZE);

    const { data, error } = await (after
      ? query.gt("opened_at", after)
      : query.gte("opened_at", new Date(request.startMs).toISOString()));
    if (error || !Array.isArray(data)) throw new HistoricalFeedError("storage-unavailable");
    return data as CandleRow[];
  } catch {
    throw new HistoricalFeedError("storage-unavailable");
  }
}

/** Reads the shared feed through the signed-in, RLS-scoped server client. */
export async function readHistoricalCandles(
  client: Pick<SupabaseClient, "from"> | null,
  request: HistoricalFeedRequest,
): Promise<{ bars: readonly Bar[]; provenance: HistoricalProvenance }> {
  const { interval, barCount } = expectedCoverage(request);
  if (!client) throw new HistoricalFeedError("storage-unavailable");

  const rows: CandleRow[] = [];
  let after: string | undefined;
  // PostgREST deployments can cap results below the requested page size.
  // Advance by the ordered timestamp until the bounded range is exhausted.
  for (;;) {
    const page = await readCandlePage(client, request, after);
    if (!page.length) break;
    for (const row of page) {
      if (!row || typeof row.opened_at !== "string") throw new HistoricalFeedError("invalid-candle");
      const time = Date.parse(row.opened_at);
      if (!Number.isFinite(time) || time < request.startMs || time >= request.endMs || time % interval !== 0) {
        throw new HistoricalFeedError("invalid-candle");
      }
      if (time !== request.startMs + rows.length * interval) throw new HistoricalFeedError("incomplete-coverage");
      rows.push(row);
    }
    after = page[page.length - 1].opened_at;
  }
  if (rows.length === 0) throw new HistoricalFeedError("insufficient-data");
  if (rows.length !== barCount) throw new HistoricalFeedError("incomplete-coverage");

  let dataset: ReturnType<typeof normalizeStoredSpotCandles>;
  try {
    dataset = normalizeStoredSpotCandles(rows, { ...request, symbols: [request.symbol] });
  } catch {
    throw new HistoricalFeedError("invalid-candle");
  }
  const bars = dataset.market[request.symbol];
  const latestFetchedAt = new Date(Math.max(...rows.map((row) => Date.parse(row.fetched_at)))).toISOString();
  const fingerprint = createHash("sha256")
    .update(JSON.stringify([PROVIDER, VENUE, request.symbol, request.timeframe, bars]))
    .digest("hex");

  return {
    bars,
    provenance: {
      kind: "historical",
      source: SOURCE,
      datasetId: `sha256:${fingerprint}`,
      provider: PROVIDER,
      venue: VENUE,
      quoteCurrency: dataset.quoteCurrency,
      symbol: request.symbol,
      timeframe: request.timeframe,
      startMs: dataset.startMs,
      endMs: dataset.endMs,
      asOfMs: dataset.asOfMs,
      barCount,
      latestFetchedAt,
    },
  };
}
