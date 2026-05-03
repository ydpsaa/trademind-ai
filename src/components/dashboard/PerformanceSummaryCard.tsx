import { GlassCard } from "@/components/ui/GlassCard";
import { performanceSummary } from "@/lib/mock-data";

function GaugeRing({ value, label }: { value: number; label: string }) {
  const circumference = 2 * Math.PI * 42;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="relative grid h-24 w-24 shrink-0 place-items-center xl:h-28 xl:w-28">
      <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100" aria-hidden="true">
        <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="10" />
        <circle
          cx="50"
          cy="50"
          r="42"
          fill="none"
          stroke="rgba(255,255,255,.92)"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          strokeWidth="10"
        />
      </svg>
      <div className="text-center">
        <div className="text-2xl font-semibold tracking-tight xl:text-[1.7rem]">{value}%</div>
        <div className="text-xs text-zinc-400">{label}</div>
      </div>
    </div>
  );
}

export function PerformanceSummaryCard({ className = "lg:col-span-3 2xl:col-span-4" }: { className?: string }) {
  return (
    <GlassCard className={`p-4 ${className}`}>
      <h2 className="text-base font-semibold">Performance Summary</h2>
      <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center 2xl:gap-5">
        <GaugeRing value={performanceSummary.winRate} label="Win Rate" />
        <div className="min-w-0 flex-1 divide-y divide-white/10 rounded-xl border border-white/10">
          {performanceSummary.stats.map(([label, value]) => (
            <div key={label} className="flex items-center justify-between gap-3 px-3 py-2.5 text-xs">
              <span className="text-zinc-400">{label}</span>
              <span className="font-mono text-white">{value}</span>
            </div>
          ))}
        </div>
      </div>
      <button className="mt-4 h-10 w-full rounded-xl border border-white/10 bg-white/10 text-sm font-medium">View Detailed Report</button>
    </GlassCard>
  );
}
