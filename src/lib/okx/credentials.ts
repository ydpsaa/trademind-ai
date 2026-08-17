import "server-only";

import { decryptCredentialPayload, encryptCredentialPayload } from "@/lib/integrations/credentials";
import type { OkxCredentials } from "@/lib/okx/types";

const PROVIDER = "okx";

export function encryptOkxCredentials(credentials: OkxCredentials, userId: string) {
  return encryptCredentialPayload(credentials, userId, PROVIDER);
}

export function decryptOkxCredentials(payload: string, userId: string): OkxCredentials {
  const credentials = decryptCredentialPayload<OkxCredentials>(payload, userId, PROVIDER);
  if (!credentials.apiKey || !credentials.apiSecret || !credentials.passphrase) {
    throw new Error("Stored credentials are incomplete.");
  }
  return credentials;
}
