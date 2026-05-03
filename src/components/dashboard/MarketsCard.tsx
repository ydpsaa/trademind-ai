import Link from "next/link";
import { MoreVertical } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { getNewsRiskTone, getSetupTone } from "@/lib/scanner/filters";
import { getMarketScanResults } from "@/lib/scanner/mock-scanner";

function titleCase(value: string) {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function MarketsCard() {
  const markets = getMarketScanResults("15m").slice(0, 5);

  return (
    <GlassCard className="p-4 lg:col-span-4 2xl:col-span-3">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex gap-6 text-sm">
          <span className="font-semibold text-white">Markets</span>
          <span className="text-zinc-500">Favorites</span>
        </div>
        <MoreVertical className="h-4 w-4 text-zinc-500" />
      </div>
      <div className="divide-y divide-white/10">
        {markets.map((market) => (
          <div key={market.symbol} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 py-2.5">
            <div>
              <div className="text-sm font-semibold text-white">{market.symbol}</div>
              <div className="text-xs text-zinc-500">{titleCase(market.bias)} / {market.confidence}% confidence</div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <StatusBadge tone={getSetupTone(market.setupReadiness)}>{titleCase(market.setupReadiness)}</StatusBadge>
              <span className={`text-[11px] ${getNewsRiskTone(market.newsRiskLevel) === "negative" ? "text-rose-300" : getNewsRiskTone(market.newsRiskLevel) === "warning" ? "text-amber-200" : "text-emerald-300"}`}>
                {titleCase(market.newsRiskLevel)} news
              </span>
            </div>
          </div>
        ))}
      </div>
      <Link href="/market-scanner" className="mt-2 grid h-10 w-full place-items-center rounded-xl border border-white/10 bg-white/10 text-sm font-medium text-white">
        Go to Market Scanner
      </Link>
    </GlassCard>
  );
}
