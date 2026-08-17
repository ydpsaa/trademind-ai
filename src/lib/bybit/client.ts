import "server-only";
import { createHmac } from "node:crypto";
import type { BybitApiKeyInfo, BybitApiResponse, BybitClosedPnlPage, BybitCategory, BybitCredentials, BybitEnvironment } from "@/lib/bybit/types";

const RECV_WINDOW = "5000";
const REQUEST_TIMEOUT_MS = 10_000;

function safeProviderMessage(message: string) {
  return message.replace(/[\r\n]/g, " ").slice(0, 180) || "The provider rejected the request.";
}

export class BybitRequestError extends Error {
  constructor(message: string, public readonly code?: number) {
    super(message);
    this.name = "BybitRequestError";
  }
}

export class BybitReadOnlyClient {
  private readonly baseUrl: string;

  constructor(
    private readonly credentials: BybitCredentials,
    environment: BybitEnvironment,
  ) {
    this.baseUrl = environment === "testnet" ? "https://api-testnet.bybit.com" : "https://api.bybit.com";
  }

  private async signedGet<T>(path: string, params: Record<string, string | number | undefined> = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== "") query.set(key, String(value));
    });

    const queryString = query.toString();
    const timestamp = Date.now().toString();
    const signaturePayload = `${timestamp}${this.credentials.apiKey}${RECV_WINDOW}${queryString}`;
    const signature = createHmac("sha256", this.credentials.apiSecret).update(signaturePayload).digest("hex");
    const response = await fetch(`${this.baseUrl}${path}${queryString ? `?${queryString}` : ""}`, {
      method: "GET",
      headers: {
        "X-BAPI-API-KEY": this.credentials.apiKey,
        "X-BAPI-SIGN": signature,
        "X-BAPI-TIMESTAMP": timestamp,
        "X-BAPI-RECV-WINDOW": RECV_WINDOW,
        "Content-Type": "application/json",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) throw new BybitRequestError(`Provider request failed with HTTP ${response.status}.`);
    const payload = (await response.json()) as BybitApiResponse<T>;
    if (payload.retCode !== 0) throw new BybitRequestError(safeProviderMessage(payload.retMsg), payload.retCode);
    return payload.result;
  }

  getApiKeyInfo() {
    return this.signedGet<BybitApiKeyInfo>("/v5/user/query-api");
  }

  getClosedPnl(input: { category: BybitCategory; startTime: number; endTime: number; cursor?: string }) {
    return this.signedGet<BybitClosedPnlPage>("/v5/position/closed-pnl", {
      category: input.category,
      startTime: input.startTime,
      endTime: input.endTime,
      limit: 100,
      cursor: input.cursor,
    });
  }
}

export function assertReadOnlyApiKey(info: BybitApiKeyInfo) {
  const walletPermissions = info.permissions?.Wallet ?? [];
  if (info.readOnly !== 1) throw new BybitRequestError("Use a read-only API key. Read/write keys are rejected.");
  if (walletPermissions.some((permission) => permission.toLowerCase().includes("withdraw"))) {
    throw new BybitRequestError("API keys with withdrawal permission are rejected.");
  }
}
