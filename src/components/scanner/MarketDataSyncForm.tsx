"use client";

import { useFormStatus } from "react-dom";
import { RefreshCw } from "lucide-react";
import { syncMarketDataAction } from "@/app/(app)/market-scanner/actions";
import type { MarketDataProvider } from "@/lib/market-data/types";
import { scannerTimeframes, type MarketSymbol, type ScannerTimeframe } from "@/lib/scanner/types";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/12 px-4 text-sm font-semibold text-white transition hover:bg-white/18 disabled:cursor-not-allowed disabled:opacity-50">
      <RefreshCw className={`h-4 w-4 ${pending ? "animate-spin" : ""}`} />
      {pending ? "Updating" : "Update Data"}
    </button>
  );
}
export function MarketDataSyncForm({ timeframe, symbols, provider }: { timeframe: ScannerTimeframe; symbols: MarketSymbol[]; provider: MarketDataProvider }) {
  return (
    <form action={syncMarketDataAction} className="flex flex-wrap items-end gap-2">
      <label className="space-y-1.5">
        <span className="block text-[11px] text-zinc-500">Instrument</span>
        <select name="symbol" defaultValue="all" className="h-10 rounded-xl border border-white/10 bg-black/50 px-3 text-sm text-white">
          <option value="all">All {provider === "bybit" ? "Bybit" : "provider"} markets</option>
          {symbols.map((symbol) => <option key={symbol} value={symbol}>{symbol}</option>)}
        </select>
      </label>
      <label className="space-y-1.5">
        <span className="block text-[11px] text-zinc-500">Timeframe</span>
        <select name="timeframe" defaultValue={timeframe} className="h-10 rounded-xl border border-white/10 bg-black/50 px-3 text-sm text-white">
          {scannerTimeframes.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </label>
      <SubmitButton />
    </form>
  );
}
