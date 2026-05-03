import Link from "next/link";
import { Activity, Eye, Filter, Radar, ShieldAlert } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { GlassCard } from "@/components/ui/GlassCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { filterMarketScans, getBiasTone, getNewsRiskTone, getSetupTone, parseScannerFilters, scannerFilterHref } from "@/lib/scanner/filters";
import { getMarketScanResults } from "@/lib/scanner/mock-scanner";
import { scannerBiases, scannerMarketTypes, scannerNewsRisks, scannerSetups, scannerTimeframes, type MarketScanResult, type ScannerFilterState } from "@/lib/scanner/types";

interface MarketScannerPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function titleCase(value: string) {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function FilterGroup({ label, values, active, hrefFor }: { label: string; values: string[]; active: string; hrefFor: (value: string) => string }) {
  return (
    <div className="min-w-0">
      <div className="mb-2 text-xs text-zinc-500">{label}</div>
      <div className="flex flex-wrap gap-2">
        {values.map((value) => (
          <Link
            key={value}
            href={hrefFor(value)}
            className={`rounded-xl border px-3 py-2 text-xs transition ${active === value ? "border-white/20 bg-white/15 text-white" : "border-white/10 bg-white/[0.045] text-zinc-400 hover:bg-white/[0.08] hover:text-white"}`}
          >
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
      <div className="flex items-center justify-between">
        <div className="text-xs text-zinc-500">{label}</div>
        <Icon className="h-4 w-4 text-zinc-500" />
      </div>
      <div className="mt-2 text-2xl font-semibold text-white">{value}</div>
    </GlassCard>
  );
}

function ChecklistItem({ label, active }: { label: string; active: boolean }) {
  return (
    <div className={`rounded-xl border px-3 py-2 text-xs ${active ? "border-emerald-300/15 bg-emerald-400/10 text-emerald-200" : "border-white/10 bg-black/20 text-zinc-500"}`}>
      {label}
    </div>
  );
}

function MarketCard({ result }: { result: MarketScanResult }) {
  return (
    <GlassCard className="p-4 md:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold">{result.symbol}</h2>
            <StatusBadge tone="neutral">{result.marketType}</StatusBadge>
          </div>
          <p className="mt-1 text-xs text-zinc-500">{result.timeframe} simulated market state</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-semibold text-white">{result.confidence}</div>
          <div className="text-[11px] text-zinc-500">Confidence</div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <StatusBadge tone={getBiasTone(result.bias)}>{titleCase(result.bias)}</StatusBadge>
        <StatusBadge tone={getSetupTone(result.setupReadiness)}>{titleCase(result.setupReadiness)}</StatusBadge>
        <StatusBadge tone={getNewsRiskTone(result.newsRiskLevel)}>News {titleCase(result.newsRiskLevel)}</StatusBadge>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-white/10 bg-black/20 p-3">
          <div className="text-[11px] text-zinc-500">Structure</div>
          <div className="mt-1 text-sm text-white">{titleCase(result.structureState)}</div>
        </div>
        <div className="rounded-xl border border-white/10 bg-black/20 p-3">
          <div className="text-[11px] text-zinc-500">PD State</div>
          <div className="mt-1 text-sm text-white">{titleCase(result.premiumDiscountState)}</div>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
        <ChecklistItem label="BOS" active={result.bosDetected} />
        <ChecklistItem label="CHoCH" active={result.chochDetected} />
        <ChecklistItem label="Sweep" active={result.liquiditySweepDetected} />
        <ChecklistItem label="FVG" active={result.fvgDetected} />
        <ChecklistItem label="Order Block" active={result.orderBlockDetected} />
      </div>

      <p className="mt-5 text-sm leading-6 text-zinc-400">{result.summary}</p>

      <Link href={`/market-scanner/${result.symbol}?timeframe=${result.timeframe}`} className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/12 px-4 text-sm font-semibold text-white transition hover:bg-white/18">
        <Eye className="h-4 w-4" />
        View Details
      </Link>
    </GlassCard>
  );
}

export default async function MarketScannerPage({ searchParams }: MarketScannerPageProps) {
  const params = await searchParams;
  const filters = parseScannerFilters(params);
  const results = getMarketScanResults(filters.timeframe);
  const filtered = filterMarketScans(results, filters);
  const readyCount = results.filter((result) => result.setupReadiness === "ready").length;
  const highNewsCount = results.filter((result) => result.newsRiskLevel === "high" || result.newsRiskLevel === "extreme").length;
  const averageConfidence = results.length ? Math.round(results.reduce((sum, result) => sum + result.confidence, 0) / results.length) : 0;

  return (
    <AppShell title="Market Scanner" subtitle="Track market structure, liquidity, and setup readiness across your watchlist.">
      <div className="space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl border border-white/10 bg-white/[0.06]">
              <Radar className="h-5 w-5 text-zinc-300" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Simulated Market Scanner</h2>
              <p className="mt-1 text-sm text-zinc-500">SMC/ICT checklist output generated locally. Real market data is not connected yet.</p>
            </div>
          </div>
          <StatusBadge tone="neutral">Simulated Scanner</StatusBadge>
        </div>

        <GlassCard className="p-4 md:p-5">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold">
            <Filter className="h-4 w-4 text-zinc-500" />
            Scanner Filters
          </div>
          <div className="grid gap-4 xl:grid-cols-5">
            <FilterGroup label="Market Type" values={["All", ...scannerMarketTypes]} active={filters.marketType} hrefFor={(value) => scannerFilterHref(filters, "marketType", value)} />
            <FilterGroup label="Bias" values={["All", ...scannerBiases]} active={filters.bias} hrefFor={(value) => scannerFilterHref(filters, "bias", value)} />
            <FilterGroup label="Setup" values={["All", ...scannerSetups]} active={filters.setupReadiness} hrefFor={(value) => scannerFilterHref(filters, "setupReadiness", value)} />
            <FilterGroup label="News Risk" values={["All", ...scannerNewsRisks]} active={filters.newsRiskLevel} hrefFor={(value) => scannerFilterHref(filters, "newsRiskLevel", value)} />
            <FilterGroup label="Timeframe" values={scannerTimeframes} active={filters.timeframe} hrefFor={(value) => scannerFilterHref(filters, "timeframe", value as ScannerFilterState["timeframe"])} />
          </div>
        </GlassCard>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard label="Markets Scanned" value={String(results.length)} icon={Radar} />
          <SummaryCard label="Ready Setups" value={String(readyCount)} icon={Activity} />
          <SummaryCard label="High News Risk" value={String(highNewsCount)} icon={ShieldAlert} />
          <SummaryCard label="Average Confidence" value={`${averageConfidence}%`} icon={Eye} />
        </div>

        {filtered.length ? (
          <div className="grid gap-4 xl:grid-cols-2 2xl:grid-cols-3">
            {filtered.map((result) => <MarketCard key={result.symbol} result={result} />)}
          </div>
        ) : (
          <GlassCard className="p-8 text-center">
            <h2 className="text-lg font-semibold">No markets match these filters</h2>
            <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-zinc-500">Adjust market type, bias, setup readiness, news risk, or timeframe to see simulated scanner output.</p>
          </GlassCard>
        )}
      </div>
    </AppShell>
  );
}
