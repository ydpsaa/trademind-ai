import Link from "next/link";
import { GlassCard } from "@/components/ui/GlassCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { getImpactBadgeVariant } from "@/lib/calendar/filters";
import type { EconomicEvent } from "@/lib/calendar/types";

interface TodaysEventsCardProps {
  events?: EconomicEvent[];
}

function formatEventTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

export function TodaysEventsCard({ events = [] }: TodaysEventsCardProps) {
  const sortedEvents = [...events].sort((a, b) => new Date(a.event_time).getTime() - new Date(b.event_time).getTime()).slice(0, 4);

  return (
    <GlassCard className="p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold">Today&apos;s Events</h2>
        {events.some((event) => event.impact === "High") ? <StatusBadge tone="negative">High risk</StatusBadge> : null}
      </div>
      <div className="mt-4 divide-y divide-white/10">
        {sortedEvents.length ? sortedEvents.map((event) => (
          <div key={event.id} className={`grid grid-cols-[42px_36px_minmax(0,1fr)] items-center gap-2 py-3 text-xs min-[1500px]:grid-cols-[42px_36px_minmax(0,1fr)_auto] ${event.impact === "High" ? "bg-rose-400/[0.03]" : ""}`}>
            <span className="font-mono text-white">{formatEventTime(event.event_time)}</span>
            <span className="font-semibold text-zinc-300">{event.currency}</span>
            <span className="truncate text-zinc-300">{event.title}</span>
            <span className="col-start-3 min-[1500px]:col-auto">
              <StatusBadge tone={getImpactBadgeVariant(event.impact)}>{event.impact}</StatusBadge>
            </span>
          </div>
        )) : (
          <div className="py-5 text-sm leading-6 text-zinc-400">No major events today.</div>
        )}
      </div>
      <Link href="/calendar?range=today" className="mt-3 grid h-10 w-full place-items-center rounded-xl border border-white/10 bg-white/10 text-sm font-medium transition hover:bg-white/15">
        Go to Calendar
      </Link>
    </GlassCard>
  );
}
