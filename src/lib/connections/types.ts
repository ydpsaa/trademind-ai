export type IntegrationProvider =
  | "supabase"
  | "ai-provider"
  | "market-data"
  | "bybit"
  | "okx"
  | "metatrader"
  | "tradingview"
  | "economic-calendar"
  | "execution-layer";

export type ConnectionStatus = "connected" | "fallback" | "simulated" | "not_connected" | "coming_soon" | "error";

export type ConnectionMode = "safe_setup" | "read_only_future" | "simulated" | "fallback" | "coming_soon" | "configured";

export interface IntegrationConnection {
  id: string;
  user_id: string;
  provider: IntegrationProvider;
  status: ConnectionStatus;
  mode: ConnectionMode | null;
  display_name: string | null;
  metadata: Record<string, unknown> | null;
  last_checked_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProviderCard {
  provider: IntegrationProvider;
  name: string;
  category: string;
  description: string;
  purpose: string;
  powers: string[];
  mode: ConnectionMode;
  defaultStatus: ConnectionStatus;
  actionLabel: string;
  setupRequirements: string[];
  safetyNotes: string[];
  roadmap: string[];
}

export interface ProviderRuntimeStatus {
  status: ConnectionStatus;
  mode: ConnectionMode;
  label: string;
  lastCheckedAt: string | null;
  metadata: Record<string, unknown>;
}

export interface ConnectionActionState {
  success?: boolean;
  error?: string;
  status?: ConnectionStatus;
  checkedAt?: string;
}
