import Link from "next/link";
import { ArrowLeft, BarChart3, LineChart, RadioTower, ShieldAlert, Sparkles } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { GlassCard } from "@/components/ui/GlassCard";
import { StatusBadge } from "@/components/ui/StatusBadge";

interface MarketDetailPageProps {
  params: Promise<{ symbol: string }>;
}

function DetailStat({ label, value }: { label: string; value: string }) {
  return (
    <GlassCard className="p-4">
      <div className="text-xs text-zinc-500">{label}</div>
      <div className="mt-2 text-xl font-semibold text-white">{value}</div>
    </GlassCard>
  );
}

export default async function MarketDetailPage({ params }: MarketDetailPageProps) {
  const { symbol } = await params;
  const normalizedSymbol = symbol.toUpperCase();

  return (
    <AppShell title="Market Scanner" subtitle="Symbol-level market state will activate after Market Data Feed integration.">
      <div className="space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <Link href="/market-scanner" className="inline-flex items-center gap-2 text-sm text-zinc-400 transition hover:text-white">
              <ArrowLeft className="h-4 w-4" />
              Back to Scanner
            </Link>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-semibold">{normalizedSymbol}</h2>
              <StatusBadge tone="neutral">Not Connected</StatusBadge>
            </div>
            <p className="mt-2 text-sm text-zinc-500">Real market data is not connected yet. This symbol will be available after Market Data Feed integration.</p>
          </div>
        </div>

        <GlassCard className="p-5 md:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <RadioTower className="h-4 w-4 text-zinc-400" />
                Market Data Feed required
              </div>
              <h3 className="mt-3 text-2xl font-semibold tracking-tight text-white">No live structure, setup, confidence, or levels are available yet.</h3>
              <p className="mt-3 text-sm leading-6 text-zinc-500">TradeMind AI no longer shows fake scanner values in production. Connect a real market data provider to activate this page.</p>
            </div>
            <Link href="/connections/market-data" className="inline-flex h-11 items-center justify-center rounded-xl border border-white/10 bg-white/12 px-4 text-sm font-semibold text-white transition hover:bg-white/18">
              View Market Data Setup
            </Link>
          </div>
        </GlassCard>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <DetailStat label="Confidence" value="0/100" />
          <DetailStat label="Timeframe" value="Not connected" />
          <DetailStat label="Structure" value="Not connected" />
          <DetailStat label="PD State" value="Not connected" />
          <DetailStat label="Setup" value="Not connected" />
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <GlassCard className="p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Chart Placeholder</h2>
              <LineChart className="h-4 w-4 text-zinc-500" />
            </div>
            <div className="mt-4 grid h-56 place-items-center rounded-2xl border border-white/10 bg-black/30 text-center">
              <div>
                <BarChart3 className="mx-auto h-8 w-8 text-zinc-500" />
                <p className="mt-3 text-sm text-zinc-400">TradingView / live chart will be connected later.</p>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">News and Signal Readiness</h2>
              <ShieldAlert className="h-4 w-4 text-zinc-500" />
            </div>
            <p className="mt-4 text-sm leading-6 text-zinc-300">Scanner news risk and signal readiness require verified market data and calendar context. No fake setup idea is shown here.</p>
            <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-zinc-500">
              <Sparkles className="mr-2 inline h-4 w-4" />
              Signal engine will be connected after real market data integration.
            </div>
          </GlassCard>
        </div>
      </div>
    </AppShell>
  );
}
