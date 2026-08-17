import "server-only";

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

interface EncryptedEnvelope {
  version: 1;
  iv: string;
  tag: string;
  ciphertext: string;
}

function getEncryptionKey() {
  const secret = process.env.INTEGRATION_CREDENTIALS_ENCRYPTION_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error("Secure credential storage is not configured.");
  return createHash("sha256").update(secret).digest();
}

function getAdditionalData(userId: string, provider: string) {
  return Buffer.from(`${userId}:${provider}`, "utf8");
}

export function encryptCredentialPayload(credentials: object, userId: string, provider: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  cipher.setAAD(getAdditionalData(userId, provider));
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(credentials), "utf8"), cipher.final()]);

  const envelope: EncryptedEnvelope = {
    version: 1,
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    ciphertext: ciphertext.toString("base64"),
  };

  return Buffer.from(JSON.stringify(envelope), "utf8").toString("base64");
}

export function decryptCredentialPayload<T>(payload: string, userId: string, provider: string): T {
  const envelope = JSON.parse(Buffer.from(payload, "base64").toString("utf8")) as EncryptedEnvelope;
  if (envelope.version !== 1) throw new Error("Unsupported credential format.");

  const decipher = createDecipheriv("aes-256-gcm", getEncryptionKey(), Buffer.from(envelope.iv, "base64"));
  decipher.setAAD(getAdditionalData(userId, provider));
  decipher.setAuthTag(Buffer.from(envelope.tag, "base64"));
  const plaintext = Buffer.concat([decipher.update(Buffer.from(envelope.ciphertext, "base64")), decipher.final()]);
  return JSON.parse(plaintext.toString("utf8")) as T;
}
