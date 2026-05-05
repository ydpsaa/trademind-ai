import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, AlertTriangle, BarChart3, Settings2 } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { BacktestEquityCurve } from "@/components/backtest/BacktestEquityCurve";
import { GlassCard } from "@/components/ui/GlassCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { BacktestRow } from "@/lib/backtest/types";
import { formatDateTime, formatNumber } from "@/lib/trading/format";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";

interface BacktestDetailPageProps {
  params: Promise<{ backtestId: string }>;
}

async function getBacktest(backtestId: string) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return null;

  const { data, error } = await supabase
    .from("backtests")
    .select("id,user_id,strategy_id,symbol,timeframe,period_start,period_end,initial_balance,final_balance,total_trades,winrate,profit_factor,max_drawdown,avg_rr,report_json,created_at,strategies(name)")
    .eq("id", backtestId)
    .eq("user_id", userData.user.id)
    .maybeSingle();

  if (error) return null;
  if (!data) return null;
  return { backtest: data as unknown as BacktestRow, user: userData.user as User };
}

function currency(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "$0.00";
  return Number(value).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <GlassCard className="p-4">
      <div className="text-xs text-zinc-500">{label}</div>
      <div className="mt-2 text-xl font-semibold text-white">{value}</div>
    </GlassCard>
  );
}

export default async function BacktestDetailPage({ params }: BacktestDetailPageProps) {
  const { backtestId } = await params;
  const context = await getBacktest(backtestId);
  if (!context) notFound();

  const { backtest, user } = context;
  const report = backtest.report_json;
  const input = report?.input;
  const trades = report?.simulatedTrades ?? [];
  const equityCurve = report?.equityCurve ?? [];
  const netPnl = Number(backtest.final_balance ?? 0) - Number(backtest.initial_balance ?? 0);

  return (
    <AppShell title="Backtest Detail" subtitle="Saved backtest report." user={user}>
      <div className="space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <Link href="/backtest-lab" className="inline-flex items-center gap-2 text-sm text-zinc-400 transition hover:text-white">
              <ArrowLeft className="h-4 w-4" />
              Back to Backtest Lab
            </Link>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-semibold">{backtest.strategies?.name || report?.strategySnapshot.name || "Strategy deleted"}</h2>
              <StatusBadge tone="neutral">Sandbox</StatusBadge>
            </div>
            <p className="mt-2 text-sm text-zinc-500">
              {backtest.symbol} / {backtest.timeframe} / {formatDateTime(backtest.period_start)} - {formatDateTime(backtest.period_end)}
            </p>
          </div>
          <GlassCard className="border-amber-300/20 bg-amber-300/10 p-3 text-sm text-amber-100">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>Sandbox backtest - not real historical market data. This report must not be treated as real performance.</span>
            </div>
          </GlassCard>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          <StatCard label="Final Balance" value={currency(backtest.final_balance)} />
          <StatCard label="Net PnL" value={currency(netPnl)} />
          <StatCard label="Win Rate" value={`${formatNumber(backtest.winrate, "0")}%`} />
          <StatCard label="Total Trades" value={String(backtest.total_trades ?? 0)} />
          <StatCard label="Profit Factor" value={formatNumber(backtest.profit_factor, "0")} />
          <StatCard label="Max Drawdown" value={`${formatNumber(backtest.max_drawdown, "0")}%`} />
        </div>

        <GlassCard className="p-4 md:p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Equity Curve</h2>
            <BarChart3 className="h-4 w-4 text-zinc-500" />
          </div>
          <div className="mt-4">
            <BacktestEquityCurve points={equityCurve} />
          </div>
        </GlassCard>

        <div className="grid gap-4 xl:grid-cols-2">
          <GlassCard className="p-4 md:p-5">
            <h2 className="text-lg font-semibold">Simulation Summary</h2>
            <p className="mt-3 text-sm leading-6 text-zinc-300">{report?.summary || "No simulation summary available."}</p>
            <div className="mt-5 space-y-2">
              {(report?.warnings ?? []).map((warning) => (
                <div key={warning} className="rounded-xl border border-white/10 bg-white/[0.04] p-3 text-sm text-zinc-300">
                  {warning}
                </div>
              ))}
            </div>
          </GlassCard>

          <GlassCard className="p-4 md:p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Input Settings</h2>
              <Settings2 className="h-4 w-4 text-zinc-500" />
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl border border-white/10 bg-black/20 p-3"><dt className="text-zinc-500">Market</dt><dd className="mt-1 text-white">{input?.marketType || "N/A"}</dd></div>
              <div className="rounded-xl border border-white/10 bg-black/20 p-3"><dt className="text-zinc-500">Risk / Trade</dt><dd className="mt-1 text-white">{input?.riskPerTrade ?? "N/A"}%</dd></div>
              <div className="rounded-xl border border-white/10 bg-black/20 p-3"><dt className="text-zinc-500">Initial Balance</dt><dd className="mt-1 text-white">{currency(input?.initialBalance)}</dd></div>
              <div className="rounded-xl border border-white/10 bg-black/20 p-3"><dt className="text-zinc-500">Minimum RR</dt><dd className="mt-1 text-white">{input?.minimumRr ?? "N/A"}</dd></div>
            </dl>
          </GlassCard>
        </div>

        <GlassCard className="p-4 md:p-5">
          <h2 className="text-lg font-semibold">Simulated Trades</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[760px] border-separate border-spacing-y-2 text-left text-sm">
              <thead className="text-xs text-zinc-500">
                <tr>
                  <th className="px-3 py-2 font-medium">Opened</th>
                  <th className="px-3 py-2 font-medium">Symbol</th>
                  <th className="px-3 py-2 font-medium">Direction</th>
                  <th className="px-3 py-2 font-medium">Result</th>
                  <th className="px-3 py-2 font-medium">RR</th>
                  <th className="px-3 py-2 font-medium">PnL</th>
                  <th className="px-3 py-2 font-medium">Balance After</th>
                </tr>
              </thead>
              <tbody>
                {trades.slice(0, 40).map((trade) => (
                  <tr key={trade.id} className="bg-white/[0.035]">
                    <td className="rounded-l-xl px-3 py-3 text-zinc-400">{formatDateTime(trade.openedAt)}</td>
                    <td className="px-3 py-3 text-white">{trade.symbol}</td>
                    <td className="px-3 py-3 text-zinc-300">{trade.direction}</td>
                    <td className="px-3 py-3"><StatusBadge tone={trade.result === "Win" ? "positive" : trade.result === "Loss" ? "negative" : "neutral"}>{trade.result}</StatusBadge></td>
                    <td className="px-3 py-3 text-zinc-300">{trade.rr}</td>
                    <td className={`px-3 py-3 ${trade.pnl >= 0 ? "text-emerald-300" : "text-rose-300"}`}>{currency(trade.pnl)}</td>
                    <td className="rounded-r-xl px-3 py-3 text-zinc-300">{currency(trade.balanceAfter)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      </div>
    </AppShell>
  );
}
