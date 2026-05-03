import { GlassCard } from "@/components/ui/GlassCard";
import { MiniSparkline } from "@/components/dashboard/MiniSparkline";

interface MetricCardProps {
  label: string;
  value: string;
  delta: string;
  positive: boolean;
}

export function MetricCard({ label, value, delta, positive }: MetricCardProps) {
  return (
    <GlassCard className="min-w-0 p-3.5">
      <div className="text-xs text-zinc-400">{label}</div>
      <div className="mt-2 truncate text-[1.35rem] font-semibold tracking-tight text-white 2xl:text-2xl">{value}</div>
      <div className={`mt-1 text-xs ${positive ? "text-emerald-300" : "text-rose-300"}`}>{delta}</div>
      <div className="mt-1 flex justify-end">
        <MiniSparkline muted={!positive} />
      </div>
    </GlassCard>
  );
}
