import { historicalInputBounds, historicalMinimumBars, historicalModels, historicalModes } from "./historical-engine";
import type { HistoricalMode, HistoricalModel, HistoricalResearchResult } from "./historical-engine";
import type { HistoricalProvenance } from "./historical-feed";
import { intervals, spotSymbols } from "./provider-data";
import type { SpotSymbol, SpotTimeframe } from "./provider-data";

type Configuration = { initialCapital: number; feeBps: number; slippageBps: number };

export type HistoricalResearchActionState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "success"; configuration: Configuration; provenance: HistoricalProvenance; result: HistoricalResearchResult };

export class HistoricalInputError extends Error {}

function field(formData: FormData, key: string): string {
  const values = formData.getAll(key);
  const value = values.length === 1 ? values[0] : null;
  return typeof value === "string" ? value.trim() : "";
}

function choice<T extends string>(value: string, options: readonly T[], message: string): T {
  const selected = options.find((option) => option === value);
  if (selected === undefined) throw new HistoricalInputError(message);
  return selected;
}

function utcDate(value: string): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return NaN;
  const time = Date.parse(`${value}T00:00:00.000Z`);
  return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === value ? time : NaN;
}

function boundedAmount(formData: FormData, key: keyof Configuration, label: string) {
  const value = field(formData, key);
  const parsed = /^\d+(?:\.\d+)?$/.test(value) ? Number(value) : NaN;
  const { min, max } = historicalInputBounds[key];
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    throw new HistoricalInputError(`${label} must be between ${min} and ${max}.`);
  }
  return parsed;
}

export function parseHistoricalResearchForm(formData: FormData, asOfMs: number) {
  const symbol = choice<SpotSymbol>(field(formData, "symbol"), spotSymbols, "Historical research supports Bybit spot BTCUSDT and ETHUSDT.");
  const timeframe = choice<SpotTimeframe>(field(formData, "timeframe"), ["5m", "15m", "1h", "4h"], "Choose a supported candle interval.");
  const model = choice<HistoricalModel>(field(formData, "strategy"), historicalModels, "Choose one of the four historical spot models. Pairs trading and market making are Sandbox-only.");
  const mode = choice<HistoricalMode>(field(formData, "mode"), historicalModes, "Choose a supported research method.");
  const startMs = utcDate(field(formData, "startDate"));
  const endMs = utcDate(field(formData, "endDate"));
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || startMs <= 0 || endMs <= startMs) {
    throw new HistoricalInputError("Enter a valid UTC date range with an end date after the start date.");
  }
  if (endMs > asOfMs) throw new HistoricalInputError("Choose an end date at or before today's UTC date. The end date is exclusive.");

  const configuration: Configuration = {
    initialCapital: boundedAmount(formData, "initialCapital", "Starting capital (USDT)"),
    feeBps: boundedAmount(formData, "feeBps", "Fee (bps per side)"),
    slippageBps: boundedAmount(formData, "slippageBps", "Slippage (bps per side)"),
  };

  return {
    configuration,
    engine: { symbol, model, mode, ...configuration },
    feed: { symbol, timeframe, startMs, endMs, asOfMs, minimumBars: historicalMinimumBars[mode] },
    requestedBars: (endMs - startMs) / intervals[timeframe],
  };
}
