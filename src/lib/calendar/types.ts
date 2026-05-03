export type ImpactLevel = "Low" | "Medium" | "High";
export type CurrencyCode = "All" | "USD" | "EUR" | "GBP" | "JPY" | "CHF" | "CAD" | "AUD" | "NZD";
export type CalendarRange = "today" | "week" | "month";

export interface EconomicEvent {
  id: string;
  currency: string;
  title: string;
  impact: ImpactLevel;
  event_time: string;
  actual: string | null;
  forecast: string | null;
  previous: string | null;
  source: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export const calendarRanges: Array<{ label: string; value: CalendarRange }> = [
  { label: "Today", value: "today" },
  { label: "This Week", value: "week" },
  { label: "This Month", value: "month" },
];

export const calendarCurrencies: CurrencyCode[] = ["All", "USD", "EUR", "GBP", "JPY", "CHF", "CAD", "AUD", "NZD"];
export const calendarImpacts: Array<ImpactLevel | "All"> = ["All", "High", "Medium", "Low"];
