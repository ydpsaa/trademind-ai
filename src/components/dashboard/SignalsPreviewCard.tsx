import Link from "next/link";
import { Radio } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { signalDirectionTone, signalStatusTone } from "@/lib/signals/filters";
import type { Signal } from "@/lib/signals/types";
import { formatNumber } from "@/lib/trading/format";

function titleCase(value: string) {
  return value.split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

export function SignalsPreviewCard({ signals }: { signals: Signal[] }) {
  const realSignals = signals.filter((signal) => signal.engine_type !== "simulated");

  return (
    <GlassCard className="p-4 lg:col-span-6 2xl:col-span-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">Signals</h2>
          <p className="mt-1 text-xs text-zinc-500">Requires Market Data Feed</p>
        </div>
        <Radio className="h-4 w-4 text-zinc-500" />
      </div>

      {realSignals.length ? (
        <div className="mt-4 divide-y divide-white/10">
          {realSignals.slice(0, 3).map((signal) => (
            <div key={signal.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 py-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-white">{signal.symbol}</span>
                  <StatusBadge tone={signalDirectionTone(signal.direction)}>{signal.direction}</StatusBadge>
                  <StatusBadge tone={signalStatusTone(signal.status)}>{titleCase(signal.status)}</StatusBadge>
                </div>
                <p className="mt-1 truncate text-xs text-zinc-500">{signal.setup_type}</p>
              </div>
              <div className="text-right">
                <div className="font-mono text-sm text-white">{formatNumber(signal.confidence, "0")}%</div>
                <Link href={`/signals/${signal.id}`} className="text-xs text-zinc-500 transition hover:text-white">View</Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-4 text-sm leading-6 text-zinc-400">
          No real signals yet. Signals require Market Data Feed and Strategy validation.
        </div>
      )}

      <Link href="/signals" className="mt-3 grid h-10 place-items-center rounded-xl border border-white/10 bg-white/10 text-sm font-medium text-white">
        Open Signals
      </Link>
    </GlassCard>
  );
}
