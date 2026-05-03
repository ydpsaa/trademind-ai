import Link from "next/link";
import { BookOpenCheck } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { journalPeriods } from "@/lib/trading/periods";
import type { JournalPeriod, JournalSource } from "@/lib/trading/types";

const sources: Array<{ label: string; value: JournalSource }> = [
  { label: "All", value: "all" },
  { label: "Manual", value: "manual" },
  { label: "Imported", value: "imported" },
];

interface JournalControlsProps {
  period: JournalPeriod;
  source: JournalSource;
}

export function JournalControls({ period, source }: JournalControlsProps) {
  return (
    <GlassCard className="p-4">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-lg font-semibold">Journal Workspace</h2>
            <StatusBadge tone="positive">Manual Journal Active</StatusBadge>
          </div>
          <p className="mt-1 text-sm text-zinc-400">Filter real trades by period and source.</p>
        </div>
        <Link href="/journal/new" className="grid h-10 place-items-center rounded-xl border border-white/10 bg-white/12 px-4 text-sm font-medium">
          Add Trade
        </Link>
      </div>
      <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div className="flex flex-wrap gap-2 rounded-2xl border border-white/10 bg-black/20 p-1.5">
          {journalPeriods.map((item) => (
            <Link
              key={item.value}
              href={`/journal?period=${item.value}&source=${source}`}
              className={`grid h-9 place-items-center rounded-xl px-3 text-xs transition ${period === item.value ? "bg-white/16 text-white shadow-inner shadow-white/10" : "text-zinc-500 hover:bg-white/[0.06] hover:text-zinc-300"}`}
            >
              {item.label}
            </Link>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {sources.map((item) => (
            <Link
              key={item.value}
              href={`/journal?period=${period}&source=${item.value}`}
              className={`inline-flex h-9 items-center gap-2 rounded-xl px-3 text-xs transition ${source === item.value ? "bg-white/14 text-white" : "text-zinc-500 hover:bg-white/[0.06] hover:text-zinc-300"}`}
            >
              {item.value === "imported" ? <BookOpenCheck className="h-3.5 w-3.5" /> : null}
              {item.label}
              {item.value === "imported" ? <span className="text-[10px] text-zinc-500">Coming later</span> : null}
            </Link>
          ))}
        </div>
      </div>
    </GlassCard>
  );
}
