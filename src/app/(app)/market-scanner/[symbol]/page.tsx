import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BarChart3, Check, Clock3, RadioTower, ShieldAlert, X } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { GlassCard } from "@/components/ui/GlassCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { EconomicEvent } from "@/lib/calendar/types";
import { formatMarketPrice } from "@/lib/market-data/instruments";
import { getMarketSnapshot, isMarketSnapshotStale } from "@/lib/market-data/repository";
import { marketSnapshotToScanResult } from "@/lib/market-data/scanner-adapter";
import { getBiasTone, getNewsRiskTone, getSetupTone } from "@/lib/scanner/filters";
import { scannerSymbols, scannerTimeframes, type MarketSymbol, type ScannerTimeframe } from "@/lib/scanner/types";
import { createSupabaseServerClient, getCurrentUser } from "@/lib/supabase/server";

interface MarketDetailPageProps {
  params: Promise<{ symbol: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}
function titleCase(value: string) {
  return value.split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

function DetailStat({ label, value }: { label: string; value: string }) {
  return <GlassCard className="p-4"><div className="text-xs text-zinc-500">{label}</div><div className="mt-2 text-xl font-semibold text-white">{value}</div></GlassCard>;
}

export default async function MarketDetailPage({ params, searchParams }: MarketDetailPageProps) {
  const [{ symbol }, query] = await Promise.all([params, searchParams]);
  const normalizedSymbol = symbol.toUpperCase() as MarketSymbol;
  if (!scannerSymbols.includes(normalizedSymbol)) notFound();
  const rawTimeframe = Array.isArray(query.timeframe) ? query.timeframe[0] : query.timeframe;
  const timeframe = scannerTimeframes.includes(rawTimeframe as ScannerTimeframe) ? rawTimeframe as ScannerTimeframe : "15m";
  const user = await getCurrentUser();
  const supabase = await createSupabaseServerClient();
  const now = new Date();
  const [snapshotResult, eventResult] = await Promise.all([
    getMarketSnapshot(normalizedSymbol, timeframe),
    supabase
      ? supabase.from("economic_events").select("id,currency,title,impact,event_time,actual,forecast,previous,source,created_at,updated_at").gte("event_time", now.toISOString()).lte("event_time", new Date(now.getTime() + 4 * 60 * 60_000).toISOString()).neq("source", "sample").order("event_time", { ascending: true }).limit(50)
      : Promise.resolve({ data: [], error: null }),
  ]);
  const events = eventResult.error ? [] : ((eventResult.data ?? []) as EconomicEvent[]);
  const snapshot = snapshotResult.snapshot;

  if (!snapshot) {
    return (
      <AppShell title="Market Scanner" subtitle="Symbol-level market intelligence." user={user}>
        <div className="space-y-4">
          <Link href="/market-scanner" className="inline-flex items-center gap-2 text-sm text-zinc-400 transition hover:text-white"><ArrowLeft className="h-4 w-4" />Back to Scanner</Link>
          <GlassCard className="p-6 text-center">
            <RadioTower className="mx-auto h-7 w-7 text-zinc-500" />
            <h2 className="mt-4 text-xl font-semibold">No verified {normalizedSymbol} data for {timeframe}.</h2>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-zinc-500">Real provider candles have not been stored for this instrument and timeframe. No synthetic structure or price is shown.</p>
            <Link href="/connections/market-data" className="mt-5 inline-flex h-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] px-4 text-sm font-semibold text-zinc-200">Market Data Setup</Link>
          </GlassCard>
        </div>
      </AppShell>
    );
  }

  const result = marketSnapshotToScanResult(snapshot, events);
  const stale = isMarketSnapshotStale(snapshot);
  const checklist = [
    ["Break of Structure", result.bosDetected],
    ["Change of Character", result.chochDetected],
    ["Liquidity Sweep", result.liquiditySweepDetected],
    ["Fair Value Gap", result.fvgDetected],
    ["Order Block", result.orderBlockDetected],
  ] as const;

  return (
    <AppShell title="Market Scanner" subtitle="Rule-based intelligence from verified OHLC candles." user={user}>
      <div className="space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <Link href={`/market-scanner?timeframe=${timeframe}`} className="inline-flex items-center gap-2 text-sm text-zinc-400 transition hover:text-white"><ArrowLeft className="h-4 w-4" />Back to Scanner</Link>
            <div className="mt-4 flex flex-wrap items-center gap-2"><h2 className="text-2xl font-semibold">{normalizedSymbol}</h2><StatusBadge tone="neutral">{result.marketType}</StatusBadge><StatusBadge tone={stale ? "warning" : "positive"}>{stale ? "Stale Data" : "Real Data"}</StatusBadge></div>
            <p className="mt-2 text-sm text-zinc-500">Source candle: {new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(snapshot.sourceTime))} · {snapshot.candleCount} candles analyzed.</p>
          </div>
          <div className="flex flex-wrap gap-2"><StatusBadge tone={getBiasTone(result.bias)}>{titleCase(result.bias)}</StatusBadge><StatusBadge tone={getSetupTone(result.setupReadiness)}>{titleCase(result.setupReadiness)}</StatusBadge></div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <DetailStat label="Last Price" value={formatMarketPrice(result.symbol, snapshot.lastPrice)} />
          <DetailStat label="Evidence Score" value={`${result.confidence}/100`} />
          <DetailStat label="Timeframe" value={result.timeframe} />
          <DetailStat label="Structure" value={titleCase(result.structureState)} />
          <DetailStat label="PD State" value={titleCase(result.premiumDiscountState)} />
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <GlassCard className="p-5">
            <div className="flex items-center justify-between"><h2 className="text-lg font-semibold">SMC / ICT Checklist</h2><BarChart3 className="h-4 w-4 text-zinc-500" /></div>
            <div className="mt-4 grid gap-2">{checklist.map(([label, active]) => <div key={label} className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-sm"><span className="text-zinc-300">{label}</span>{active ? <Check className="h-4 w-4 text-emerald-300" /> : <X className="h-4 w-4 text-zinc-600" />}</div>)}</div>
          </GlassCard>

          <GlassCard className="p-5">
            <div className="flex items-center justify-between"><h2 className="text-lg font-semibold">Key Levels</h2><Clock3 className="h-4 w-4 text-zinc-500" /></div>
            <div className="mt-4 grid gap-2">{result.keyLevels.map((level) => <div key={level.label} className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-sm"><span className="text-zinc-500">{level.label}</span><span className="font-mono text-white">{level.value}</span></div>)}</div>
            <p className="mt-4 text-sm leading-6 text-zinc-400">{result.summary}</p>
          </GlassCard>

          <GlassCard className="p-5">
            <div className="flex items-center justify-between"><h2 className="text-lg font-semibold">News Risk</h2><ShieldAlert className="h-4 w-4 text-zinc-500" /></div>
            <div className="mt-4"><StatusBadge tone={getNewsRiskTone(result.newsRiskLevel)}>{titleCase(result.newsRiskLevel)}</StatusBadge></div>
            <p className="mt-3 text-sm leading-6 text-zinc-400">{result.newsRiskLevel === "unknown" ? "No verified relevant event was found in the next four hours. This does not mean news risk is zero." : "Risk is derived from verified calendar events relevant to this instrument."}</p>
          </GlassCard>

          <GlassCard className="p-5">
            <div className="flex items-center justify-between"><h2 className="text-lg font-semibold">Limitations</h2><RadioTower className="h-4 w-4 text-zinc-500" /></div>
            <div className="mt-4 grid gap-2">{result.warnings.map((warning) => <div key={warning} className="rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-sm leading-6 text-zinc-400">{warning}</div>)}</div>
          </GlassCard>
        </div>
      </div>
    </AppShell>
  );
}
