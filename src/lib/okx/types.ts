export type OkxEnvironment = "live" | "demo";
export type OkxInstrumentType = "MARGIN" | "SWAP" | "FUTURES" | "OPTION" | "EVENTS";

export interface OkxCredentials {
  apiKey: string;
  apiSecret: string;
  passphrase: string;
}

export interface OkxApiResponse<T> {
  code: string;
  msg: string;
  data: T[];
}

export interface OkxAccountConfig {
  uid?: string;
  mainUid?: string;
  acctLv?: string;
  posMode?: string;
  perm?: string;
  label?: string;
  type?: string;
}

export interface OkxPositionHistoryRow {
  cTime: string;
  closeAvgPx: string;
  closeTotalPos: string;
  direction?: "long" | "short" | string;
  fee?: string;
  fundingFee?: string;
  instId: string;
  instType: OkxInstrumentType;
  lever?: string;
  openAvgPx: string;
  pnl?: string;
  posId: string;
  posSide?: "long" | "short" | "net" | string;
  realizedPnl?: string;
  type?: string;
  uTime: string;
}

export interface OkxConnectionActionState {
  success?: boolean;
  error?: string;
  message?: string;
  importedCount?: number;
  skippedCount?: number;
}

export interface OkxConnectionSummary {
  accountId: string;
  accountName: string;
  environment: OkxEnvironment;
  externalAccountId: string | null;
  apiKeyHint: string | null;
  lastSyncedAt: string | null;
  importedTrades: number;
  status: string;
}

export interface OkxSyncSummary {
  fetchedCount: number;
  importedCount: number;
  skippedCount: number;
  rangeStart: string;
  rangeEnd: string;
}
