import Link from "next/link";
import { Activity, Clock3, Eye, Filter, Radar, ShieldAlert } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { MarketDataSyncForm } from "@/components/scanner/MarketDataSyncForm";
import { GlassCard } from "@/components/ui/GlassCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { EconomicEvent } from "@/lib/calendar/types";
import { isAdminUser } from "@/lib/auth/admin";
import { getMarketDataProvider, isMarketDataConfigured } from "@/lib/market-data/config";
import { formatMarketPrice } from "@/lib/market-data/instruments";
import { getMarketDataSymbols } from "@/lib/market-data/instruments";
import { getMarketSnapshots, isMarketSnapshotStale } from "@/lib/market-data/repository";
import { marketSnapshotToScanResult } from "@/lib/market-data/scanner-adapter";
import { filterMarketScans, getBiasTone, getNewsRiskTone, getSetupTone, parseScannerFilters, scannerFilterHref } from "@/lib/scanner/filters";
import { scannerBiases, scannerMarketTypes, scannerNewsRisks, scannerSetups, scannerTimeframes } from "@/lib/scanner/types";
import { createSupabaseServerClient, getCurrentUser } from "@/lib/supabase/server";

interface MarketScannerPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}
function titleCase(value: string) {
  return value.split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function FilterGroup({ label, values, active, hrefFor }: { label: string; values: string[]; active: string; hrefFor: (value: string) => string }) {
  return (
    <div className="min-w-0">
      <div className="mb-2 text-xs text-zinc-500">{label}</div>
      <div className="flex flex-wrap gap-2">
        {values.map((value) => (
          <Link key={value} href={hrefFor(value)} className={`rounded-xl border px-3 py-2 text-xs transition ${active === value ? "border-white/20 bg-white/12 text-white" : "border-white/10 bg-white/[0.035] text-zinc-500 hover:bg-white/[0.07] hover:text-zinc-200"}`}>
            {titleCase(value)}
          </Link>
        ))}
      </div>
    </div>
  );
}

function SummaryCard({ label, value, icon: Icon }: { label: string; value: string; icon: typeof Radar }) {
  return (
    <GlassCard className="p-4">
      <div className="flex items-center justify-between"><div className="text-xs text-zinc-500">{label}</div><Icon className="h-4 w-4 text-zinc-500" /></div>
      <div className="mt-2 text-2xl font-semibold text-white">{value}</div>
    </GlassCard>
  );
}

export default async function MarketScannerPage({ searchParams }: MarketScannerPageProps) {
  const params = await searchParams;
  const filters = parseScannerFilters(params);
  const provider = getMarketDataProvider();
  const providerReady = isMarketDataConfigured();
  const supportedSymbols = getMarketDataSymbols(provider);
  const user = await getCurrentUser();
  const supabase = await createSupabaseServerClient();
  const now = new Date();
  const eventEnd = new Date(now.getTime() + 4 * 60 * 60_000).toISOString();
  const [snapshotResult, eventResult] = await Promise.all([
    getMarketSnapshots(filters.timeframe),
    supabase
      ? supabase.from("economic_events").select("id,currency,title,impact,event_time,actual,forecast,previous,source,created_at,updated_at").gte("event_time", now.toISOString()).lte("event_time", eventEnd).neq("source", "sample").order("event_time", { ascending: true }).limit(50)
      : Promise.resolve({ data: [], error: null }),
  ]);
  const events = eventResult.error ? [] : ((eventResult.data ?? []) as EconomicEvent[]);
  const results = snapshotResult.snapshots.map((snapshot) => marketSnapshotToScanResult(snapshot, events));
  const filtered = filterMarketScans(results, filters);
  const readyCount = results.filter((result) => result.setupReadiness === "ready").length;
  const highNewsCount = results.filter((result) => result.newsRiskLevel === "high" || result.newsRiskLevel === "extreme").length;
  const averageConfidence = results.length ? Math.round(results.reduce((sum, result) => sum + result.confidence, 0) / results.length) : 0;
  const syncState = firstValue(params.sync);
  const syncMessage = firstValue(params.message);

  return (
    <AppShell title="Market Scanner" subtitle="Verified OHLC structure and setup readiness across your watchlist." user={user}>
      <div className="space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl border border-white/10 bg-white/[0.06]"><Radar className="h-5 w-5 text-zinc-300" /></div>
            <div><h2 className="text-xl font-semibold">Market Scanner</h2><p className="mt-1 text-sm text-zinc-500">Only stored provider candles are analyzed. No synthetic prices are generated.</p></div>
          </div>
          <StatusBadge tone={results.length ? "positive" : providerReady ? "warning" : "neutral"}>{results.length ? "Real Data" : providerReady ? "Ready to Sync" : "Not Connected"}</StatusBadge>
        </div>

        {syncState ? <GlassCard className={`p-4 text-sm ${syncState === "success" ? "border-emerald-300/20 text-emerald-200" : "border-amber-300/20 text-amber-100"}`}>{syncMessage || (syncState === "denied" ? "Admin access is required to update platform market data." : "Market data update did not complete.")}</GlassCard> : null}

        <GlassCard className="p-5 md:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <div className="flex items-center gap-2 text-sm font-semibold text-white"><Clock3 className="h-4 w-4 text-zinc-400" />{results.length ? `${results.length} verified snapshots available` : providerReady ? `${supportedSymbols.length} public markets available` : "Market Data Service required"}</div>
              <h3 className="mt-3 text-2xl font-semibold text-white">{results.length ? "Rule-based market intelligence from real candles." : providerReady ? "Public market feed is connected and ready for its first update." : "Connect a provider to activate market intelligence."}</h3>
              <p className="mt-3 text-sm leading-6 text-zinc-500">Confidence reflects deterministic structure evidence and data coverage. It is not a probability of profit or financial advice.</p>
            </div>
            {isAdminUser(user) ? <MarketDataSyncForm timeframe={filters.timeframe} symbols={supportedSymbols} provider={provider} /> : <Link href="/connections/market-data" className="inline-flex h-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] px-4 text-sm font-semibold text-zinc-200 transition hover:bg-white/10">Market Data Setup</Link>}
          </div>
        </GlassCard>

        <GlassCard className="p-4 md:p-5">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold"><Filter className="h-4 w-4 text-zinc-500" />Scanner Filters</div>
          <div className="grid gap-4 xl:grid-cols-5">
            <FilterGroup label="Market Type" values={["All", ...scannerMarketTypes]} active={filters.marketType} hrefFor={(value) => scannerFilterHref(filters, "marketType", value)} />
            <FilterGroup label="Bias" values={["All", ...scannerBiases]} active={filters.bias} hrefFor={(value) => scannerFilterHref(filters, "bias", value)} />
            <FilterGroup label="Setup" values={["All", ...scannerSetups]} active={filters.setupReadiness} hrefFor={(value) => scannerFilterHref(filters, "setupReadiness", value)} />
            <FilterGroup label="News Risk" values={["All", ...scannerNewsRisks]} active={filters.newsRiskLevel} hrefFor={(value) => scannerFilterHref(filters, "newsRiskLevel", value)} />
            <FilterGroup label="Timeframe" values={scannerTimeframes} active={filters.timeframe} hrefFor={(value) => scannerFilterHref(filters, "timeframe", value)} />
          </div>
        </GlassCard>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard label="Markets Scanned" value={String(results.length)} icon={Radar} />
          <SummaryCard label="Ready Setups" value={String(readyCount)} icon={Activity} />
          <SummaryCard label="High News Risk" value={String(highNewsCount)} icon={ShieldAlert} />
          <SummaryCard label="Average Confidence" value={`${averageConfidence}%`} icon={Eye} />
        </div>

        {filtered.length ? (
          <div className="grid gap-4 xl:grid-cols-2">
            {filtered.map((result) => {
              const snapshot = snapshotResult.snapshots.find((item) => item.symbol === result.symbol)!;
              const stale = isMarketSnapshotStale(snapshot);
              return (
                <GlassCard key={`${result.symbol}-${result.timeframe}`} className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2"><h2 className="text-xl font-semibold">{result.symbol}</h2><StatusBadge tone="neutral">{result.marketType}</StatusBadge><StatusBadge tone={stale ? "warning" : "positive"}>{stale ? "Stale" : "Real Data"}</StatusBadge></div>
                      <div className="mt-2 text-2xl font-semibold text-white">{formatMarketPrice(result.symbol, snapshot.lastPrice)}</div>
                      <div className="mt-1 text-xs text-zinc-500">{result.timeframe} · source candle {new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(result.updatedAt))}</div>
                    </div>
                    <div className="text-right"><div className="text-2xl font-semibold">{result.confidence}</div><div className="text-[11px] text-zinc-500">Evidence score</div></div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2"><StatusBadge tone={getBiasTone(result.bias)}>{titleCase(result.bias)}</StatusBadge><StatusBadge tone={getSetupTone(result.setupReadiness)}>{titleCase(result.setupReadiness)}</StatusBadge><StatusBadge tone={getNewsRiskTone(result.newsRiskLevel)}>News {titleCase(result.newsRiskLevel)}</StatusBadge></div>
                  <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
                    {([['BOS', result.bosDetected], ['CHoCH', result.chochDetected], ['Sweep', result.liquiditySweepDetected], ['FVG', result.fvgDetected], ['OB', result.orderBlockDetected]] as const).map(([label, active]) => <div key={label} className={`rounded-xl border px-2 py-2 text-center text-xs ${active ? "border-white/20 bg-white/10 text-white" : "border-white/10 bg-black/20 text-zinc-600"}`}>{label}</div>)}
                  </div>
                  <p className="mt-4 text-sm leading-6 text-zinc-400">{result.summary}</p>
                  <Link href={`/market-scanner/${result.symbol}?timeframe=${result.timeframe}`} className="mt-5 inline-flex h-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] px-4 text-sm font-semibold text-zinc-200 transition hover:bg-white/10">View Details</Link>
                </GlassCard>
              );
            })}
          </div>
        ) : (
          <GlassCard className="p-8 text-center"><h2 className="text-lg font-semibold">{results.length ? "No markets match these filters." : "No verified market data yet."}</h2><p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-zinc-500">{results.length ? "Adjust filters to view available snapshots." : providerReady ? "Run the first admin update to store verified public candles. Fake prices and scanner scores remain disabled." : "Configure the Market Data Service and run an admin update. Fake prices and scanner scores remain disabled."}</p></GlassCard>
        )}

        {snapshotResult.error && !snapshotResult.error.includes("market_snapshots") ? <GlassCard className="border-amber-300/20 p-4 text-sm text-amber-100">Market data could not be loaded.</GlassCard> : null}
      </div>
    </AppShell>
  );
}
