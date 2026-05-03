import { defaultStrategyRules } from "@/lib/strategies/defaults";
import type { EntryModel, StopLossModel, StrategyRules, TakeProfitModel } from "@/lib/strategies/types";

export function validateStrategyInput(input: { name: string | null; rules: StrategyRules }) {
  if (!input.name?.trim()) {
    return "Strategy name is required.";
  }

  if (!Number.isFinite(input.rules.minimumRr) || input.rules.minimumRr <= 0) {
    return "Minimum RR must be greater than 0.";
  }

  if (!Number.isFinite(input.rules.maxRiskPercent) || input.rules.maxRiskPercent <= 0) {
    return "Max risk percent must be greater than 0.";
  }

  if (!Number.isFinite(input.rules.newsBufferMinutes) || input.rules.newsBufferMinutes < 0) {
    return "News buffer minutes must be 0 or greater.";
  }

  return null;
}

function stringArray(value: unknown, fallback: string[]) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : fallback;
}

function boolValue(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function numberValue(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function normalizeStrategyRules(value: unknown): StrategyRules {
  const input = value && typeof value === "object" ? (value as Partial<StrategyRules>) : {};

  return {
    markets: stringArray(input.markets, defaultStrategyRules.markets),
    symbols: stringArray(input.symbols, defaultStrategyRules.symbols),
    sessions: stringArray(input.sessions, defaultStrategyRules.sessions),
    directionBias: input.directionBias === "trend-following" || input.directionBias === "reversal" || input.directionBias === "both" ? input.directionBias : defaultStrategyRules.directionBias,
    requiresBos: boolValue(input.requiresBos, defaultStrategyRules.requiresBos),
    requiresChoch: boolValue(input.requiresChoch, defaultStrategyRules.requiresChoch),
    requiresLiquiditySweep: boolValue(input.requiresLiquiditySweep, defaultStrategyRules.requiresLiquiditySweep),
    requiresFvg: boolValue(input.requiresFvg, defaultStrategyRules.requiresFvg),
    requiresOrderBlock: boolValue(input.requiresOrderBlock, defaultStrategyRules.requiresOrderBlock),
    minimumRr: numberValue(input.minimumRr, defaultStrategyRules.minimumRr),
    maxRiskPercent: numberValue(input.maxRiskPercent, defaultStrategyRules.maxRiskPercent),
    avoidHighImpactNews: boolValue(input.avoidHighImpactNews, defaultStrategyRules.avoidHighImpactNews),
    newsBufferMinutes: numberValue(input.newsBufferMinutes, defaultStrategyRules.newsBufferMinutes),
    entryModel: isEntryModel(input.entryModel) ? input.entryModel : defaultStrategyRules.entryModel,
    stopLossModel: isStopLossModel(input.stopLossModel) ? input.stopLossModel : defaultStrategyRules.stopLossModel,
    takeProfitModel: isTakeProfitModel(input.takeProfitModel) ? input.takeProfitModel : defaultStrategyRules.takeProfitModel,
  };
}

function isEntryModel(value: unknown): value is EntryModel {
  return value === "fvg-retest" || value === "order-block-retest" || value === "liquidity-sweep-confirmation" || value === "manual";
}

function isStopLossModel(value: unknown): value is StopLossModel {
  return value === "swing-high-low" || value === "order-block-invalid" || value === "fixed-pips" || value === "manual";
}

function isTakeProfitModel(value: unknown): value is TakeProfitModel {
  return value === "next-liquidity" || value === "fixed-rr" || value === "session-high-low" || value === "manual";
}
