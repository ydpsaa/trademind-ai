"use client";

import { ChartNoAxesCombined, CircleAlert, Database, Play } from "lucide-react";
import Link from "next/link";
import { startTransition, useActionState, useState, type FormEvent } from "react";
import { runHistoricalResearchAction } from "@/app/(app)/quant-lab/actions";
import {
  HistoricalResearchReport,
  historicalModeLabels,
  historicalModelLabels,
} from "@/components/quant/HistoricalResearchReport";
import { GlassCard } from "@/components/ui/GlassCard";
import type { HistoricalMode, HistoricalModel, historicalInputBounds, historicalMethod } from "@/lib/quant/historical-engine";
import type { HistoricalResearchActionState } from "@/lib/quant/historical-research";
import type { SpotSymbol, SpotTimeframe } from "@/lib/quant/provider-data";

interface HistoricalResearchWorkspaceProps {
  dateDefaults: { startDate: string; endDate: string };
  symbols: readonly SpotSymbol[];
  intervals: Readonly<Record<SpotTimeframe, number>>;
  minimumBars: Readonly<Record<HistoricalMode, number>>;
  maximumBars: number;
  method: typeof historicalMethod;
  inputBounds: typeof historicalInputBounds;
}

const initialState: HistoricalResearchActionState = { status: "idle" };

const inputClass =
  "h-11 w-full min-w-0 rounded-xl border border-white/15 bg-zinc-950/65 px-2.5 text-sm text-zinc-100 [color-scheme:dark] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-white";
const labelClass = "grid min-w-0 gap-1.5 text-sm text-zinc-300";

export function HistoricalResearchWorkspace({
  dateDefaults,
  symbols,
  intervals,
  minimumBars,
  maximumBars,
  method,
  inputBounds,
}: HistoricalResearchWorkspaceProps) {
  const [state, action, pending] = useActionState(runHistoricalResearchAction, initialState);
  const [model, setModel] = useState<HistoricalModel>("trend-following");
  const [mode, setMode] = useState<HistoricalMode>("backtest");
  const [symbol, setSymbol] = useState<SpotSymbol>(symbols[0]);
  const [timeframe, setTimeframe] = useState<SpotTimeframe>("4h");
  const [startDate, setStartDate] = useState(dateDefaults.startDate);
  const [endDate, setEndDate] = useState(dateDefaults.endDate);
  const [initialCapital, setInitialCapital] = useState("10000");
  const [feeBps, setFeeBps] = useState("10");
  const [slippageBps, setSlippageBps] = useState("2");
  const startMs = Date.parse(startDate);
  const endMs = Date.parse(endDate);
  const requestedBars = (endMs - startMs) / intervals[timeframe];
  const invalidCount = Number.isFinite(requestedBars)
    && (requestedBars < minimumBars[mode] || requestedBars > maximumBars);
  const settingsHaveChanged = state.status === "success" && (
    state.result.model !== model
    || state.result.mode !== mode
    || state.provenance.symbol !== symbol
    || state.provenance.timeframe !== timeframe
    || state.provenance.startMs !== startMs
    || state.provenance.endMs !== endMs
    || state.configuration.initialCapital !== Number.parseFloat(initialCapital)
    || state.configuration.feeBps !== Number.parseFloat(feeBps)
    || state.configuration.slippageBps !== Number.parseFloat(slippageBps)
  );
  const trainingPercent = Math.round(method.holdoutTrainingFraction * 100);
  const methodSummaries = {
    backtest: "Evaluate the requested period with a fixed preset.",
    holdout: `Select a preset on the first ${trainingPercent}% and evaluate it on the final ${100 - trainingPercent}%.`,
    "walk-forward": `Select a preset on the preceding ${method.walkForwardTrainingBars} candles for each consecutive ${method.walkForwardTestBars}-candle evaluation.`,
  } satisfies Record<HistoricalMode, string>;

  function submitResearch(event: FormEvent<HTMLFormElement>) {
    // Dispatch with the current controls intact after React finishes the action.
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => action(formData));
  }

  return (
    <div className="grid min-w-0 items-start gap-4 xl:grid-cols-[minmax(20rem,0.75fr)_minmax(0,1.25fr)]">
      <GlassCard className="min-w-0 p-4 sm:p-5">
        <h2 id="research-run" className="text-lg font-semibold text-white">Configure a run</h2>
        <p className="mt-1 text-sm leading-5 text-zinc-400">Choose a strategy, date range, and execution costs.</p>
        <form action={action} onSubmit={submitResearch} aria-labelledby="research-run" className="mt-5">
          <fieldset disabled={pending} className="grid min-w-0 gap-4 disabled:opacity-70" aria-busy={pending}>
            <div className="grid min-w-0 gap-3 sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
              <label className={labelClass}>
                <span id="quant-strategy-label">Strategy</span>
                <select
                  name="strategy"
                  aria-labelledby="quant-strategy-label"
                  className={inputClass}
                  value={model}
                  onChange={(event) => setModel(event.target.value as HistoricalModel)}
                >
                  {Object.entries(historicalModelLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
              <label className={labelClass}>
                <span id="quant-mode-label">Method</span>
                <select
                  name="mode"
                  aria-labelledby="quant-mode-label"
                  className={inputClass}
                  value={mode}
                  aria-describedby="quant-method-summary"
                  onChange={(event) => setMode(event.target.value as HistoricalMode)}
                >
                  {Object.entries(historicalModeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
              <p id="quant-method-summary" className="text-xs leading-5 text-zinc-400 sm:col-span-2">{methodSummaries[mode]}</p>
            </div>

            <div className="grid min-w-0 gap-3 sm:grid-cols-2">
              <label className={labelClass}>
                <span id="quant-symbol-label">Symbol</span>
                <select
                  name="symbol"
                  aria-labelledby="quant-symbol-label"
                  className={inputClass}
                  value={symbol}
                  onChange={(event) => setSymbol(event.target.value as SpotSymbol)}
                >
                  {symbols.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
              </label>
              <label className={labelClass}>
                <span id="quant-timeframe-label">Timeframe</span>
                <select
                  name="timeframe"
                  aria-labelledby="quant-timeframe-label"
                  className={inputClass}
                  value={timeframe}
                  onChange={(event) => setTimeframe(event.target.value as SpotTimeframe)}
                >
                  {Object.keys(intervals).map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
              </label>
              <label className={labelClass}>
                Start date (UTC)
                <input
                  className={inputClass}
                  name="startDate"
                  type="date"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                  max={dateDefaults.endDate}
                  aria-describedby="quant-range-summary"
                  required
                />
              </label>
              <label className={labelClass}>
                End date (UTC)
                <input
                  className={inputClass}
                  name="endDate"
                  type="date"
                  value={endDate}
                  onChange={(event) => setEndDate(event.target.value)}
                  max={dateDefaults.endDate}
                  aria-describedby="quant-range-summary"
                  required
                />
              </label>
              <p id="quant-range-summary" className={`text-xs leading-5 sm:col-span-2 ${invalidCount ? "text-amber-200" : "text-zinc-400"}`}>
                End date is exclusive. This method requires {minimumBars[mode]}–{maximumBars.toLocaleString("en-US")} closed candles.
                {Number.isFinite(requestedBars) && requestedBars > 0 ? ` Selected range: ${requestedBars.toLocaleString("en-US")}.` : ""}
              </p>
            </div>

            <div className="grid min-w-0 gap-3 sm:grid-cols-2">
              <label className={`${labelClass} sm:col-span-2`}>
                Initial capital (USDT)
                <input
                  className={inputClass}
                  name="initialCapital"
                  type="number"
                  min={inputBounds.initialCapital.min}
                  max={inputBounds.initialCapital.max}
                  step="any"
                  value={initialCapital}
                  onChange={(event) => setInitialCapital(event.target.value)}
                  required
                />
              </label>
              <label className={labelClass}>
                Fee (bps per side)
                <input
                  className={inputClass}
                  name="feeBps"
                  type="number"
                  min={inputBounds.feeBps.min}
                  max={inputBounds.feeBps.max}
                  step="any"
                  value={feeBps}
                  onChange={(event) => setFeeBps(event.target.value)}
                  required
                />
              </label>
              <label className={labelClass}>
                Slippage (bps per side)
                <input
                  className={inputClass}
                  name="slippageBps"
                  type="number"
                  min={inputBounds.slippageBps.min}
                  max={inputBounds.slippageBps.max}
                  step="any"
                  value={slippageBps}
                  onChange={(event) => setSlippageBps(event.target.value)}
                  required
                />
              </label>
            </div>

            <button
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-zinc-100 px-4 text-sm font-semibold text-zinc-950 hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-wait"
              type="submit"
            >
              <Play aria-hidden="true" className="size-4" />
              {pending ? "Running research…" : "Run historical research"}
            </button>
          </fieldset>
        </form>
      </GlassCard>

      <GlassCard className="min-w-0 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-white">Research results</h2>
          <p className="inline-flex items-center gap-1.5 text-xs text-zinc-400">
            <Database aria-hidden="true" className="size-3.5" /> Market Data Feed
          </p>
        </div>

        <div className="mt-4 min-w-0">
          {pending && (
            <p role="status" className="rounded-xl border border-white/10 bg-black/20 px-4 py-5 text-sm text-zinc-300">
              Checking coverage and evaluating the selected strategy…
            </p>
          )}

          {!pending && state.status === "idle" && (
            <div className="rounded-xl border border-dashed border-white/15 bg-black/20 px-4 py-9 text-center">
              <ChartNoAxesCombined aria-hidden="true" className="mx-auto size-6 text-zinc-400" />
              <p className="mt-3 text-sm font-medium text-zinc-100">Ready for a historical run</p>
              <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-zinc-400">
                Select a period covered by the feed to see verified candle coverage and modeled performance after costs.
              </p>
            </div>
          )}

          {!pending && state.status === "error" && (
            <div role="alert" className="rounded-xl border border-rose-300/25 bg-rose-950/50 px-4 py-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-rose-100">
                <CircleAlert aria-hidden="true" className="size-4 shrink-0" /> Research could not run
              </p>
              <p className="mt-2 break-words text-sm leading-6 text-rose-100">{state.message}</p>
              <Link href="/connections/market-data" className="mt-3 inline-block rounded text-sm font-semibold text-white underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
                View Market Data Feed
              </Link>
            </div>
          )}

          {!pending && state.status === "success" && (
            <>
              {settingsHaveChanged && (
                <p role="status" className="mb-4 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-zinc-300">
                  Settings changed. This report shows the last completed run.
                </p>
              )}
              <HistoricalResearchReport {...state} />
            </>
          )}
        </div>
      </GlassCard>
    </div>
  );
}
