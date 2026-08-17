export type BybitEnvironment = "mainnet" | "testnet";
export type BybitCategory = "linear" | "inverse";

export interface BybitCredentials {
  apiKey: string;
  apiSecret: string;
}

export interface BybitApiResponse<T> {
  retCode: number;
  retMsg: string;
  result: T;
  time: number;
}

export interface BybitApiKeyInfo {
  readOnly: number;
  permissions?: Record<string, string[]>;
  userID: number | string;
  uta?: number;
  unifiedMarginStatus?: number;
  note?: string;
}

export interface BybitClosedPnlRow {
  symbol: string;
  orderId: string;
  side: "Buy" | "Sell";
  qty: string;
  closedSize: string;
  avgEntryPrice: string;
  avgExitPrice: string;
  closedPnl: string;
  openFee?: string;
  closeFee?: string;
  leverage?: string;
  createdTime: string;
  updatedTime: string;
}

export interface BybitClosedPnlPage {
  category: BybitCategory;
  list: BybitClosedPnlRow[];
  nextPageCursor?: string;
}

export interface BybitConnectionActionState {
  success?: boolean;
  error?: string;
  message?: string;
  importedCount?: number;
  skippedCount?: number;
}

export interface BybitConnectionSummary {
  accountId: string;
  accountName: string;
  environment: BybitEnvironment;
  externalAccountId: string | null;
  apiKeyHint: string | null;
  lastSyncedAt: string | null;
  importedTrades: number;
  status: string;
}

export interface BybitSyncSummary {
  fetchedCount: number;
  importedCount: number;
  skippedCount: number;
  rangeStart: string;
  rangeEnd: string;
}
