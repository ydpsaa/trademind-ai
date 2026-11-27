import type { EquityPoint } from "@/lib/backtest/types";

type BalancePoint = Pick<EquityPoint, "balance">;

function buildPath(points: readonly BalancePoint[]) {
  if (points.length < 2) return "";
  const balances = points.map((point) => point.balance);
  const min = Math.min(...balances);
  const max = Math.max(...balances);
  const range = Math.max(1, max - min);

  return points
    .map((point, index) => {
      const x = (index / Math.max(1, points.length - 1)) * 500;
      const y = 145 - ((point.balance - min) / range) * 120;
      return `${index === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}

interface BacktestEquityCurveProps {
  points: readonly BalancePoint[];
  label?: string;
}

export function BacktestEquityCurve({
  points,
  label = "Simulated backtest equity curve",
}: BacktestEquityCurveProps) {
  const path = buildPath(points);
  const fillPath = path ? `${path} L500 160 L0 160 Z` : "";

  return (
    <svg className="h-36 w-full" viewBox="0 0 500 160" preserveAspectRatio="none" role="img" aria-label={label}>
      <path d="M0 32 H500 M0 72 H500 M0 112 H500" stroke="rgba(255,255,255,.07)" strokeWidth="1" />
      {fillPath ? <path d={fillPath} fill="rgba(255,255,255,.08)" /> : null}
      {path ? <path d={path} fill="none" stroke="rgba(255,255,255,.86)" strokeLinecap="round" strokeWidth="2.5" /> : null}
    </svg>
  );
}
