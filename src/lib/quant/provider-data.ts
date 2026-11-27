/** Read-only bridge for the market_candles contract observed in DAXIS main.
 * This validates structure, not the authenticity of a caller or a data provider.
 * Use only rows read by authenticated server code; never accept rows from an HTTP client as verified. */
import type { Bar, Market } from './types';
import { validateMarket, integer } from './math';
export const HISTORICAL_MAX_BARS = 1200;
export const spotSymbols = ['BTCUSDT', 'ETHUSDT'] as const;
export const intervals = { '5m': 300_000, '15m': 900_000, '1h': 3_600_000, '4h': 14_400_000 } as const;
export type SpotSymbol = typeof spotSymbols[number];
export type SpotTimeframe = keyof typeof intervals;
export type CandleRow = Readonly<{
  provider: string;
  symbol: string;
  timeframe: string;
  opened_at: string;
  open: number | string;
  high: number | string;
  low: number | string;
  close: number | string;
  volume: number | string | null;
  is_closed: boolean;
  fetched_at: string;
}>;
export type CandleRequest = Readonly<{
  symbols: readonly SpotSymbol[];
  timeframe: SpotTimeframe;
  startMs: number;
  endMs: number;
  asOfMs: number;
}>;
function numberCell(value: number | string) {
  if (typeof value !== 'number' && (typeof value !== 'string' || !/^[+-]?\d+(?:\.\d+)?(?:e[+-]?\d+)?$/i.test(value))) {
    throw new Error('invalid numeric candle field');
  }
  const number = Number(value);
  if (!Number.isFinite(number)) throw new Error('invalid numeric candle field');
  return number;
}

function timestamp(value: string) {
  const match = typeof value === 'string' && /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.(\d{1,6}))?(?:Z|\+00:00)$/.exec(value);
  if (!match) throw new Error('expected UTC timestamp');
  const ms = Date.parse(value);
  if (!Number.isSafeInteger(ms) || new Date(ms).toISOString().slice(0, 19) !== match[1]) throw new Error('invalid timestamp');
  return { ms, subMillisecond: /[1-9]/.test(match[2]?.slice(3) ?? '') };
}
export function normalizeStoredSpotCandles(rows: readonly CandleRow[], request: CandleRequest) {
  const { timeframe, symbols } = request;
  if (!Object.prototype.hasOwnProperty.call(intervals, timeframe) || !Array.isArray(symbols) ||
      symbols.length < 1 || symbols.length > spotSymbols.length || new Set(symbols).size !== symbols.length ||
      symbols.some((symbol) => !spotSymbols.includes(symbol))) {
    throw new Error('unsupported provider instruments or timeframe');
  }

  const interval = intervals[timeframe];
  const start = integer(request.startMs, 'start', 0);
  const end = integer(request.endMs, 'end', 0);
  const now = integer(request.asOfMs, 'as of', 0);
  if (start % interval || end % interval || end > now || end <= start) {
    throw new Error('invalid or unfinished interval');
  }
  const count = (end - start) / interval;
  if (count < 2 || count > HISTORICAL_MAX_BARS || rows.length !== count * symbols.length) {
    throw new Error('incomplete candle coverage or size limit');
  }
  const market: Record<string, Bar[]> = Object.create(null);
  for (const symbol of symbols) market[symbol] = [];

  for (const row of rows) {
    if (row.provider !== 'bybit' || row.timeframe !== timeframe || !symbols.includes(row.symbol as SpotSymbol) || row.is_closed !== true) {
      throw new Error('unexpected or unclosed candle');
    }
    const opened = timestamp(row.opened_at);
    const fetched = timestamp(row.fetched_at);
    const closesAt = opened.ms + interval;
    if (opened.ms < start || opened.ms >= end || opened.ms % interval || opened.subMillisecond ||
        closesAt > now || fetched.ms < closesAt || fetched.ms > now || (fetched.ms === now && fetched.subMillisecond)) {
      throw new Error('invalid candle or fetch time');
    }
    market[row.symbol].push({
      time: opened.ms,
      open: numberCell(row.open),
      high: numberCell(row.high),
      low: numberCell(row.low),
      close: numberCell(row.close),
      volume: row.volume === null ? undefined : numberCell(row.volume),
    });
  }
  for (const symbol of symbols) {
    const bars = market[symbol].sort((a, b) => a.time - b.time);
    if (bars.length !== count || bars.some((bar, index) => bar.time !== start + index * interval)) {
      throw new Error('gap, duplicate or unequal coverage');
    }
  }
  validateMarket(market);
  return {
    mode: 'provider-candidate' as const,
    market: market as Market,
    provider: 'bybit' as const,
    venue: 'spot' as const,
    quoteCurrency: 'USDT' as const,
    timeframe,
    startMs: start,
    endMs: end,
    asOfMs: now,
    barCount: count,
    assets: [...symbols].sort(),
    limitations: [
      'structural validation only; source authenticity and market completeness require trusted server context',
      'no verified slippage, fees, liquidity, shorting or funding model',
      'not a validated strategy',
    ],
  };
}
