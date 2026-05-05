export type AccountProvider = "all" | "manual" | "csv" | "bybit" | "okx" | "metatrader";

export type AccountStatus = "active" | "not_connected" | "coming_soon" | "disabled" | "archived";

export interface TradingAccount {
  id: string;
  user_id: string;
  provider: Exclude<AccountProvider, "all"> | string | null;
  account_name: string | null;
  account_type: string | null;
  currency?: string | null;
  status: AccountStatus | string | null;
  metadata?: Record<string, unknown> | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface AccountSelectorOption {
  value: string;
  label: string;
  provider: AccountProvider | string;
  status: AccountStatus | string;
  description: string;
  isVirtual?: boolean;
}
