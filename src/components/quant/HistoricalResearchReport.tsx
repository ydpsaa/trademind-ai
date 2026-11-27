import { BacktestEquityCurve } from "@/components/backtest/BacktestEquityCurve";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { HistoricalMode, HistoricalModel, HistoricalWindow } from "@/lib/quant/historical-engine";
import type { HistoricalResearchActionState } from "@/lib/quant/historical-research";

type HistoricalSuccess = Extract<HistoricalResearchActionState, { status: "success" }>;

export const historicalModelLabels = {
  momentum: "Momentum",
  "mean-reversion": "Mean reversion",
  "trend-following": "Trend following",
  breakout: "Breakout",
} satisfies Record<HistoricalModel, string>;

export const historicalModeLabels = {
  backtest: "Fixed-preset backtest",
  holdout: "Chronological holdout",
  "walk-forward": "Walk-forward",
} satisfies Record<HistoricalMode, string>;

const parameterLabels: Record<string, string> = {
  lookback: "Lookback",
  skip: "Skip",
  window: "Window",
  entryZ: "Entry z-score",
  exitZ: "Exit z-score",
  stopZ: "Stop z-score",
  fast: "Fast window",
  slow: "Slow window",
  entryWindow: "Entry window",
  exitWindow: "Exit window",
};

const dateFormat = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" });
const wholeNumber = new Intl.NumberFormat("en-US");
const amountFormat = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const percentFormat = new Intl.NumberFormat("en-US", { style: "percent", minimumFractionDigits: 2, maximumFractionDigits: 2 });

function UtcTime({ timestamp }: { timestamp: number }) {
  return <time dateTime={new Date(timestamp).toISOString()}>{dateFormat.format(timestamp)} UTC</time>;
}

function WindowRange({ startMs, endMs }: Pick<HistoricalWindow, "startMs" | "endMs">) {
  return <><UtcTime timestamp={startMs} /> to <UtcTime timestamp={endMs} /></>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-white/10 bg-black/20 px-3 py-2.5">
      <dt className="text-xs leading-5 text-zinc-400">{label}</dt>
      <dd className="mt-1 break-words text-sm font-semibold tabular-nums text-zinc-100 sm:text-base">{value}</dd>
    </div>
  );
}

function WindowResult({ window, name, open }: { window: HistoricalWindow; name: string; open: boolean }) {
  const { metrics, training } = window;
  return (
    <details open={open} className="rounded-xl border border-white/10 bg-black/20">
      <summary className="cursor-pointer rounded-xl px-3 py-3 text-sm font-medium text-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-white">
        {name}
        <span className="ml-2 font-normal tabular-nums text-zinc-400">{percentFormat.format(metrics.netReturn)} net return</span>
      </summary>
      <div className="grid gap-3 border-t border-white/10 px-3 py-3 text-xs leading-5 text-zinc-400 sm:grid-cols-2">
        {training && (
          <div>
            <p className="font-medium text-zinc-200">Training · {wholeNumber.format(training.barCount)} candles</p>
            <p><WindowRange {...training} /></p>
            <p>{percentFormat.format(training.netReturn)} after costs in training</p>
          </div>
        )}
        <div>
          <p className="font-medium text-zinc-200">{training ? "Out of sample" : "Fixed preset"} · {wholeNumber.format(window.barCount)} candles</p>
          <p><WindowRange {...window} /></p>
          <p>{wholeNumber.format(metrics.tradeCount)} closed trades · {percentFormat.format(metrics.maxDrawdown)} closing drawdown</p>
        </div>
        <div className={training ? "sm:col-span-2" : undefined}>
          <p className="font-medium text-zinc-200"><span className="capitalize">{window.presetId}</span> preset</p>
          <dl className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
            {Object.entries(window.parameters).map(([key, value]) => (
              <div key={key} className="inline-flex gap-1">
                <dt>{parameterLabels[key] ?? key}</dt>
                <dd className="font-medium tabular-nums text-zinc-200">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </details>
  );
}

export function HistoricalResearchReport({ provenance, result, configuration }: HistoricalSuccess) {
  const { summary, executions, unusedTailBars, mode } = result;
  const equityPoints = [
    { balance: summary.initialCapital },
    ...executions.flatMap(({ curve }) => curve.map(({ equity }) => ({ balance: equity }))),
  ];
  const sampleLabel = mode === "backtest" ? "Fixed-preset results" : "Out-of-sample results";

  return (
    <div className="min-w-0 space-y-5">
      <p role="status" className="sr-only">Historical research complete. {sampleLabel} are available.</p>
      <section aria-labelledby="quant-coverage" className="rounded-xl border border-white/10 bg-black/20 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 id="quant-coverage" className="text-sm font-semibold text-zinc-100">Candle coverage</h3>
          <StatusBadge tone="positive">Historical market data</StatusBadge>
        </div>
        <dl className="mt-3 grid min-w-0 gap-x-4 gap-y-2 text-xs leading-5 text-zinc-400 sm:grid-cols-2">
          <div>
            <dt>Source</dt>
            <dd className="text-zinc-200">{provenance.source}</dd>
          </div>
          <div>
            <dt>Instrument</dt>
            <dd className="text-zinc-200">{provenance.symbol}, {provenance.timeframe} · {wholeNumber.format(provenance.barCount)} closed candles</dd>
          </div>
          <div>
            <dt>Continuous range (end exclusive)</dt>
            <dd className="text-zinc-200"><WindowRange {...provenance} /></dd>
          </div>
          <div>
            <dt>Latest candle fetch</dt>
            <dd className="text-zinc-200"><UtcTime timestamp={Date.parse(provenance.latestFetchedAt)} /></dd>
          </div>
          <div className="sm:col-span-2">
            <dt>Dataset ID</dt>
            <dd className="break-all text-zinc-300">{provenance.datasetId}</dd>
          </div>
        </dl>
      </section>

      <section aria-labelledby="quant-evaluation">
        <h3 id="quant-evaluation" className="text-sm font-semibold text-zinc-100">{sampleLabel}</h3>
        <p className="mt-1 text-xs leading-5 text-zinc-400">
          {historicalModelLabels[result.model]} · {historicalModeLabels[mode]} · {amountFormat.format(configuration.initialCapital)} USDT initial capital
        </p>
        <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          <Metric label="Net P&L (USDT)" value={amountFormat.format(summary.netPnl)} />
          <Metric label="Net return" value={percentFormat.format(summary.netReturn)} />
          <Metric label="Final equity (USDT)" value={amountFormat.format(summary.finalEquity)} />
          <Metric label="Max closing drawdown" value={percentFormat.format(summary.maxDrawdown)} />
          <Metric label="Closed trades" value={wholeNumber.format(summary.tradeCount)} />
          <Metric label="Fees + slippage (USDT)" value={amountFormat.format(summary.commissions + summary.slippageCost)} />
        </dl>
        <figure className="mt-3 overflow-hidden rounded-xl border border-white/10 bg-black/20 px-3 pt-3">
          <figcaption className="text-xs font-medium text-zinc-300">Equity at candle close (USDT)</figcaption>
          <BacktestEquityCurve points={equityPoints} label="Modeled equity on historical candles, including fees and slippage" />
        </figure>
        <p className="mt-2 text-xs leading-5 text-zinc-400">
          Applied per side at {configuration.feeBps} bps fee and {configuration.slippageBps} bps slippage.
          Fees totaled {amountFormat.format(summary.commissions)} USDT and slippage totaled {amountFormat.format(summary.slippageCost)} USDT.
          Signals fill at the next open. The last close liquidates any open position in each evaluation window.
        </p>
      </section>

      <section aria-labelledby="quant-windows">
        <h3 id="quant-windows" className="text-sm font-semibold text-zinc-100">
          {mode === "walk-forward" ? `${executions.length} walk-forward folds` : "Evaluation window"}
        </h3>
        {mode === "walk-forward" && (
          <p className="mt-1 text-xs leading-5 text-zinc-400">
            Evaluations use consecutive windows starting flat. Ending capital carries forward.
            {unusedTailBars > 0 ? ` The final ${unusedTailBars} candles are outside a complete fold.` : ""}
          </p>
        )}
        <div className="mt-3 space-y-2">
          {executions.map((window, index) => (
            <WindowResult
              key={window.startMs}
              window={window}
              name={mode === "walk-forward" ? `Fold ${index + 1}` : historicalModeLabels[mode]}
              open={index === 0}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
