import Link from "next/link";
import { Gauge } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { PropReadinessProfile, PropReadinessSnapshot } from "@/lib/prop-readiness/types";

function tone(status: PropReadinessSnapshot["readiness_status"]) {
  if (status === "ready") return "positive";
  if (status === "blocked") return "negative";
  if (status === "caution" || status === "high_risk") return "warning";
  return "neutral";
}

export function PropReadinessPreviewCard({ profile, snapshot }: { profile: PropReadinessProfile | null; snapshot: PropReadinessSnapshot | null }) {
  return (
    <GlassCard className="p-4 lg:col-span-6 2xl:col-span-4">
      <div className="flex items-start justify-between gap-3">
        <div><div className="flex items-center gap-2"><Gauge className="h-4 w-4 text-zinc-500" /><h2 className="text-base font-semibold">Prop Readiness</h2></div><p className="mt-1 text-xs text-zinc-600">{profile ? `${profile.name} · closed-trade estimate` : "Account-scoped risk limits"}</p></div>
        {snapshot ? <StatusBadge tone={tone(snapshot.readiness_status)}>{snapshot.readiness_score === null ? "N/A" : `${Math.round(snapshot.readiness_score)}/100`}</StatusBadge> : <StatusBadge>Not calculated</StatusBadge>}
      </div>
      {!profile ? (
        <div className="mt-5"><p className="text-sm leading-6 text-zinc-400">No Prop Profile for this account scope.</p><Link href="/prop-readiness?new=1" className="mt-4 inline-flex text-sm font-medium text-white">Set up Prop Readiness</Link></div>
      ) : !snapshot ? (
        <div className="mt-5"><p className="text-sm leading-6 text-zinc-400">{profile.name} is linked, but it has no saved calculation.</p><Link href={`/prop-readiness?profile=${profile.id}`} className="mt-4 inline-flex text-sm font-medium text-white">Calculate readiness</Link></div>
      ) : (
        <div className="mt-4">
          <div className="grid grid-cols-3 gap-3 text-sm"><div><div className="text-zinc-600">Daily used</div><div className="mt-1 font-medium text-white">{Math.round(snapshot.daily_loss_used_percent)}%</div></div><div><div className="text-zinc-600">Drawdown</div><div className="mt-1 font-medium text-white">{Math.round(snapshot.drawdown_used_percent)}%</div></div><div><div className="text-zinc-600">Target</div><div className="mt-1 font-medium text-white">{Math.round(snapshot.profit_target_progress)}%</div></div></div>
          <p className="mt-4 line-clamp-2 text-sm leading-6 text-zinc-400">{snapshot.summary}</p>
          <Link href={`/prop-readiness?profile=${profile.id}`} className="mt-4 inline-flex text-sm font-medium text-white">Open Prop Readiness</Link>
        </div>
      )}
    </GlassCard>
  );
}
