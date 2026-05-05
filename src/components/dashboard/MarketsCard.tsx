import Link from "next/link";
import { RadioTower } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { StatusBadge } from "@/components/ui/StatusBadge";

const readinessRows = [
  ["Market Data Feed", "Not connected"],
  ["Scanner Engine", "Waiting for feed"],
  ["Signals", "Disabled"],
];

export function MarketsCard() {
  return (
    <GlassCard className="p-4 lg:col-span-4 2xl:col-span-3">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-white">Markets</h2>
          <p className="mt-1 text-xs text-zinc-500">Real market data required</p>
        </div>
        <StatusBadge tone="neutral">Not Connected</StatusBadge>
      </div>

      <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
        <RadioTower className="h-5 w-5 text-zinc-400" />
        <h3 className="mt-3 text-sm font-semibold text-white">Market Scanner is waiting.</h3>
        <p className="mt-2 text-xs leading-5 text-zinc-500">Connect Market Data Feed to activate live scanner states, setup readiness, and signal validation.</p>
      </div>

      <div className="mt-4 divide-y divide-white/10 rounded-2xl border border-white/10 bg-white/[0.035]">
        {readinessRows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-3 px-3 py-2.5 text-xs">
            <span className="text-zinc-400">{label}</span>
            <span className="text-zinc-200">{value}</span>
          </div>
        ))}
      </div>

      <Link href="/connections/market-data" className="mt-3 grid h-10 w-full place-items-center rounded-xl border border-white/10 bg-white/10 text-sm font-medium text-white transition hover:bg-white/15">
        View Market Data Setup
      </Link>
    </GlassCard>
  );
}
