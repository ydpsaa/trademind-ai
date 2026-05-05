import type { ConnectionStatus, IntegrationConnection, IntegrationProvider, ProviderCard, ProviderRuntimeStatus } from "@/lib/connections/types";

export const systemServiceProviders: ProviderCard[] = [
  {
    provider: "supabase",
    name: "Database Service",
    category: "Internal Backend",
    description: "Authentication, Postgres database, RLS, and future storage.",
    purpose: "Auth, database, storage",
    powers: ["Authentication", "Manual journal", "AI reviews", "Strategies", "Backtests", "Signals"],
    mode: "configured",
    defaultStatus: "not_connected",
    actionLabel: "Test Status",
    setupRequirements: ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "Active authenticated session"],
    safetyNotes: ["Service role keys must stay server-side only.", "RLS remains enabled for user-owned data."],
    roadmap: ["Storage for screenshots", "Realtime workspace events", "Production backup policy"],
  },
  {
    provider: "ai-provider",
    name: "AI Service",
    category: "Internal AI",
    description: "Platform-managed AI Review generation with local rules fallback.",
    purpose: "AI Trade Review",
    powers: ["Trade review summaries", "Execution recommendations", "Future strategy coaching"],
    mode: "fallback",
    defaultStatus: "fallback",
    actionLabel: "Test Status",
    setupRequirements: ["OPENAI_API_KEY for real AI reviews", "OPENAI_MODEL optional model override"],
    safetyNotes: ["AI keys are never exposed to client components.", "Fallback local rules remain available when no key is configured."],
    roadmap: ["xAI/Grok provider option", "Cost controls", "Per-review generation logs"],
  },
  {
    provider: "economic-calendar",
    name: "Calendar Data",
    category: "Internal Data",
    description: "Supabase-backed macro event table used for news risk context.",
    purpose: "News risk",
    powers: ["Calendar page", "Trade news context", "AI review news score"],
    mode: "configured",
    defaultStatus: "not_connected",
    actionLabel: "Test Status",
    setupRequirements: ["economic_events table", "Authenticated read policy", "Manual/sample events for now"],
    safetyNotes: ["No external news API is connected yet.", "Sample events are not live market news."],
    roadmap: ["External calendar feed", "Currency relevance mapping", "Automated event refresh"],
  },
];

export const userConnectionProviders: ProviderCard[] = [
  {
    provider: "bybit",
    name: "Bybit",
    category: "Exchange Accounts",
    description: "Future exchange account connection for read-only import and account analytics.",
    purpose: "Trade import and account analytics",
    powers: ["Trade history import", "Account analytics", "Portfolio reconciliation"],
    mode: "read_only_future",
    defaultStatus: "not_connected",
    actionLabel: "View Details",
    setupRequirements: ["Read-only API key", "No withdrawal permission", "Import-only workflow first"],
    safetyNotes: ["Trading execution is disabled.", "Never use API keys with withdrawal permissions."],
    roadmap: ["Read-only import", "Account analytics", "Execution controls only after explicit future stage"],
  },
  {
    provider: "okx",
    name: "OKX",
    category: "Exchange Accounts",
    description: "Future exchange account connection for read-only import and account analytics.",
    purpose: "Trade import and account analytics",
    powers: ["Trade history import", "Account analytics", "Portfolio reconciliation"],
    mode: "read_only_future",
    defaultStatus: "not_connected",
    actionLabel: "View Details",
    setupRequirements: ["Read-only API key", "No withdrawal permission", "Import-only workflow first"],
    safetyNotes: ["Trading execution is disabled.", "Never use API keys with withdrawal permissions."],
    roadmap: ["Read-only import", "Account analytics", "Execution controls only after explicit future stage"],
  },
  {
    provider: "metatrader",
    name: "MetaTrader",
    category: "Broker Accounts",
    description: "Future bridge for Forex and prop account imports.",
    purpose: "MT account import and prop analytics",
    powers: ["MT account import", "Prop account analytics", "Journal sync"],
    mode: "coming_soon",
    defaultStatus: "coming_soon",
    actionLabel: "Coming Soon",
    setupRequirements: ["Bridge application", "Read-only import mode", "Broker compatibility review"],
    safetyNotes: ["No MetaTrader bridge is connected yet.", "Execution is not implemented."],
    roadmap: ["Import bridge", "Trade screenshot sync", "Broker-specific adapters"],
  },
  {
    provider: "tradingview",
    name: "TradingView Charts",
    category: "Charts & Market Data",
    description: "Future charting and visual trade marker integration.",
    purpose: "Charts and visual trade markers",
    powers: ["Chart visualization", "Backtest markers", "Trade markers", "Scanner visualization"],
    mode: "coming_soon",
    defaultStatus: "coming_soon",
    actionLabel: "Coming Soon",
    setupRequirements: ["Chart embedding decision", "Symbol mapping", "Marker rendering model"],
    safetyNotes: ["Charts are placeholders today.", "No TradingView data is fetched yet."],
    roadmap: ["Live chart panels", "Journal markers", "Strategy overlays"],
  },
  {
    provider: "market-data",
    name: "Market Data Feed",
    category: "Charts & Market Data",
    description: "Future feed for candles, quotes, and historical market data. Not connected today.",
    purpose: "Backtest candles, scanner inputs, and signal validation",
    powers: ["Backtest candles", "Scanner inputs", "Signal validation"],
    mode: "safe_setup",
    defaultStatus: "not_connected",
    actionLabel: "View Details",
    setupRequirements: ["Provider selection", "Server-side API key storage", "Rate-limit strategy"],
    safetyNotes: ["No external market data calls are made yet.", "Scanner, signals, and real backtests wait for this feed."],
    roadmap: ["Massive/Polygon style provider", "Historical candles", "Streaming quotes"],
  },
  {
    provider: "execution-layer",
    name: "Execution Layer",
    category: "Future Automation",
    description: "Future assisted execution layer. Disabled until explicit later stages.",
    purpose: "Confirm-to-execute, paper trading, kill switch, and risk limits",
    powers: ["Confirm-to-execute", "Paper trading", "Kill switch", "Risk limits"],
    mode: "coming_soon",
    defaultStatus: "coming_soon",
    actionLabel: "Coming Later",
    setupRequirements: ["Dedicated execution stage", "Broker risk controls", "User confirmation flow", "Paper trading validation"],
    safetyNotes: ["Trading execution is disabled.", "No broker or exchange order endpoints are connected.", "Risk controls must ship before any execution feature."],
    roadmap: ["Paper trading", "Confirm-to-execute", "Daily risk kill switch"],
  },
];

export const integrationProviders: ProviderCard[] = [...systemServiceProviders, ...userConnectionProviders];

export const providerMap = new Map(integrationProviders.map((provider) => [provider.provider, provider]));

export function getProvider(provider: string | undefined) {
  if (!provider) return null;
  return providerMap.get(provider as IntegrationProvider) ?? null;
}

export function connectionStatusTone(status: ConnectionStatus): "positive" | "negative" | "warning" | "neutral" {
  if (status === "connected") return "positive";
  if (status === "fallback" || status === "simulated") return "warning";
  if (status === "error") return "negative";
  return "neutral";
}

export function formatConnectionStatus(status: ConnectionStatus) {
  return status.replaceAll("_", " ");
}

export function getConnectionRecord(records: IntegrationConnection[], provider: IntegrationProvider) {
  return records.find((record) => record.provider === provider) ?? null;
}

export function deriveRuntimeStatus(provider: ProviderCard, records: IntegrationConnection[]): ProviderRuntimeStatus {
  const record = getConnectionRecord(records, provider.provider);
  const status = record?.status ?? provider.defaultStatus;
  const mode = record?.mode ?? provider.mode;

  return {
    status,
    mode,
    label: formatConnectionStatus(status),
    lastCheckedAt: record?.last_checked_at ?? null,
    metadata: record?.metadata ?? {},
  };
}

export function summarizeConnections(statuses: ProviderRuntimeStatus[]) {
  return {
    connected: statuses.filter((item) => item.status === "connected").length,
    fallback: statuses.filter((item) => item.status === "fallback" || item.status === "simulated").length,
    comingSoon: statuses.filter((item) => item.status === "coming_soon").length,
    notConnected: statuses.filter((item) => item.status === "not_connected" || item.status === "error").length,
  };
}
