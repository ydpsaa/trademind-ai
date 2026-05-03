import { MoreVertical } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";

export function AIInsightPanel() {
  return (
    <GlassCard className="p-4">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-base font-semibold">AI Insight</h2>
          <p className="mt-1 text-xs text-zinc-500">Updated 2 min ago</p>
        </div>
        <MoreVertical className="h-4 w-4 text-zinc-500" />
      </div>
      <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.045] p-3.5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xs text-zinc-400">Your trading today is</div>
            <div className="mt-3 text-2xl font-semibold">Good</div>
          </div>
          <div className="grid h-20 w-20 shrink-0 place-items-center rounded-full border-[8px] border-white/15 border-t-white">
            <div className="text-center">
              <div className="text-2xl font-semibold">72</div>
              <div className="text-xs text-zinc-500">/100</div>
            </div>
          </div>
        </div>
        <div className="mt-4 border-t border-white/10 pt-3">
          <div className="text-xs text-zinc-400">You&apos;re doing better than</div>
          <div className="mt-1 text-2xl font-semibold">78%</div>
          <div className="text-xs text-zinc-400">of traders</div>
        </div>
      </div>
    </GlassCard>
  );
}
