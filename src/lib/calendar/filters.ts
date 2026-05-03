import type { CalendarRange, CurrencyCode, EconomicEvent, ImpactLevel } from "@/lib/calendar/types";

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function addMonths(date: Date, months: number) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

export function getCalendarRange(range: CalendarRange, now = new Date()) {
  const start = startOfDay(now);
  const end = range === "today" ? endOfDay(now) : range === "week" ? endOfDay(addDays(start, 6)) : endOfDay(addMonths(start, 1));

  return {
    start,
    end,
    startIso: start.toISOString(),
    endIso: end.toISOString(),
  };
}

export function parseCalendarRange(value: string | string[] | undefined): CalendarRange {
  const rawValue = Array.isArray(value) ? value[0] : value;
  return rawValue === "today" || rawValue === "week" || rawValue === "month" ? rawValue : "week";
}

export function parseCurrency(value: string | string[] | undefined): CurrencyCode {
  const rawValue = Array.isArray(value) ? value[0] : value;
  const upper = rawValue?.toUpperCase();

  if (upper === "USD" || upper === "EUR" || upper === "GBP" || upper === "JPY" || upper === "CHF" || upper === "CAD" || upper === "AUD" || upper === "NZD") {
    return upper;
  }

  return "All";
}

export function parseImpact(value: string | string[] | undefined): ImpactLevel | "All" {
  const rawValue = Array.isArray(value) ? value[0] : value;
  return rawValue === "High" || rawValue === "Medium" || rawValue === "Low" ? rawValue : "All";
}

export function filterEventsByDateRange(events: EconomicEvent[], start: Date, end: Date) {
  return events.filter((event) => {
    const eventTime = new Date(event.event_time);
    return eventTime >= start && eventTime <= end;
  });
}

export function filterEventsByCurrency(events: EconomicEvent[], currency: CurrencyCode) {
  if (currency === "All") return events;
  return events.filter((event) => event.currency === currency);
}

export function filterEventsByImpact(events: EconomicEvent[], impact: ImpactLevel | "All") {
  if (impact === "All") return events;
  return events.filter((event) => event.impact === impact);
}

export function groupEventsByDay(events: EconomicEvent[]) {
  return events.reduce<Array<{ date: string; events: EconomicEvent[] }>>((groups, event) => {
    const date = new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(event.event_time));
    const existing = groups.find((group) => group.date === date);

    if (existing) {
      existing.events.push(event);
    } else {
      groups.push({ date, events: [event] });
    }

    return groups;
  }, []);
}

export function getImpactBadgeVariant(impact: ImpactLevel): "positive" | "negative" | "warning" | "neutral" {
  if (impact === "High") return "negative";
  if (impact === "Medium") return "warning";
  return "neutral";
}

export function getEventRiskWindow(eventTime: string | Date, impact: ImpactLevel) {
  const center = new Date(eventTime);
  const minutes = impact === "High" ? 60 : impact === "Medium" ? 30 : 15;
  const before = new Date(center);
  const after = new Date(center);
  before.setMinutes(before.getMinutes() - minutes);
  after.setMinutes(after.getMinutes() + minutes);

  return {
    start: before,
    end: after,
    minutesBefore: minutes,
    minutesAfter: minutes,
    startIso: before.toISOString(),
    endIso: after.toISOString(),
  };
}

export function isWithinRiskWindow(date: string | Date, event: EconomicEvent) {
  const target = new Date(date);
  const window = getEventRiskWindow(event.event_time, event.impact);
  return target >= window.start && target <= window.end;
}
