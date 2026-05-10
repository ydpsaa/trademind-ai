import Link from "next/link";
import { Activity, Eye, Filter, Radar, RadioTower, ShieldAlert } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { GlassCard } from "@/components/ui/GlassCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { scannerBiases, scannerMarketTypes, scannerNewsRisks, scannerSetups, scannerTimeframes } from "@/lib/scanner/types";

function titleCase(value: string) {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function DisabledFilterGroup({ label, values }: { label: string; values: string[] }) {
  return (
    <div className="min-w-0">
      <div className="mb-2 text-xs text-zinc-500">{label}</div>
      <div className="flex flex-wrap gap-2">
        {values.map((value, index) => (
          <span key={value} className={`rounded-xl border px-3 py-2 text-xs ${index === 0 ? "border-white/20 bg-white/12 text-white" : "border-white/10 bg-white/[0.035] text-zinc-500"}`}>
            {titleCase(value)}
          </span>
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

export default async function MarketScannerPage() {
  return (
    <AppShell title="Market Scanner" subtitle="Track market structure, liquidity, and setup readiness across your watchlist.">
      <div className="space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl border border-white/10 bg-white/[0.06]">
              <Radar className="h-5 w-5 text-zinc-300" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Market Scanner</h2>
              <p className="mt-1 text-sm text-zinc-500">Real market data is required before scanner output can be shown.</p>
            </div>
          </div>
          <StatusBadge tone="neutral">Not Connected</StatusBadge>
        </div>

        <GlassCard className="p-5 md:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <RadioTower className="h-4 w-4 text-zinc-400" />
                Market Data Feed required
              </div>
              <h3 className="mt-3 text-2xl font-semibold tracking-tight text-white">Scanner output is disabled until real market data is connected.</h3>
              <p className="mt-3 text-sm leading-6 text-zinc-500">TradeMind AI will show structure, liquidity, setup readiness, confidence, and news risk only after a verified data provider is connected.</p>
            </div>
            <Link href="/connections/market-data" className="inline-flex h-11 items-center justify-center rounded-xl border border-white/10 bg-white/12 px-4 text-sm font-semibold text-white transition hover:bg-white/18">
              View Market Data Setup
            </Link>
          </div>
        </GlassCard>

        <GlassCard className="p-4 md:p-5">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold">
            <Filter className="h-4 w-4 text-zinc-500" />
            Scanner Filters
          </div>
          <div className="grid gap-4 xl:grid-cols-5">
            <DisabledFilterGroup label="Market Type" values={["All", ...scannerMarketTypes]} />
            <DisabledFilterGroup label="Bias" values={["All", ...scannerBiases]} />
            <DisabledFilterGroup label="Setup" values={["All", ...scannerSetups]} />
            <DisabledFilterGroup label="News Risk" values={["All", ...scannerNewsRisks]} />
            <DisabledFilterGroup label="Timeframe" values={scannerTimeframes} />
          </div>
        </GlassCard>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard label="Markets Scanned" value="0" icon={Radar} />
          <SummaryCard label="Ready Setups" value="0" icon={Activity} />
          <SummaryCard label="High News Risk" value="0" icon={ShieldAlert} />
          <SummaryCard label="Average Confidence" value="0%" icon={Eye} />
        </div>

        <GlassCard className="p-8 text-center">
          <h2 className="text-lg font-semibold">No market scanner data yet.</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-zinc-500">Connect Market Data Feed to activate real scanner cards. Fake confidence, structure, and setup readiness are disabled in production UI.</p>
        </GlassCard>
      </div>
    </AppShell>
  );
}
