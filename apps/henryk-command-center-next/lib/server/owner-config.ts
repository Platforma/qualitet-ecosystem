import {
  createCipheriv,
  createDecipheriv,
  hkdfSync,
  randomBytes,
} from "node:crypto";
import type { Document } from "mongodb";
import { getCollection } from "./database";

type IntegrationConfigDocument = Document & {
  provider: string;
  values?: Record<string, string>;
  encryptedSecrets?: Record<string, string>;
  checkedAt?: Date;
  checkStatus?: "connected" | "unavailable";
  checkMessage?: string;
  updatedAt?: Date;
};

function encryptionKey() {
  const secret = process.env.SESSION_SECRET?.trim();
  if (!secret || Buffer.byteLength(secret) < 32) {
    throw new Error("Konfiguracja sejfu wymaga SESSION_SECRET o długości co najmniej 32 bajtów.");
  }
  return Buffer.from(
    hkdfSync(
      "sha256",
      secret,
      Buffer.from("qualitet-owner-integration-configs"),
      Buffer.from("v1"),
      32,
    ),
  );
}

export function encryptOwnerSecret(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return [
    "v1",
    iv.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
    encrypted.toString("base64url"),
  ].join(".");
}

export function decryptOwnerSecret(value: string) {
  const [version, ivValue, tagValue, encryptedValue, extra] = value.split(".");
  if (
    version !== "v1" ||
    !ivValue ||
    !tagValue ||
    !encryptedValue ||
    extra !== undefined
  ) {
    throw new Error("Zapisane poświadczenie ma nieprawidłowy format.");
  }
  const decipher = createDecipheriv(
    "aes-256-gcm",
    encryptionKey(),
    Buffer.from(ivValue, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

export async function getOwnerIntegrationConfig(provider: string) {
  const collection =
    await getCollection<IntegrationConfigDocument>("integration_configs");
  return collection.findOne({ provider });
}

export async function getOwnerIntegrationValues(provider: string) {
  const config = await getOwnerIntegrationConfig(provider);
  if (!config) return null;

  const values = { ...(config.values ?? {}) };
  for (const [key, encrypted] of Object.entries(config.encryptedSecrets ?? {})) {
    values[key] = decryptOwnerSecret(encrypted);
  }
  return values;
}

export async function getOwnerIntegrationSummaries() {
  const collection =
    await getCollection<IntegrationConfigDocument>("integration_configs");
  const configs = await collection.find({}).toArray();
  return new Map(
    configs.map((config) => [
      config.provider,
      {
        configuredFields: [...Object.keys(config.values ?? {}), ...Object.keys(config.encryptedSecrets ?? {})],
        values: config.values ?? {},
        checkedAt: config.checkedAt?.toISOString() ?? null,
        checkStatus: config.checkStatus ?? null,
        checkMessage: config.checkMessage ?? null,
      },
    ]),
  );
}
