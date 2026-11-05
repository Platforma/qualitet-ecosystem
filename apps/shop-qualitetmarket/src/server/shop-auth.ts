import {
  createHash,
  createHmac,
  randomBytes,
  randomUUID,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";
import { ObjectId, type Collection, type Document } from "mongodb";
import type { IncomingMessage } from "node:http";
import { getShopDatabase } from "./mongodb";

export const shopCookieName = "shop_session";
const sessionLifetimeMs = 12 * 60 * 60 * 1000;
const loginWindowMs = 15 * 60 * 1000;
const failedLoginLimit = 5;
const passwordHashOptions = {
  N: 16_384,
  r: 8,
  p: 1,
  maxmem: 128 * 1024 * 1024,
};

interface SessionClaims {
  sub: string;
  sid: string;
  exp: number;
}

interface ShopSession extends Document {
  sessionId: string;
  userId: string;
  createdAt: Date;
  expiresAt: Date;
  revokedAt?: Date;
}

interface LoginAttempt extends Document {
  key: string;
  count: number;
  expiresAt: Date;
}

interface ShopAccount extends Document {
  ownerUserId: string;
  companyName: string;
  email: string;
  passwordHash: string;
  status: "pending_verification" | "active";
  createdAt: Date;
  updatedAt: Date;
}

interface ShopEmailVerification extends Document {
  ownerUserId: string;
  email: string;
  tokenHash: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface ShopOwner {
  id: string;
}

function getSessionSecret() {
  const secret = process.env.SHOP_SESSION_SECRET?.trim();
  if (!secret || Buffer.byteLength(secret) < 32) {
    throw new Error("SHOP_SESSION_SECRET must contain at least 32 bytes.");
  }
  return secret;
}

function ownerIdForEmail(email: string) {
  return `shop:${createHash("sha256").update(email).digest("hex")}`;
}

function signPayload(payload: string) {
  return createHmac("sha256", getSessionSecret())
    .update(payload)
    .digest("base64url");
}

function encodeSession(ownerId: string, sessionId: string, expiresAt: Date) {
  const payload = Buffer.from(
    JSON.stringify({
      sub: ownerId,
      sid: sessionId,
      exp: Math.floor(expiresAt.getTime() / 1000),
    } satisfies SessionClaims),
  ).toString("base64url");
  return `${payload}.${signPayload(payload)}`;
}

function decodeSession(token: string): SessionClaims | null {
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra !== undefined) {
    return null;
  }

  let actualSignature: Buffer;
  try {
    actualSignature = Buffer.from(signature, "base64url");
  } catch {
    return null;
  }
  const expectedSignature = Buffer.from(signPayload(payload), "base64url");
  if (
    actualSignature.length !== expectedSignature.length ||
    !timingSafeEqual(actualSignature, expectedSignature)
  ) {
    return null;
  }

  try {
    const claims: unknown = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    );
    if (
      typeof claims !== "object" ||
      claims === null ||
      !("sub" in claims) ||
      typeof claims.sub !== "string" ||
      !claims.sub.startsWith("shop:") ||
      !("sid" in claims) ||
      typeof claims.sid !== "string" ||
      !("exp" in claims) ||
      typeof claims.exp !== "number" ||
      claims.exp <= Math.floor(Date.now() / 1000)
    ) {
      return null;
    }

    return { sub: claims.sub, sid: claims.sid, exp: claims.exp };
  } catch {
    return null;
  }
}

function readCookie(request: IncomingMessage, name: string) {
  const cookieHeader = request.headers.cookie;
  if (!cookieHeader) {
    return undefined;
  }

  const cookie = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));
  if (!cookie) {
    return undefined;
  }

  try {
    return decodeURIComponent(cookie.slice(name.length + 1));
  } catch {
    return undefined;
  }
}

async function getSessionsCollection(): Promise<Collection<ShopSession>> {
  const collection =
    (await getShopDatabase()).collection<ShopSession>("shop_sessions");
  await Promise.all([
    collection.createIndex({ sessionId: 1 }, { unique: true }),
    collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    collection.createIndex({ userId: 1, revokedAt: 1 }),
  ]);
  return collection;
}

async function getLoginAttemptsCollection(): Promise<
  Collection<LoginAttempt>
> {
  const collection =
    (await getShopDatabase()).collection<LoginAttempt>("shop_login_attempts");
  await Promise.all([
    collection.createIndex({ key: 1 }, { unique: true }),
    collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
  ]);
  return collection;
}

async function getShopAccountsCollection(): Promise<Collection<ShopAccount>> {
  const collection =
    (await getShopDatabase()).collection<ShopAccount>("shop_accounts");
  await collection.createIndex({ email: 1 }, { unique: true });
  return collection;
}

async function getShopEmailVerificationsCollection(): Promise<
  Collection<ShopEmailVerification>
> {
  const collection = (await getShopDatabase()).collection<ShopEmailVerification>(
    "shop_email_verifications",
  );
  await Promise.all([
    collection.createIndex({ tokenHash: 1 }, { unique: true }),
    collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
  ]);
  return collection;
}

function hashShopPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  return new Promise((resolve, reject) => {
    scryptCallback(
      password,
      salt,
      64,
      passwordHashOptions,
      (error, derivedKey) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(`scrypt$${salt.toString("hex")}$${derivedKey.toString("hex")}`);
      },
    );
  });
}

async function verifyEncodedPassword(password: string, encodedHash: string) {
  const [algorithm, saltHex, hashHex, extra] = encodedHash.split("$");
  if (
    algorithm !== "scrypt" ||
    !saltHex ||
    !hashHex ||
    extra !== undefined ||
    !/^[0-9a-f]{32}$/i.test(saltHex) ||
    !/^[0-9a-f]{128}$/i.test(hashHex)
  ) {
    throw new Error("Stored Shop password hash is invalid.");
  }
  const actualHash = await new Promise<Buffer>((resolve, reject) => {
    scryptCallback(
      password,
      Buffer.from(saltHex, "hex"),
      64,
      passwordHashOptions,
      (error, derivedKey) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(derivedKey);
      },
    );
  });
  return timingSafeEqual(actualHash, Buffer.from(hashHex, "hex"));
}

export async function registerShopAccount(
  companyName: string,
  email: string,
  password: string,
) {
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedCompanyName = companyName.trim();
  if (
    normalizedCompanyName.length < 2 ||
    normalizedCompanyName.length > 200 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) ||
    password.length < 12 ||
    password.length > 256
  ) {
    throw new TypeError("Podaj prawidłową firmę, e-mail i hasło (min. 12 znaków).");
  }
  const legacyEmail = process.env.SHOP_OWNER_EMAIL?.trim().toLowerCase();
  if (legacyEmail && normalizedEmail === legacyEmail) {
    throw new Error("Ten adres jest już zarezerwowany dla konta właściciela.");
  }

  const ownerUserId = ownerIdForEmail(normalizedEmail);
  const now = new Date();
  const accounts = await getShopAccountsCollection();
  try {
    await accounts.insertOne({
      ownerUserId,
      companyName: normalizedCompanyName,
      email: normalizedEmail,
      passwordHash: await hashShopPassword(password),
      status: "pending_verification",
      createdAt: now,
      updatedAt: now,
    });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === 11000
    ) {
      throw new Error("Konto dla tego adresu e-mail już istnieje.");
    }
    throw error;
  }

  return { ownerUserId, email: normalizedEmail };
}

export async function createShopEmailVerification(
  email: string,
): Promise<string> {
  const normalizedEmail = email.trim().toLowerCase();
  const account = await (await getShopAccountsCollection()).findOne({
    email: normalizedEmail,
    status: "pending_verification",
  });
  if (!account) {
    throw new Error("Nie znaleziono konta oczekującego na weryfikację.");
  }

  const token = randomBytes(32).toString("base64url");
  const verifications = await getShopEmailVerificationsCollection();
  await verifications.deleteMany({ ownerUserId: account.ownerUserId });
  await verifications.insertOne({
    ownerUserId: account.ownerUserId,
    email: normalizedEmail,
    tokenHash: createHash("sha256").update(token).digest("hex"),
    expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    createdAt: new Date(),
  });
  return token;
}

export async function verifyShopAccountEmail(token: string): Promise<boolean> {
  if (token.length < 32 || token.length > 128) {
    return false;
  }
  const verifications = await getShopEmailVerificationsCollection();
  const verification = await verifications.findOne({
    tokenHash: createHash("sha256").update(token).digest("hex"),
    expiresAt: { $gt: new Date() },
  });
  if (!verification) {
    return false;
  }

  const result = await (await getShopAccountsCollection()).updateOne(
    {
      ownerUserId: verification.ownerUserId,
      email: verification.email,
      status: "pending_verification",
    },
    { $set: { status: "active", updatedAt: new Date() } },
  );
  await verifications.deleteMany({ ownerUserId: verification.ownerUserId });
  return result.modifiedCount === 1;
}

export async function getShopOwner(
  request: IncomingMessage,
): Promise<ShopOwner | null> {
  const token = readCookie(request, shopCookieName);
  if (!token) {
    return null;
  }

  const claims = decodeSession(token);
  if (!claims) {
    return null;
  }

  const session = await (await getSessionsCollection()).findOne({
    sessionId: claims.sid,
    userId: claims.sub,
    revokedAt: { $exists: false },
    expiresAt: { $gt: new Date() },
  });
  return session ? { id: claims.sub } : null;
}

export async function verifyShopOwnerPassword(
  email: string,
  password: string,
) {
  const normalizedEmail = email.trim().toLowerCase();
  const accounts = await getShopAccountsCollection();
  const account = await accounts.findOne({
    email: normalizedEmail,
    status: "active",
  });
  if (account) {
    if (await verifyEncodedPassword(password, account.passwordHash)) {
      return account.ownerUserId;
    }
    return null;
  }
  if (
    await accounts.findOne({
      email: normalizedEmail,
      status: "pending_verification",
    })
  ) {
    return null;
  }

  const configuredEmail = process.env.SHOP_OWNER_EMAIL?.trim().toLowerCase();
  const encodedHash = process.env.SHOP_OWNER_PASSWORD_HASH?.trim() ?? "";
  if (!configuredEmail || !encodedHash || normalizedEmail !== configuredEmail) {
    return null;
  }
  if (!(await verifyEncodedPassword(password, encodedHash))) {
    return null;
  }

  return ownerIdForEmail(normalizedEmail);
}

export async function recordFailedShopLogin(
  email: string,
  clientIp: string,
): Promise<boolean> {
  const now = new Date();
  const bucket = Math.floor(now.getTime() / loginWindowMs);
  const key = createHash("sha256")
    .update(`${email.trim().toLowerCase()}:${clientIp}:${bucket}`)
    .digest("hex");
  const collection = await getLoginAttemptsCollection();
  const current = await collection.findOne({ key });
  if (current && current.count >= failedLoginLimit) {
    return true;
  }

  await collection.findOneAndUpdate(
    { key },
    {
      $inc: { count: 1 },
      $setOnInsert: {
        expiresAt: new Date((bucket + 1) * loginWindowMs),
      },
    },
    { upsert: true, returnDocument: "after" },
  );
  const updated = await collection.findOne({ key });
  return (updated?.count ?? 0) >= failedLoginLimit;
}

export async function clearShopLoginAttempts(
  email: string,
  clientIp: string,
) {
  const bucket = Math.floor(Date.now() / loginWindowMs);
  const key = createHash("sha256")
    .update(`${email.trim().toLowerCase()}:${clientIp}:${bucket}`)
    .digest("hex");
  await (await getLoginAttemptsCollection()).deleteOne({ key });
}

export async function createShopSession(ownerId: string) {
  const sessionId = randomUUID();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + sessionLifetimeMs);
  await (await getSessionsCollection()).insertOne({
    sessionId,
    userId: ownerId,
    createdAt: now,
    expiresAt,
  });

  return {
    token: encodeSession(ownerId, sessionId, expiresAt),
    maxAge: Math.floor(sessionLifetimeMs / 1000),
  };
}

export async function revokeShopSession(request: IncomingMessage) {
  const token = readCookie(request, shopCookieName);
  if (!token) {
    return;
  }

  const claims = decodeSession(token);
  if (!claims) {
    return;
  }

  await (await getSessionsCollection()).updateOne(
    { sessionId: claims.sid, userId: claims.sub },
    { $set: { revokedAt: new Date() } },
  );
}

export function createPasswordHash(password: string) {
  return hashShopPassword(password);
}

export function isValidObjectId(value: string) {
  return ObjectId.isValid(value);
}
