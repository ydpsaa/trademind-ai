import Link from "next/link";
import { ArrowUpRight, FlaskConical, TestTubeDiagonal } from "lucide-react";
import { redirect } from "next/navigation";
import { HistoricalResearchWorkspace } from "@/components/quant/HistoricalResearchWorkspace";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { historicalInputBounds, historicalMethod, historicalMinimumBars } from "@/lib/quant/historical-engine";
import { HISTORICAL_MAX_BARS } from "@/lib/quant/historical-feed";
import { intervals, spotSymbols } from "@/lib/quant/provider-data";
import { getCurrentUser } from "@/lib/supabase/server";

function getDateDefaults() {
  const end = new Date();
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 14);
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
}

export default async function QuantLabPage() {
  if (!(await getCurrentUser())) {
    redirect("/login?next=%2Fquant-lab");
  }

  return (
    <div className="min-w-0 space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-4 py-1">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid size-11 shrink-0 place-items-center rounded-2xl border border-white/10 bg-white/[0.06]">
            <FlaskConical aria-hidden="true" className="size-5 text-zinc-300" />
          </div>
          <h2 className="text-base font-semibold tracking-tight text-white sm:text-lg">Historical Research Engine</h2>
        </div>
        <Link
          href="/backtest-lab"
          className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-3 text-sm font-medium text-zinc-100 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          Backtest Lab <ArrowUpRight aria-hidden="true" className="size-4" />
        </Link>
      </header>

      <HistoricalResearchWorkspace
        dateDefaults={getDateDefaults()}
        symbols={spotSymbols}
        intervals={intervals}
        minimumBars={historicalMinimumBars}
        maximumBars={HISTORICAL_MAX_BARS}
        method={historicalMethod}
        inputBounds={historicalInputBounds}
      />

      <section aria-labelledby="quant-sandbox-heading" className="glass-panel min-w-0 rounded-2xl p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-3">
          <TestTubeDiagonal aria-hidden="true" className="size-5 shrink-0 text-zinc-400" />
          <h2 id="quant-sandbox-heading" className="text-base font-semibold text-white">Sandbox scope</h2>
          <StatusBadge tone="warning">Exploratory only</StatusBadge>
        </div>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-400">
          Pairs trading, market making, synthetic scenarios, and unverified CSV imports belong to the v0.2 Sandbox.
          Historical research here is limited to single-asset, long-only BTCUSDT and ETHUSDT spot runs.
          Position sizing uses available USDT. Execution and costs are modeled from candles.
        </p>
      </section>
    </div>
  );
}
