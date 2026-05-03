import type { JournalPeriod } from "@/lib/trading/types";

export const journalPeriods: Array<{ label: string; value: JournalPeriod }> = [
  { label: "Day", value: "day" },
  { label: "Week", value: "week" },
  { label: "Month", value: "month" },
  { label: "Quarter", value: "quarter" },
  { label: "Half-Year", value: "half-year" },
  { label: "Year", value: "year" },
];

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
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

export function getPeriodRange(period: JournalPeriod, now = new Date()) {
  const end = now;
  let start: Date;

  switch (period) {
    case "day":
      start = startOfDay(now);
      break;
    case "week":
      start = addDays(startOfDay(now), -6);
      break;
    case "quarter":
      start = addMonths(startOfDay(now), -3);
      break;
    case "half-year":
      start = addMonths(startOfDay(now), -6);
      break;
    case "year":
      start = addMonths(startOfDay(now), -12);
      break;
    case "month":
    default:
      start = addMonths(startOfDay(now), -1);
      break;
  }

  return {
    start,
    end,
    startIso: start.toISOString(),
    endIso: end.toISOString(),
  };
}

export function parseJournalPeriod(value: string | string[] | undefined): JournalPeriod {
  const rawValue = Array.isArray(value) ? value[0] : value;
  return journalPeriods.some((period) => period.value === rawValue) ? (rawValue as JournalPeriod) : "month";
}
