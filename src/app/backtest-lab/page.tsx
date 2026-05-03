import Link from "next/link";
import { BarChart3, Beaker, Database, FlaskConical } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { BacktestRunForm } from "@/components/backtest/BacktestRunForm";
import { DeleteBacktestButton } from "@/components/backtest/BacktestActions";
import { BacktestEquityCurve } from "@/components/backtest/BacktestEquityCurve";
import { GlassCard } from "@/components/ui/GlassCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { BacktestRow } from "@/lib/backtest/types";
import type { Strategy } from "@/lib/strategies/types";
import { formatDateTime, formatNumber } from "@/lib/trading/format";
import { createSupabaseServerClient } from "@/lib/supabase/server";

interface BacktestLabPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

async function getBacktestLabData() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { strategies: [], backtests: [], error: "Supabase is not configured." };

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return { strategies: [], backtests: [], error: "You must be signed in to view Backtest Lab." };

  const [strategiesResult, backtestsResult] = await Promise.all([
    supabase.from("strategies").select("*").eq("user_id", userData.user.id).order("created_at", { ascending: false }),
    supabase
      .from("backtests")
      .select("*, strategies(name)")
      .eq("user_id", userData.user.id)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  if (strategiesResult.error) return { strategies: [], backtests: [], error: strategiesResult.error.message };
  if (backtestsResult.error) return { strategies: (strategiesResult.data ?? []) as Strategy[], backtests: [], error: backtestsResult.error.message };

  return {
    strategies: (strategiesResult.data ?? []) as Strategy[],
    backtests: (backtestsResult.data ?? []) as BacktestRow[],
    error: null,
  };
}

function currency(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "$0.00";
  return Number(value).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function SummaryCard({ label, value, icon: Icon }: { label: string; value: string; icon: typeof BarChart3 }) {
  return (
    <GlassCard className="p-4">
      <div className="flex items-center justify-between">
        <div className="text-xs text-zinc-500">{label}</div>
        <Icon className="h-4 w-4 text-zinc-500" />
      </div>
      <div className="mt-2 text-2xl font-semibold text-white">{value}</div>
    </GlassCard>
  );
}

export default async function BacktestLabPage({ searchParams }: BacktestLabPageProps) {
  const params = await searchParams;
  const { strategies, backtests, error } = await getBacktestLabData();
  const latest = backtests[0];
  const latestCurve = latest?.report_json?.equityCurve ?? [];
  const netPnl = latest ? Number(latest.final_balance ?? 0) - Number(latest.initial_balance ?? 0) : 0;

  return (
    <AppShell title="Backtest Lab" subtitle="Test strategy logic before using it for signals or automation.">
      <div className="space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl border border-white/10 bg-white/[0.06]">
              <FlaskConical className="h-5 w-5 text-zinc-300" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Simulated Backtest Engine</h2>
              <p className="mt-1 text-sm text-zinc-500">Foundation mode only. Real market data is not connected yet.</p>
            </div>
          </div>
          <StatusBadge tone="neutral">Simulated Engine</StatusBadge>
        </div>

        {params.created ? <GlassCard className="border-emerald-300/20 bg-emerald-400/10 p-3 text-sm text-emerald-200">Simulated backtest saved successfully.</GlassCard> : null}
        {typeof params.error === "string" ? <GlassCard className="border-rose-300/20 bg-rose-400/10 p-3 text-sm text-rose-200">{params.error}</GlassCard> : null}
        {error ? <GlassCard className="border-rose-300/20 bg-rose-400/10 p-4 text-sm text-rose-200">{error}</GlassCard> : null}

        <BacktestRunForm strategies={strategies} />

        {latest ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard label="Latest Final Balance" value={currency(latest.final_balance)} icon={Database} />
            <SummaryCard label="Latest Net PnL" value={currency(netPnl)} icon={BarChart3} />
            <SummaryCard label="Latest Win Rate" value={`${formatNumber(latest.winrate, "0")}%`} icon={Beaker} />
            <SummaryCard label="Latest Max Drawdown" value={`${formatNumber(latest.max_drawdown, "0")}%`} icon={FlaskConical} />
          </div>
        ) : null}

        {latestCurve.length ? (
          <GlassCard className="p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">Latest Equity Curve</h2>
              <span className="text-xs text-zinc-500">Simulated preview</span>
            </div>
            <div className="mt-4">
              <BacktestEquityCurve points={latestCurve} />
            </div>
          </GlassCard>
        ) : null}

        <GlassCard className="p-4 md:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Previous Backtests</h2>
              <p className="mt-1 text-sm text-zinc-500">Saved simulated results for the current user.</p>
            </div>
            <StatusBadge tone="neutral">{backtests.length} saved</StatusBadge>
          </div>

          {backtests.length ? (
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[900px] border-separate border-spacing-y-2 text-left text-sm">
                <thead className="text-xs text-zinc-500">
                  <tr>
                    <th className="px-3 py-2 font-medium">Strategy</th>
                    <th className="px-3 py-2 font-medium">Symbol</th>
                    <th className="px-3 py-2 font-medium">Timeframe</th>
                    <th className="px-3 py-2 font-medium">Trades</th>
                    <th className="px-3 py-2 font-medium">Win Rate</th>
                    <th className="px-3 py-2 font-medium">Final Balance</th>
                    <th className="px-3 py-2 font-medium">Max DD</th>
                    <th className="px-3 py-2 font-medium">Engine</th>
                    <th className="px-3 py-2 font-medium">Created</th>
                    <th className="px-3 py-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {backtests.map((backtest) => (
                    <tr key={backtest.id} className="rounded-xl bg-white/[0.035] transition hover:bg-white/[0.06]">
                      <td className="rounded-l-xl px-3 py-3 text-white">{backtest.strategies?.name || backtest.report_json?.strategySnapshot.name || "Strategy deleted"}</td>
                      <td className="px-3 py-3 text-zinc-300">{backtest.symbol}</td>
                      <td className="px-3 py-3 text-zinc-300">{backtest.timeframe}</td>
                      <td className="px-3 py-3 text-zinc-300">{backtest.total_trades ?? 0}</td>
                      <td className="px-3 py-3 text-zinc-300">{formatNumber(backtest.winrate, "0")}%</td>
                      <td className="px-3 py-3 text-zinc-300">{currency(backtest.final_balance)}</td>
                      <td className="px-3 py-3 text-zinc-300">{formatNumber(backtest.max_drawdown, "0")}%</td>
                      <td className="px-3 py-3"><StatusBadge tone="neutral">{backtest.report_json?.engineType || "simulated"}</StatusBadge></td>
                      <td className="px-3 py-3 text-zinc-500">{formatDateTime(backtest.created_at)}</td>
                      <td className="rounded-r-xl px-3 py-3">
                        <div className="flex flex-wrap items-center gap-3">
                          <Link href={`/backtest-lab/${backtest.id}`} className="text-zinc-300 transition hover:text-white">
                            View
                          </Link>
                          <DeleteBacktestButton backtestId={backtest.id} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-8 text-center">
              <h3 className="text-base font-semibold">No backtests yet</h3>
              <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-zinc-500">Run your first simulated backtest after creating a strategy. Results will appear here and in the dashboard preview.</p>
            </div>
          )}
        </GlassCard>
      </div>
    </AppShell>
  );
}
