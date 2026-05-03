import { StatusBadge } from "@/components/ui/StatusBadge";
import type { StrategyRules } from "@/lib/strategies/types";

const ruleLabels: Array<[keyof StrategyRules, string]> = [
  ["requiresBos", "BOS"],
  ["requiresChoch", "CHoCH"],
  ["requiresLiquiditySweep", "Liquidity Sweep"],
  ["requiresFvg", "FVG"],
  ["requiresOrderBlock", "Order Block"],
  ["avoidHighImpactNews", "News Filter"],
];

export function StrategyRuleBadges({ rules }: { rules: StrategyRules }) {
  return (
    <div className="flex flex-wrap gap-2">
      {ruleLabels.map(([key, label]) => (
        rules[key] ? <StatusBadge key={key} tone={key === "avoidHighImpactNews" ? "warning" : "neutral"}>{label}</StatusBadge> : null
      ))}
    </div>
  );
}

export function StrategyChipList({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.length ? items.map((item) => <span key={item} className="rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 text-xs text-zinc-300">{item}</span>) : <span className="text-xs text-zinc-500">None</span>}
    </div>
  );
}
