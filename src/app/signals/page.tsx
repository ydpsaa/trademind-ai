import Link from "next/link";
import { AlertTriangle, Eye, Radio, ShieldAlert, Target, Zap } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { GenerateSignalsButton } from "@/components/signals/GenerateSignalsButton";
import { SignalStatusActions } from "@/components/signals/SignalActions";
import { GlassCard } from "@/components/ui/GlassCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { generateSimulatedSignalsFormAction } from "@/app/signals/actions";
import { scannerNewsRisks, scannerSymbols } from "@/lib/scanner/types";
import { filterSignals, parseSignalFilters, signalDirectionTone, signalFilterHref, signalNewsTone, signalStatusTone } from "@/lib/signals/filters";
import type { Signal } from "@/lib/signals/types";
import { signalConfidenceBands, signalDirections, signalStatuses } from "@/lib/signals/types";
import { formatNumber } from "@/lib/trading/format";
import { createSupabaseServerClient } from "@/lib/supabase/server";

interface SignalsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

async function getSignals() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { signals: [], error: "Supabase is not configured." };

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return { signals: [], error: "You must be signed in to view signals." };

  const { data, error } = await supabase
    .from("signals")
    .select("*, strategies(name)")
    .eq("user_id", userData.user.id)
    .order("created_at", { ascending: false });

  if (error) return { signals: [], error: error.message };
  return { signals: (data ?? []) as Signal[], error: null };
}

function titleCase(value: string) {
  return value.split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

function FilterGroup({ label, values, active, hrefFor }: { label: string; values: string[]; active: string; hrefFor: (value: string) => string }) {
  return (
    <div>
      <div className="mb-2 text-xs text-zinc-500">{label}</div>
      <div className="flex flex-wrap gap-2">
        {values.map((value) => (
          <Link key={value} href={hrefFor(value)} className={`rounded-xl border px-3 py-2 text-xs transition ${active === value ? "border-white/20 bg-white/15 text-white" : "border-white/10 bg-white/[0.045] text-zinc-400 hover:bg-white/[0.08] hover:text-white"}`}>
            {titleCase(value)}
          </Link>
        ))}
      </div>
    </div>
  );
}

function SummaryCard({ label, value, icon: Icon }: { label: string; value: string; icon: typeof Radio }) {
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

function SignalCard({ signal }: { signal: Signal }) {
  return (
    <GlassCard className="p-4 md:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold">{signal.symbol}</h2>
            <StatusBadge tone="neutral">{signal.market_type || "Market"}</StatusBadge>
            <StatusBadge tone="neutral">{signal.engine_type || "simulated"}</StatusBadge>
          </div>
          <p className="mt-1 text-xs text-zinc-500">{signal.strategies?.name || "Strategy snapshot"} / {signal.timeframe || "15m"}</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-semibold text-white">{formatNumber(signal.confidence, "0")}</div>
          <div className="text-[11px] text-zinc-500">Confidence</div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <StatusBadge tone={signalDirectionTone(signal.direction)}>{signal.direction}</StatusBadge>
        <StatusBadge tone={signalStatusTone(signal.status)}>{titleCase(signal.status)}</StatusBadge>
        <StatusBadge tone={signalNewsTone(signal.news_risk)}>News {titleCase(signal.news_risk || "low")}</StatusBadge>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-black/20 p-3">
          <div className="text-[11px] text-zinc-500">Setup</div>
          <div className="mt-1 text-sm text-white">{signal.setup_type}</div>
        </div>
        <div className="rounded-xl border border-white/10 bg-black/20 p-3">
          <div className="text-[11px] text-zinc-500">Entry Zone</div>
          <div className="mt-1 font-mono text-sm text-white">{signal.entry_zone}</div>
        </div>
        <div className="rounded-xl border border-white/10 bg-black/20 p-3">
          <div className="text-[11px] text-zinc-500">SL / TP</div>
          <div className="mt-1 font-mono text-sm text-white">{formatNumber(signal.stop_loss)} / {formatNumber(signal.take_profit)}</div>
        </div>
      </div>

      <p className="mt-5 line-clamp-3 text-sm leading-6 text-zinc-400">{signal.reasoning}</p>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
        <Link href={`/signals/${signal.id}`} className="inline-flex items-center gap-2 text-sm text-zinc-300 transition hover:text-white">
          <Eye className="h-4 w-4" />
          View
        </Link>
        <SignalStatusActions signalId={signal.id} compact />
      </div>
    </GlassCard>
  );
}

export default async function SignalsPage({ searchParams }: SignalsPageProps) {
  const params = await searchParams;
  const filters = parseSignalFilters(params);
  const { signals, error } = await getSignals();
  const filtered = filterSignals(signals, filters);
  const readyCount = signals.filter((signal) => signal.status === "ready").length;
  const averageConfidence = signals.length ? Math.round(signals.reduce((sum, signal) => sum + Number(signal.confidence ?? 0), 0) / signals.length) : 0;
  const highNewsCount = signals.filter((signal) => signal.news_risk === "high" || signal.news_risk === "extreme").length;

  return (
    <AppShell title="Signals" subtitle="Review simulated setup ideas generated from your strategies and scanner conditions.">
      <div className="space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl border border-white/10 bg-white/[0.06]">
              <Radio className="h-5 w-5 text-zinc-300" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Simulated Signals</h2>
              <p className="mt-1 text-sm text-zinc-500">Setup ideas for research and journaling. Real execution is not connected.</p>
            </div>
          </div>
          <StatusBadge tone="neutral">Simulated Signals</StatusBadge>
        </div>

        <GlassCard className="border-amber-300/20 bg-amber-300/10 p-4 text-sm text-amber-100">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>Signals are simulated setup ideas for research and journaling only. Real market data and execution are not connected yet.</span>
          </div>
        </GlassCard>

        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <form action={generateSimulatedSignalsFormAction}>
            <GenerateSignalsButton />
          </form>
          {params.generated ? <span className="text-sm text-emerald-300">Simulated signals generated.</span> : null}
          {typeof params.error === "string" ? <span className="text-sm text-rose-300">{params.error}</span> : null}
          {error ? <span className="text-sm text-rose-300">{error}</span> : null}
        </div>

        <GlassCard className="p-4 md:p-5">
          <div className="grid gap-4 xl:grid-cols-5">
            <FilterGroup label="Symbol" values={["All", ...scannerSymbols]} active={filters.symbol} hrefFor={(value) => signalFilterHref(filters, "symbol", value)} />
            <FilterGroup label="Direction" values={["All", ...signalDirections]} active={filters.direction} hrefFor={(value) => signalFilterHref(filters, "direction", value)} />
            <FilterGroup label="Status" values={["All", ...signalStatuses]} active={filters.status} hrefFor={(value) => signalFilterHref(filters, "status", value)} />
            <FilterGroup label="Confidence" values={signalConfidenceBands} active={filters.confidence} hrefFor={(value) => signalFilterHref(filters, "confidence", value)} />
            <FilterGroup label="News Risk" values={["All", ...scannerNewsRisks]} active={filters.newsRisk} hrefFor={(value) => signalFilterHref(filters, "newsRisk", value)} />
          </div>
        </GlassCard>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard label="Total Signals" value={String(signals.length)} icon={Radio} />
          <SummaryCard label="Ready Setups" value={String(readyCount)} icon={Target} />
          <SummaryCard label="Average Confidence" value={`${averageConfidence}%`} icon={Zap} />
          <SummaryCard label="High News Risk" value={String(highNewsCount)} icon={ShieldAlert} />
        </div>

        {filtered.length ? (
          <div className="grid gap-4 xl:grid-cols-2">
            {filtered.map((signal) => <SignalCard key={signal.id} signal={signal} />)}
          </div>
        ) : (
          <GlassCard className="p-8 text-center">
            <h2 className="text-lg font-semibold">No signals found</h2>
            <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-zinc-500">Generate simulated signals or adjust the filters. Active strategies are required before generation.</p>
          </GlassCard>
        )}
      </div>
    </AppShell>
  );
}
