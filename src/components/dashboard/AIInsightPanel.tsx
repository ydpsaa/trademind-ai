import Link from "next/link";
import { Sparkles } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";

export function AIInsightPanel() {
  return (
    <GlassCard className="p-4">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-base font-semibold">AI Insight</h2>
          <p className="mt-1 text-xs text-zinc-500">Generated from your reviews</p>
        </div>
        <Sparkles className="h-4 w-4 text-zinc-500" />
      </div>
      <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.045] p-3.5">
        <div className="text-sm font-semibold text-white">No generated insight yet.</div>
        <p className="mt-2 text-xs leading-5 text-zinc-500">Generate AI reviews from real journal trades to build a personalized coaching view.</p>
        <Link href="/ai-analysis" className="mt-4 inline-flex h-9 items-center rounded-xl border border-white/10 bg-white/10 px-3 text-xs font-medium text-white transition hover:bg-white/15">
          Open AI Analysis
        </Link>
      </div>
    </GlassCard>
  );
}
