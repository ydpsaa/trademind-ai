import { getEventRiskWindow } from "@/lib/calendar/filters";
import type { EconomicEvent } from "@/lib/calendar/types";

export type NewsRiskLevel = "Low" | "Medium" | "High" | "Extreme";

export interface NearbyEconomicEvent extends EconomicEvent {
  distanceMinutes: number;
  riskWindowLabel: string;
}

export function getRiskWindowLabel(event: Pick<EconomicEvent, "impact">) {
  const minutes = event.impact === "High" ? 60 : event.impact === "Medium" ? 30 : 15;
  return `Risk window: +/-${minutes} min`;
}

export function getNearbyEconomicEventsForTrade(tradeOpenedAt: string | Date | null | undefined, events: EconomicEvent[]): NearbyEconomicEvent[] {
  if (!tradeOpenedAt) return [];

  const tradeTime = new Date(tradeOpenedAt);

  return events
    .filter((event) => {
      const window = getEventRiskWindow(event.event_time, event.impact);
      return tradeTime >= window.start && tradeTime <= window.end;
    })
    .map((event) => ({
      ...event,
      distanceMinutes: Math.round(Math.abs(new Date(event.event_time).getTime() - tradeTime.getTime()) / 60000),
      riskWindowLabel: getRiskWindowLabel(event),
    }))
    .sort((a, b) => {
      const impactRank = { High: 0, Medium: 1, Low: 2 };
      return impactRank[a.impact] - impactRank[b.impact] || a.distanceMinutes - b.distanceMinutes;
    });
}

export function calculateNewsRiskScore(events: EconomicEvent[]) {
  const highImpactCount = events.filter((event) => event.impact === "High").length;

  if (!events.length) return 90;
  if (highImpactCount > 1) return 20;
  if (highImpactCount === 1) return 35;
  if (events.some((event) => event.impact === "Medium")) return 60;
  return 75;
}

export function getNewsRiskLevel(events: EconomicEvent[]): NewsRiskLevel {
  const score = calculateNewsRiskScore(events);

  if (score <= 25) return "Extreme";
  if (score <= 40) return "High";
  if (score <= 65) return "Medium";
  return "Low";
}

export function getNewsRiskSummary(events: EconomicEvent[]) {
  const highImpactCount = events.filter((event) => event.impact === "High").length;

  if (!events.length) {
    return "No economic events were detected inside the configured risk window.";
  }

  if (highImpactCount > 1) {
    return "Multiple high-impact economic events were detected near the trade open time.";
  }

  if (highImpactCount === 1) {
    return "A high-impact economic event was detected near the trade open time.";
  }

  if (events.some((event) => event.impact === "Medium")) {
    return "Medium-impact economic risk was detected near the trade open time.";
  }

  return "Only low-impact economic events were detected near the trade open time.";
}
