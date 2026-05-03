import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, AlertTriangle, Layers3, Radio, ShieldAlert } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { SignalStatusActions } from "@/components/signals/SignalActions";
import { GlassCard } from "@/components/ui/GlassCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { signalDirectionTone, signalNewsTone, signalStatusTone } from "@/lib/signals/filters";
import type { Signal } from "@/lib/signals/types";
import { formatDateTime, formatNumber } from "@/lib/trading/format";
import { createSupabaseServerClient } from "@/lib/supabase/server";

interface SignalDetailPageProps {
  params: Promise<{ signalId: string }>;
}

async function getSignal(signalId: string) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return null;

  const { data, error } = await supabase
    .from("signals")
    .select("*, strategies(name)")
    .eq("id", signalId)
    .eq("user_id", userData.user.id)
    .maybeSingle();

  if (error) return null;
  return (data ?? null) as Signal | null;
}

function titleCase(value: string) {
  return value.split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <GlassCard className="p-4">
      <div className="text-xs text-zinc-500">{label}</div>
      <div className="mt-2 text-xl font-semibold text-white">{value}</div>
    </GlassCard>
  );
}

function SnapshotRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-3 py-3">
      <span className="text-sm text-zinc-400">{label}</span>
      <span className="text-sm text-white">{value}</span>
    </div>
  );
}

export default async function SignalDetailPage({ params }: SignalDetailPageProps) {
  const { signalId } = await params;
  const signal = await getSignal(signalId);
  if (!signal) notFound();

  const snapshot = signal.scanner_snapshot;

  return (
    <AppShell title="Signal Detail" subtitle="Simulated setup idea report.">
      <div className="space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <Link href="/signals" className="inline-flex items-center gap-2 text-sm text-zinc-400 transition hover:text-white">
              <ArrowLeft className="h-4 w-4" />
              Back to Signals
            </Link>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-semibold">{signal.symbol}</h2>
              <StatusBadge tone={signalDirectionTone(signal.direction)}>{signal.direction}</StatusBadge>
              <StatusBadge tone={signalStatusTone(signal.status)}>{titleCase(signal.status)}</StatusBadge>
              <StatusBadge tone="neutral">Simulated</StatusBadge>
            </div>
            <p className="mt-2 text-sm text-zinc-500">{signal.strategies?.name || "Strategy snapshot"} / {signal.timeframe || "15m"} / {formatDateTime(signal.created_at)}</p>
          </div>
          <SignalStatusActions signalId={signal.id} />
        </div>

        <GlassCard className="border-amber-300/20 bg-amber-300/10 p-4 text-sm text-amber-100">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>This is a simulated setup idea. Real execution is not connected.</span>
          </div>
        </GlassCard>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          <StatCard label="Confidence" value={`${formatNumber(signal.confidence, "0")}/100`} />
          <StatCard label="Market" value={signal.market_type || "N/A"} />
          <StatCard label="Setup Type" value={signal.setup_type || "N/A"} />
          <StatCard label="Entry Zone" value={signal.entry_zone || "N/A"} />
          <StatCard label="Stop Loss" value={formatNumber(signal.stop_loss)} />
          <StatCard label="Take Profit" value={formatNumber(signal.take_profit)} />
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <GlassCard className="p-4 md:p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Reasoning</h2>
              <Radio className="h-4 w-4 text-zinc-500" />
            </div>
            <p className="mt-4 text-sm leading-6 text-zinc-300">{signal.reasoning || "No reasoning available."}</p>
          </GlassCard>

          <GlassCard className="p-4 md:p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">News Risk</h2>
              <ShieldAlert className="h-4 w-4 text-zinc-500" />
            </div>
            <div className="mt-4">
              <StatusBadge tone={signalNewsTone(signal.news_risk)}>News {titleCase(signal.news_risk || "low")}</StatusBadge>
            </div>
            <p className="mt-4 text-sm leading-6 text-zinc-400">News risk is simulated scanner context only. A real economic/news feed is not connected to Signals yet.</p>
          </GlassCard>
        </div>

        <GlassCard className="p-4 md:p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Scanner Snapshot</h2>
            <Layers3 className="h-4 w-4 text-zinc-500" />
          </div>
          {snapshot ? (
            <div className="mt-4 grid gap-2 md:grid-cols-2">
              <SnapshotRow label="Bias" value={titleCase(snapshot.bias)} />
              <SnapshotRow label="Structure" value={titleCase(snapshot.structureState)} />
              <SnapshotRow label="BOS" value={snapshot.bosDetected ? "Detected" : "Not detected"} />
              <SnapshotRow label="CHoCH" value={snapshot.chochDetected ? "Detected" : "Not detected"} />
              <SnapshotRow label="Liquidity Sweep" value={snapshot.liquiditySweepDetected ? "Detected" : "Not detected"} />
              <SnapshotRow label="FVG" value={snapshot.fvgDetected ? "Detected" : "Not detected"} />
              <SnapshotRow label="Order Block" value={snapshot.orderBlockDetected ? "Detected" : "Not detected"} />
              <SnapshotRow label="Premium / Discount" value={titleCase(snapshot.premiumDiscountState)} />
            </div>
          ) : (
            <p className="mt-4 text-sm text-zinc-500">No scanner snapshot available.</p>
          )}
        </GlassCard>

        <GlassCard className="p-4 md:p-5">
          <h2 className="text-lg font-semibold">Future Execution</h2>
          <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-4 text-sm leading-6 text-zinc-400">
            Broker routing, exchange connections, order placement, and real-time signal validation are not connected. This page is for research and journaling only.
          </div>
        </GlassCard>
      </div>
    </AppShell>
  );
}
