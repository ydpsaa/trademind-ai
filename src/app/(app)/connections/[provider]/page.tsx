import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Bot, CalendarDays, Cable, Database, LineChart, Radio, ShieldCheck, ShieldOff, WalletCards } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { ConnectionStatusButton } from "@/components/connections/ConnectionStatusButton";
import { GlassCard } from "@/components/ui/GlassCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatAIModelLabel } from "@/lib/ai/display";
import { isAdminUser } from "@/lib/auth/admin";
import { connectionStatusTone, deriveRuntimeStatus, getProvider } from "@/lib/connections/connection-status";
import type { ConnectionMode, ConnectionStatus, IntegrationConnection, IntegrationProvider, ProviderCard, ProviderRuntimeStatus } from "@/lib/connections/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";

interface ConnectionDetailPageProps {
  params: Promise<{ provider: string }>;
}

const iconMap = {
  supabase: Database,
  "ai-provider": Bot,
  "market-data": LineChart,
  bybit: WalletCards,
  okx: WalletCards,
  metatrader: Radio,
  tradingview: LineChart,
  "economic-calendar": CalendarDays,
  "execution-layer": ShieldOff,
} satisfies Record<IntegrationProvider, typeof Cable>;

const internalProviders = new Set<IntegrationProvider>(["supabase", "ai-provider", "economic-calendar"]);

function formatDateTime(value: string | null) {
  if (!value) return "Not checked";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatStatus(status: ConnectionStatus) {
  return status.replaceAll("_", " ");
}

function formatMode(mode: ConnectionMode) {
  return mode.replaceAll("_", " ");
}

function patchMessage(message: string) {
  if (message.includes("integration_connections") || message.includes("schema cache") || message.includes("does not exist")) {
    return "Connection status storage is not ready yet. Apply the connection metadata setup, then refresh this page.";
  }
  return message;
}

async function getConnectionRecord(provider: IntegrationProvider) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { record: null, error: "Data service is not configured.", calendarReadable: false, sessionPresent: false, user: null };

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return { record: null, error: "You must be signed in to view connection details.", calendarReadable: false, sessionPresent: false, user: null };

  const [connectionResult, calendarResult] = await Promise.all([
    supabase.from("integration_connections").select("id,user_id,provider,status,mode,display_name,metadata,last_checked_at,created_at,updated_at").eq("user_id", userData.user.id).eq("provider", provider).maybeSingle(),
    supabase.from("economic_events").select("id", { count: "exact", head: true }),
  ]);

  return {
    record: connectionResult.error ? null : ((connectionResult.data ?? null) as IntegrationConnection | null),
    error: connectionResult.error ? patchMessage(connectionResult.error.message) : null,
    calendarReadable: !calendarResult.error,
    sessionPresent: true,
    user: userData.user as User,
  };
}

function resolvedStatus(provider: ProviderCard, record: IntegrationConnection | null, context: { calendarReadable: boolean; sessionPresent: boolean }): ProviderRuntimeStatus {
  const status = deriveRuntimeStatus(provider, record ? [record] : []);

  if (!status.lastCheckedAt) {
    if (provider.provider === "supabase") {
      return {
        ...status,
        status: context.sessionPresent && Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) ? "connected" : "error",
        mode: "configured" as const,
        metadata: {
          serviceEndpoint: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
          clientConfiguration: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
          authSession: context.sessionPresent,
        },
      };
    }

    if (provider.provider === "ai-provider") {
      const connected = Boolean(process.env.OPENAI_API_KEY);
      return {
        ...status,
        status: connected ? ("connected" as const) : ("fallback" as const),
        mode: connected ? ("configured" as const) : ("fallback" as const),
        metadata: {
          aiServiceConfigured: connected,
          aiMode: process.env.AI_PROVIDER ? "configured" : "fallback",
          model: process.env.OPENAI_MODEL || "local-rules",
        },
      };
    }

    if (provider.provider === "economic-calendar") {
      return {
        ...status,
        status: context.calendarReadable ? ("connected" as const) : ("error" as const),
        mode: "configured" as const,
        metadata: { readable: context.calendarReadable },
      };
    }
  }

  return status;
}

function formatMetadataLabel(key: string) {
  const labels: Record<string, string> = {
    serviceEndpoint: "Service Endpoint",
    clientConfiguration: "Client Configuration",
    authSession: "Auth Session",
    publicUrlPresent: "Service Endpoint",
    anonKeyPresent: "Client Configuration",
    sessionPresent: "Auth Session",
    aiServiceConfigured: "AI Service",
    aiKeyConfigured: "AI Service",
    aiMode: "AI Mode",
    provider: "AI Service",
    model: "Model",
    readable: "Readable",
  };

  return labels[key] ?? key.replace(/([a-z])([A-Z])/g, "$1 $2").replaceAll("_", " ");
}

function formatMetadataValue(key: string, value: unknown) {
  if (key === "model") return formatAIModelLabel(String(value ?? "")) ?? "-";
  if (key === "provider") return value ? "configured" : "-";
  if (typeof value === "boolean") return value ? "yes" : "no";
  return String(value ?? "-");
}

function DetailList({ title, items }: { title: string; items: string[] }) {
  return (
    <GlassCard className="p-4 md:p-5">
      <h2 className="text-base font-semibold">{title}</h2>
      <div className="mt-4 grid gap-2">
        {items.map((item) => (
          <div key={item} className="rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-sm leading-6 text-zinc-300">
            {item}
          </div>
        ))}
      </div>
    </GlassCard>
  );
}

function MetadataCard({ metadata }: { metadata: Record<string, unknown> }) {
  const entries = Object.entries(metadata);
  return (
    <GlassCard className="p-4 md:p-5">
      <h2 className="text-base font-semibold">Safe Status Data</h2>
      <div className="mt-4 grid gap-2">
        {entries.length ? (
          entries.map(([key, value]) => (
            <div key={key} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-sm">
              <span className="text-zinc-500">{formatMetadataLabel(key)}</span>
              <span className="max-w-[60%] truncate text-right text-zinc-200">{formatMetadataValue(key, value)}</span>
            </div>
          ))
        ) : (
          <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-sm text-zinc-500">Run a status check to store safe metadata.</div>
        )}
      </div>
    </GlassCard>
  );
}

export default async function ConnectionDetailPage({ params }: ConnectionDetailPageProps) {
  const { provider: providerSlug } = await params;
  const provider = getProvider(providerSlug);
  if (!provider) notFound();
  if (internalProviders.has(provider.provider)) {
    const supabase = await createSupabaseServerClient();
    if (!supabase) redirect("/login?next=/system-status");

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) redirect("/login?next=/system-status");
    if (isAdminUser(userData.user)) redirect("/system-status");

    return (
      <AppShell title="Connections" subtitle="Trading integrations and setup guidance." user={userData.user}>
        <GlassCard className="mx-auto max-w-2xl p-5 md:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-zinc-300" />
            <h2 className="text-xl font-semibold text-white">Admin access required</h2>
            <StatusBadge tone="neutral">Internal service</StatusBadge>
          </div>
          <p className="mt-3 text-sm leading-6 text-zinc-400">
            This is an internal platform service. System Status is available only for platform administrators.
          </p>
          <Link href="/dashboard" className="mt-5 inline-grid h-10 place-items-center rounded-xl border border-white/10 bg-white/[0.06] px-4 text-sm font-semibold text-zinc-200 transition hover:bg-white/10">
            Back to Dashboard
          </Link>
        </GlassCard>
      </AppShell>
    );
  }

  const context = await getConnectionRecord(provider.provider);
  const status = resolvedStatus(provider, context.record, context);
  const Icon = iconMap[provider.provider];

  return (
    <AppShell title={provider.name} subtitle="Connection details and safe setup guidance." user={context.user}>
      <div className="space-y-4">
        <GlassCard className="p-4 md:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <Link href="/connections" className="mb-4 inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-4 text-sm font-medium text-zinc-300 transition hover:bg-white/10">
                <ArrowLeft className="h-4 w-4" />
                Back to Connections
              </Link>
              <div className="flex flex-wrap items-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-2xl border border-white/10 bg-white/[0.06]">
                  <Icon className="h-5 w-5 text-zinc-300" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-2xl font-semibold">{provider.name}</h2>
                    <StatusBadge tone={connectionStatusTone(status.status)}>{formatStatus(status.status)}</StatusBadge>
                    <StatusBadge tone="neutral">{provider.category}</StatusBadge>
                  </div>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">{provider.description}</p>
                </div>
              </div>
            </div>
            {provider.actionLabel === "Test Status" ? <ConnectionStatusButton provider={provider.provider} /> : <StatusBadge tone="neutral">{provider.actionLabel}</StatusBadge>}
          </div>
        </GlassCard>

        {context.error ? <GlassCard className="border-amber-300/20 bg-amber-300/10 p-4 text-sm text-amber-100">{context.error}</GlassCard> : null}

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <GlassCard className="p-4">
            <div className="text-xs text-zinc-500">Purpose</div>
            <div className="mt-2 text-lg font-semibold text-white">{provider.purpose}</div>
          </GlassCard>
          <GlassCard className="p-4">
            <div className="text-xs text-zinc-500">Mode</div>
            <div className="mt-2 text-lg font-semibold capitalize text-white">{formatMode(status.mode)}</div>
          </GlassCard>
          <GlassCard className="p-4">
            <div className="text-xs text-zinc-500">Last Checked</div>
            <div className="mt-2 text-lg font-semibold text-white">{formatDateTime(status.lastCheckedAt)}</div>
          </GlassCard>
          <GlassCard className="p-4">
            <div className="text-xs text-zinc-500">Execution</div>
            <div className="mt-2 text-lg font-semibold text-white">Disabled</div>
          </GlassCard>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <DetailList title="Setup Requirements" items={provider.setupRequirements} />
          <DetailList title="Safety Notes" items={provider.safetyNotes} />
          <DetailList title="Future Roadmap" items={provider.roadmap} />
          <MetadataCard metadata={status.metadata} />
        </div>

        <GlassCard className="border-white/10 bg-white/[0.04] p-4">
          <div className="flex gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-black/25">
              <ShieldCheck className="h-4 w-4 text-zinc-300" />
            </div>
            <p className="text-sm leading-6 text-zinc-400">
              This connection page only checks safe configuration presence and service readiness. It does not call broker trading endpoints, place orders, reveal API keys, or request withdrawal permissions.
            </p>
          </div>
        </GlassCard>
      </div>
    </AppShell>
  );
}
