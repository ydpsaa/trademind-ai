import Link from "next/link";
import { RadioTower } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatMarketPrice } from "@/lib/market-data/instruments";
import { isMarketSnapshotStale } from "@/lib/market-data/repository";
import type { MarketSnapshot } from "@/lib/market-data/types";

function biasTone(bias: MarketSnapshot["bias"]) {
  if (bias === "bullish") return "positive";
  if (bias === "bearish") return "negative";
  return "neutral";
}

export function MarketsCard({ snapshots }: { snapshots: MarketSnapshot[] }) {
  const visible = snapshots.slice(0, 5);

  return (
    <GlassCard className="p-4 lg:col-span-4 2xl:col-span-3">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-white">Markets</h2>
          <p className="mt-1 text-xs text-zinc-500">Verified 15m public candles</p>
        </div>
        <StatusBadge tone={visible.length ? "positive" : "warning"}>{visible.length ? "Real Data" : "Ready to Sync"}</StatusBadge>
      </div>

      {visible.length ? (
        <div className="divide-y divide-white/10 rounded-2xl border border-white/10 bg-white/[0.035]">
          {visible.map((snapshot) => {
            const stale = isMarketSnapshotStale(snapshot);
            return (
              <Link key={`${snapshot.symbol}-${snapshot.timeframe}`} href={`/market-scanner/${snapshot.symbol}?timeframe=${snapshot.timeframe}`} className="flex items-center justify-between gap-3 px-3 py-3 text-xs transition hover:bg-white/[0.04]">
                <div className="min-w-0">
                  <div className="font-semibold text-white">{snapshot.symbol}</div>
                  <div className="mt-1 truncate text-zinc-500">{snapshot.marketType} · {stale ? "stale" : snapshot.setupReadiness.replace("-", " ")}</div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-sm text-zinc-100">{formatMarketPrice(snapshot.symbol, snapshot.lastPrice)}</div>
                  <div className="mt-1"><StatusBadge tone={biasTone(snapshot.bias)}>{snapshot.bias}</StatusBadge></div>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
          <RadioTower className="h-5 w-5 text-zinc-400" />
          <h3 className="mt-3 text-sm font-semibold text-white">Public market feed is ready.</h3>
          <p className="mt-2 text-xs leading-5 text-zinc-500">Run an admin update in Market Scanner to store the first verified candle snapshots.</p>
        </div>
      )}

      <Link href="/market-scanner" className="mt-3 grid h-10 w-full place-items-center rounded-xl border border-white/10 bg-white/10 text-sm font-medium text-white transition hover:bg-white/15">
        Open Market Scanner
      </Link>
    </GlassCard>
  );
}
