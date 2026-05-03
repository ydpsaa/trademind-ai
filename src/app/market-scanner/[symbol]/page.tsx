import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BarChart3, BellRing, Layers3, LineChart, Radar, ShieldAlert, Sparkles } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { GlassCard } from "@/components/ui/GlassCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { getBiasTone, getNewsRiskTone, getSetupTone } from "@/lib/scanner/filters";
import { getMarketScanResult } from "@/lib/scanner/mock-scanner";
import { scannerTimeframes, type ScannerTimeframe } from "@/lib/scanner/types";
import { formatDateTime } from "@/lib/trading/format";

interface MarketDetailPageProps {
  params: Promise<{ symbol: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function titleCase(value: string) {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function validTimeframe(value: string | string[] | undefined): ScannerTimeframe {
  const normalized = Array.isArray(value) ? value[0] : value;
  return scannerTimeframes.includes(normalized as ScannerTimeframe) ? (normalized as ScannerTimeframe) : "15m";
}

function CheckRow({ label, active }: { label: string; active: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-3 py-3">
      <span className="text-sm text-zinc-300">{label}</span>
      <StatusBadge tone={active ? "positive" : "neutral"}>{active ? "Detected" : "Not detected"}</StatusBadge>
    </div>
  );
}

function DetailStat({ label, value }: { label: string; value: string }) {
  return (
    <GlassCard className="p-4">
      <div className="text-xs text-zinc-500">{label}</div>
      <div className="mt-2 text-xl font-semibold text-white">{value}</div>
    </GlassCard>
  );
}

export default async function MarketDetailPage({ params, searchParams }: MarketDetailPageProps) {
  const { symbol } = await params;
  const query = await searchParams;
  const timeframe = validTimeframe(query.timeframe);
  const result = getMarketScanResult(symbol.toUpperCase(), timeframe);
  if (!result) notFound();

  return (
    <AppShell title="Market Scanner" subtitle="Simulated symbol-level market structure view.">
      <div className="space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <Link href={`/market-scanner?timeframe=${result.timeframe}`} className="inline-flex items-center gap-2 text-sm text-zinc-400 transition hover:text-white">
              <ArrowLeft className="h-4 w-4" />
              Back to Scanner
            </Link>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-semibold">{result.symbol}</h2>
              <StatusBadge tone="neutral">{result.marketType}</StatusBadge>
              <StatusBadge tone="neutral">Simulated Market State</StatusBadge>
            </div>
            <p className="mt-2 text-sm text-zinc-500">Updated {formatDateTime(result.updatedAt)}. Real-time market data is not connected yet.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <StatusBadge tone={getBiasTone(result.bias)}>{titleCase(result.bias)}</StatusBadge>
            <StatusBadge tone={getSetupTone(result.setupReadiness)}>{titleCase(result.setupReadiness)}</StatusBadge>
            <StatusBadge tone={getNewsRiskTone(result.newsRiskLevel)}>News {titleCase(result.newsRiskLevel)}</StatusBadge>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <DetailStat label="Confidence" value={`${result.confidence}/100`} />
          <DetailStat label="Timeframe" value={result.timeframe} />
          <DetailStat label="Structure" value={titleCase(result.structureState)} />
          <DetailStat label="PD State" value={titleCase(result.premiumDiscountState)} />
          <DetailStat label="Setup" value={titleCase(result.setupReadiness)} />
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <GlassCard className="p-4 md:p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">SMC / ICT Checklist</h2>
              <Layers3 className="h-4 w-4 text-zinc-500" />
            </div>
            <div className="mt-4 grid gap-2">
              <CheckRow label="Break of Structure" active={result.bosDetected} />
              <CheckRow label="Change of Character" active={result.chochDetected} />
              <CheckRow label="Liquidity Sweep" active={result.liquiditySweepDetected} />
              <CheckRow label="Fair Value Gap" active={result.fvgDetected} />
              <CheckRow label="Order Block" active={result.orderBlockDetected} />
            </div>
          </GlassCard>

          <GlassCard className="p-4 md:p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Key Levels</h2>
              <Radar className="h-4 w-4 text-zinc-500" />
            </div>
            <div className="mt-4 grid gap-2">
              {result.keyLevels.map((level) => (
                <div key={level.label} className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-3 py-3">
                  <span className="text-sm text-zinc-400">{level.label}</span>
                  <span className="font-mono text-sm text-white">{level.value}</span>
                </div>
              ))}
            </div>
          </GlassCard>

          <GlassCard className="p-4 md:p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">News Risk</h2>
              <ShieldAlert className="h-4 w-4 text-zinc-500" />
            </div>
            <p className="mt-3 text-sm leading-6 text-zinc-300">
              Current simulated news risk is <span className="font-semibold text-white">{titleCase(result.newsRiskLevel)}</span>. This is local mock context only; economic calendar and live macro feeds are not connected to the scanner yet.
            </p>
          </GlassCard>

          <GlassCard className="p-4 md:p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Warnings</h2>
              <BellRing className="h-4 w-4 text-zinc-500" />
            </div>
            <div className="mt-4 space-y-2">
              {result.warnings.map((warning) => (
                <div key={warning} className="rounded-xl border border-white/10 bg-white/[0.04] p-3 text-sm text-zinc-300">
                  {warning}
                </div>
              ))}
            </div>
          </GlassCard>
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
              <h2 className="text-lg font-semibold">Future Signal Engine</h2>
              <Sparkles className="h-4 w-4 text-zinc-500" />
            </div>
            <p className="mt-4 text-sm leading-6 text-zinc-300">{result.summary}</p>
            <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-zinc-500">
              Signal engine will be connected after real market data integration.
            </div>
          </GlassCard>
        </div>
      </div>
    </AppShell>
  );
}
