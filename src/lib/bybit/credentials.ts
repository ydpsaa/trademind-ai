import "server-only";
import type { BybitCredentials } from "@/lib/bybit/types";
import { decryptCredentialPayload, encryptCredentialPayload } from "@/lib/integrations/credentials";

export function encryptIntegrationCredentials(credentials: BybitCredentials, userId: string, provider = "bybit") {
  return encryptCredentialPayload(credentials, userId, provider);
}

export function decryptIntegrationCredentials(payload: string, userId: string, provider = "bybit"): BybitCredentials {
  const credentials = decryptCredentialPayload<BybitCredentials>(payload, userId, provider);

  if (!credentials.apiKey || !credentials.apiSecret) throw new Error("Stored credentials are incomplete.");
  return credentials;
}
