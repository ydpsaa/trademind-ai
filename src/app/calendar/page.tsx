import Link from "next/link";
import type { ReactNode } from "react";
import { CalendarDays, Filter } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { TodaysEventsCard } from "@/components/dashboard/TodaysEventsCard";
import { GlassCard } from "@/components/ui/GlassCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { calendarCurrencies, calendarImpacts, calendarRanges, type CalendarRange, type CurrencyCode, type EconomicEvent, type ImpactLevel } from "@/lib/calendar/types";
import { getCalendarRange, getImpactBadgeVariant, groupEventsByDay, parseCalendarRange, parseCurrency, parseImpact } from "@/lib/calendar/filters";
import { getRiskWindowLabel } from "@/lib/calendar/news-risk";
import { formatSupabaseError } from "@/lib/supabase/errors";
import { createSupabaseServerClient } from "@/lib/supabase/server";

interface CalendarPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function filterHref(range: CalendarRange, currency: CurrencyCode, impact: ImpactLevel | "All") {
  const params = new URLSearchParams();
  params.set("range", range);
  if (currency !== "All") params.set("currency", currency);
  if (impact !== "All") params.set("impact", impact);
  return `/calendar?${params.toString()}`;
}

function formatCalendarError(message: string) {
  if (message.includes("economic_events") || message.includes("schema cache") || message.includes("does not exist")) {
    return "Economic calendar table is not applied yet. Run src/db/patches/002_economic_events.sql in Supabase SQL Editor, then refresh this page.";
  }

  return formatSupabaseError(message);
}

function FilterLink({ href, active, children }: { href: string; active: boolean; children: ReactNode }) {
  return (
    <Link
      href={href}
      className={`grid h-9 place-items-center rounded-xl border px-3 text-xs font-medium transition ${
        active ? "border-white/20 bg-white/15 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]" : "border-white/10 bg-white/[0.04] text-zinc-400 hover:bg-white/10 hover:text-white"
      }`}
    >
      {children}
    </Link>
  );
}

function highestImpact(events: EconomicEvent[]): ImpactLevel {
  if (events.some((event) => event.impact === "High")) return "High";
  if (events.some((event) => event.impact === "Medium")) return "Medium";
  return "Low";
}

async function getEvents(range: CalendarRange, currency: CurrencyCode, impact: ImpactLevel | "All") {
  const supabase = await createSupabaseServerClient();
  const period = getCalendarRange(range);

  if (!supabase) {
    return { events: [], todayEvents: [], error: "Supabase is not configured." };
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return { events: [], todayEvents: [], error: "You must be signed in to view the calendar." };
  }

  let query = supabase
    .from("economic_events")
    .select("*")
    .gte("event_time", period.startIso)
    .lte("event_time", period.endIso)
    .order("event_time", { ascending: true });

  if (currency !== "All") query = query.eq("currency", currency);
  if (impact !== "All") query = query.eq("impact", impact);

  const today = getCalendarRange("today");
  const [eventsResult, todayResult] = await Promise.all([
    query,
    supabase
      .from("economic_events")
      .select("*")
      .gte("event_time", today.startIso)
      .lte("event_time", today.endIso)
      .order("event_time", { ascending: true }),
  ]);

  if (eventsResult.error) {
    return { events: [], todayEvents: [], error: formatCalendarError(eventsResult.error.message) };
  }

  return {
    events: (eventsResult.data ?? []) as EconomicEvent[],
    todayEvents: todayResult.error ? [] : ((todayResult.data ?? []) as EconomicEvent[]),
    error: null,
  };
}

export default async function CalendarPage({ searchParams }: CalendarPageProps) {
  const params = await searchParams;
  const range = parseCalendarRange(params.range);
  const currency = parseCurrency(params.currency);
  const impact = parseImpact(params.impact);
  const { events, todayEvents, error } = await getEvents(range, currency, impact);
  const groupedEvents = groupEventsByDay(events);

  return (
    <AppShell title="Economic Calendar" subtitle="Track high-impact macro events that may affect Forex, Gold, Crypto and Indices.">
      <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <div className="space-y-4">
          <TodaysEventsCard events={todayEvents} />
          <GlassCard className="p-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-zinc-400" />
              <h2 className="text-base font-semibold">Filters</h2>
            </div>
            <div className="mt-4 space-y-4">
              <div>
                <div className="mb-2 text-xs text-zinc-500">Period</div>
                <div className="grid gap-2">
                  {calendarRanges.map((item) => (
                    <FilterLink key={item.value} href={filterHref(item.value, currency, impact)} active={range === item.value}>
                      {item.label}
                    </FilterLink>
                  ))}
                </div>
              </div>
              <div>
                <div className="mb-2 text-xs text-zinc-500">Currency</div>
                <div className="grid grid-cols-3 gap-2">
                  {calendarCurrencies.map((item) => (
                    <FilterLink key={item} href={filterHref(range, item, impact)} active={currency === item}>
                      {item}
                    </FilterLink>
                  ))}
                </div>
              </div>
              <div>
                <div className="mb-2 text-xs text-zinc-500">Impact</div>
                <div className="grid grid-cols-2 gap-2">
                  {calendarImpacts.map((item) => (
                    <FilterLink key={item} href={filterHref(range, currency, item)} active={impact === item}>
                      {item}
                    </FilterLink>
                  ))}
                </div>
              </div>
            </div>
          </GlassCard>
        </div>

        <GlassCard className="min-w-0 p-4 md:p-6">
          <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/[0.06]">
                <CalendarDays className="h-5 w-5 text-zinc-300" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-semibold">Scheduled Events</h2>
                  <StatusBadge tone="positive">Supabase Events Active</StatusBadge>
                </div>
                <p className="mt-1 text-sm text-zinc-500">{events.length} events found</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <StatusBadge tone="neutral">{calendarRanges.find((item) => item.value === range)?.label}</StatusBadge>
              <StatusBadge tone="neutral">{currency}</StatusBadge>
              <StatusBadge tone={impact === "High" ? "negative" : impact === "Medium" ? "warning" : "neutral"}>{impact}</StatusBadge>
            </div>
          </div>

          {error ? <div className="mb-4 rounded-xl border border-rose-300/20 bg-rose-400/10 p-4 text-sm text-rose-200">{error}</div> : null}

          {groupedEvents.length ? (
            <div className="space-y-5">
              {groupedEvents.map((group) => (
                <div key={group.date}>
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold text-zinc-300">{group.date}</h3>
                    <div className="flex items-center gap-2">
                      <StatusBadge tone="neutral">{group.events.length} events</StatusBadge>
                      <StatusBadge tone={getImpactBadgeVariant(highestImpact(group.events))}>{highestImpact(group.events)} max impact</StatusBadge>
                    </div>
                  </div>
                  <div className="overflow-hidden rounded-2xl border border-white/10">
                    <div className="divide-y divide-white/10">
                      {group.events.map((event) => (
                        <div key={event.id} className="grid gap-4 bg-black/15 p-4 text-sm transition hover:bg-white/[0.04] xl:grid-cols-[72px_64px_88px_minmax(0,1fr)_minmax(120px,150px)_minmax(210px,250px)] xl:items-center">
                          <span className="font-mono text-white">{formatTime(event.event_time)}</span>
                          <StatusBadge tone="neutral">{event.currency}</StatusBadge>
                          <StatusBadge tone={getImpactBadgeVariant(event.impact)}>{event.impact}</StatusBadge>
                          <div className="min-w-0">
                            <div className="text-zinc-200 xl:truncate">{event.title}</div>
                            <div className="mt-1 text-xs text-zinc-500">Source: {event.source || "manual"}</div>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-xs text-zinc-500 xl:block xl:space-y-1">
                            <span>Actual <span className="block text-sm text-zinc-300">{event.actual || "-"}</span></span>
                            <span>Forecast <span className="block text-sm text-zinc-300">{event.forecast || "-"}</span></span>
                            <span>Previous <span className="block text-sm text-zinc-300">{event.previous || "-"}</span></span>
                          </div>
                          <div className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-zinc-400">{getRiskWindowLabel(event)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-black/20 p-8 text-center">
              <h2 className="text-lg font-semibold">No economic events found for this period.</h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-400">
                No events match the selected period, currency, and impact filters.
              </p>
            </div>
          )}
        </GlassCard>
      </div>
    </AppShell>
  );
}
