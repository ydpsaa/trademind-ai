import { Play } from "lucide-react";
import { runBacktestFormAction } from "@/app/backtest-lab/actions";
import { GlassCard } from "@/components/ui/GlassCard";
import { BacktestSubmitButton } from "@/components/backtest/BacktestSubmitButton";
import { backtestMarkets, backtestSymbols, backtestTimeframes } from "@/lib/backtest/types";
import type { Strategy } from "@/lib/strategies/types";
import { normalizeStrategyRules } from "@/lib/strategies/validation";

function today(offsetDays = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

export function BacktestRunForm({ strategies }: { strategies: Strategy[] }) {
  const defaultStrategy = strategies[0];
  const defaultRules = normalizeStrategyRules(defaultStrategy?.rules_json ?? null);

  return (
    <GlassCard className="p-4 md:p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Run Simulated Backtest</h2>
          <p className="mt-1 text-sm leading-6 text-zinc-500">Simulated backtest foundation. Real market data is not connected yet.</p>
        </div>
        <span className="w-fit rounded-md bg-white/10 px-2 py-1 text-xs text-zinc-300">Simulated Engine</span>
      </div>

      <form action={runBacktestFormAction} className="mt-5 grid gap-4 lg:grid-cols-12">
        <label className="grid gap-2 text-sm lg:col-span-6">
          <span className="text-zinc-400">Strategy *</span>
          <select name="strategy_id" defaultValue={defaultStrategy?.id ?? ""} disabled={!strategies.length} className="h-11 rounded-xl border border-white/10 bg-black/50 px-3 text-white outline-none transition focus:border-white/30 disabled:opacity-50">
            {strategies.length ? null : <option value="">Create a strategy first</option>}
            {strategies.map((strategy) => (
              <option key={strategy.id} value={strategy.id}>
                {strategy.name}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-2 text-sm lg:col-span-3">
          <span className="text-zinc-400">Symbol *</span>
          <select name="symbol" defaultValue={defaultRules.symbols[0] ?? "XAUUSD"} className="h-11 rounded-xl border border-white/10 bg-black/50 px-3 text-white outline-none transition focus:border-white/30">
            {backtestSymbols.map((symbol) => <option key={symbol} value={symbol}>{symbol}</option>)}
          </select>
        </label>

        <label className="grid gap-2 text-sm lg:col-span-3">
          <span className="text-zinc-400">Market Type *</span>
          <select name="market_type" defaultValue={defaultRules.markets[0] ?? "Gold"} className="h-11 rounded-xl border border-white/10 bg-black/50 px-3 text-white outline-none transition focus:border-white/30">
            {backtestMarkets.map((market) => <option key={market} value={market}>{market}</option>)}
          </select>
        </label>

        <label className="grid gap-2 text-sm lg:col-span-3">
          <span className="text-zinc-400">Timeframe *</span>
          <select name="timeframe" defaultValue="15m" className="h-11 rounded-xl border border-white/10 bg-black/50 px-3 text-white outline-none transition focus:border-white/30">
            {backtestTimeframes.map((timeframe) => <option key={timeframe} value={timeframe}>{timeframe}</option>)}
          </select>
        </label>

        <label className="grid gap-2 text-sm lg:col-span-3">
          <span className="text-zinc-400">Period Start *</span>
          <input name="period_start" type="date" defaultValue={today(-30)} className="h-11 rounded-xl border border-white/10 bg-black/50 px-3 text-white outline-none transition focus:border-white/30" />
        </label>

        <label className="grid gap-2 text-sm lg:col-span-3">
          <span className="text-zinc-400">Period End *</span>
          <input name="period_end" type="date" defaultValue={today()} className="h-11 rounded-xl border border-white/10 bg-black/50 px-3 text-white outline-none transition focus:border-white/30" />
        </label>

        <label className="grid gap-2 text-sm lg:col-span-3">
          <span className="text-zinc-400">Initial Balance *</span>
          <input name="initial_balance" type="number" min="0" step="100" defaultValue="10000" className="h-11 rounded-xl border border-white/10 bg-black/50 px-3 text-white outline-none transition focus:border-white/30" />
        </label>

        <label className="grid gap-2 text-sm lg:col-span-3">
          <span className="text-zinc-400">Risk Per Trade % *</span>
          <input name="risk_per_trade" type="number" min="0.1" max="10" step="0.1" defaultValue={String(defaultRules.maxRiskPercent)} className="h-11 rounded-xl border border-white/10 bg-black/50 px-3 text-white outline-none transition focus:border-white/30" />
        </label>

        <div className="lg:col-span-12">
          <BacktestSubmitButton disabled={!strategies.length} icon={<Play className="h-4 w-4" />} />
        </div>
      </form>
    </GlassCard>
  );
}
