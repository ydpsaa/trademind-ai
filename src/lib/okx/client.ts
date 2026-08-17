import "server-only";

import { createHmac } from "node:crypto";
import type { OkxAccountConfig, OkxApiResponse, OkxCredentials, OkxEnvironment, OkxPositionHistoryRow } from "@/lib/okx/types";

const BASE_URL = "https://www.okx.com";
const REQUEST_TIMEOUT_MS = 10_000;

function safeProviderMessage(message: string) {
  return message.replace(/[\r\n]/g, " ").slice(0, 180) || "The provider rejected the request.";
}

export class OkxRequestError extends Error {
  constructor(message: string, public readonly code?: string) {
    super(message);
    this.name = "OkxRequestError";
  }
}

export class OkxReadOnlyClient {
  constructor(
    private readonly credentials: OkxCredentials,
    private readonly environment: OkxEnvironment,
  ) {}

  private async signedGet<T>(path: string, params: Record<string, string | number | undefined> = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== "") query.set(key, String(value));
    });

    const queryString = query.toString();
    const requestPath = `${path}${queryString ? `?${queryString}` : ""}`;
    const timestamp = new Date().toISOString();
    const signature = createHmac("sha256", this.credentials.apiSecret)
      .update(`${timestamp}GET${requestPath}`)
      .digest("base64");
    const headers: Record<string, string> = {
      "OK-ACCESS-KEY": this.credentials.apiKey,
      "OK-ACCESS-SIGN": signature,
      "OK-ACCESS-TIMESTAMP": timestamp,
      "OK-ACCESS-PASSPHRASE": this.credentials.passphrase,
      "Content-Type": "application/json",
    };
    if (this.environment === "demo") headers["x-simulated-trading"] = "1";

    const response = await fetch(`${BASE_URL}${requestPath}`, {
      method: "GET",
      headers,
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) throw new OkxRequestError(`Provider request failed with HTTP ${response.status}.`);
    const payload = (await response.json()) as OkxApiResponse<T>;
    if (payload.code !== "0") throw new OkxRequestError(safeProviderMessage(payload.msg), payload.code);
    return payload.data;
  }

  async getAccountConfig() {
    const rows = await this.signedGet<OkxAccountConfig>("/api/v5/account/config");
    if (!rows[0]) throw new OkxRequestError("The provider did not return account configuration.");
    return rows[0];
  }

  getPositionsHistory(input: { after?: string; limit?: number } = {}) {
    return this.signedGet<OkxPositionHistoryRow>("/api/v5/account/positions-history", {
      after: input.after,
      limit: input.limit ?? 100,
    });
  }
}

export function assertOkxReadOnlyApiKey(config: OkxAccountConfig) {
  const permissions = (config.perm ?? "")
    .toLowerCase()
    .split(/[\s,]+/)
    .filter(Boolean);

  if (permissions.includes("trade") || permissions.includes("withdraw")) {
    throw new OkxRequestError("Use an API key with Read permission only. Trade and withdrawal permissions are rejected.");
  }
  if (!permissions.includes("read_only")) {
    throw new OkxRequestError("The API key must have read-only account permission.");
  }
}
