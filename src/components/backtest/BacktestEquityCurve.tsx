import type { EquityPoint } from "@/lib/backtest/types";

function buildPath(points: EquityPoint[]) {
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

export function BacktestEquityCurve({ points }: { points: EquityPoint[] }) {
  const path = buildPath(points);
  const fillPath = path ? `${path} L500 160 L0 160 Z` : "";

  return (
    <svg className="h-36 w-full" viewBox="0 0 500 160" preserveAspectRatio="none" aria-label="Simulated backtest equity curve">
      <path d="M0 32 H500 M0 72 H500 M0 112 H500" stroke="rgba(255,255,255,.07)" strokeWidth="1" />
      {fillPath ? <path d={fillPath} fill="rgba(255,255,255,.08)" /> : null}
      {path ? <path d={path} fill="none" stroke="rgba(255,255,255,.86)" strokeLinecap="round" strokeWidth="2.5" /> : null}
    </svg>
  );
}
