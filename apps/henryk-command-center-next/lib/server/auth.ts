import {
  createHmac,
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";
import type { Collection, Document } from "mongodb";
import { ObjectId } from "mongodb";
import { cookies } from "next/headers";
import { getCollection } from "./database";

export const sessionCookieName = "henryk_session";
const sessionLifetimeSeconds = 60 * 60 * 12;
const passwordHashOptions = {
  N: 16_384,
  r: 8,
  p: 1,
  maxmem: 128 * 1024 * 1024,
};

export type UserRole = "owner" | "admin" | "user";
export type AuthUser = {
  _id: string;
  email: string;
  name: string;
  role: UserRole;
};

type SessionClaims = {
  sub: string;
  sid: string;
  role: UserRole;
  iat: number;
  exp: number;
};

function getSessionSecret() {
  const secret = process.env.SESSION_SECRET?.trim();
  if (!secret || Buffer.byteLength(secret) < 32) {
    throw new Error("SESSION_SECRET musi mieć co najmniej 32 bajty.");
  }
  return secret;
}

function encodeBase64Url(value: Buffer | string) {
  return Buffer.from(value).toString("base64url");
}

function decodeBase64Url(value: string) {
  return Buffer.from(value, "base64url");
}

export function createPasswordHashFormat(salt: Buffer, hash: Buffer) {
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const hash = await derivePasswordHash(password, salt);
  return createPasswordHashFormat(salt, hash);
}

function derivePasswordHash(password: string, salt: Buffer) {
  return new Promise<Buffer>((resolve, reject) => {
    scryptCallback(password, salt, 64, passwordHashOptions, (error, key) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(key);
    });
  });
}

export async function verifyPassword(
  password: string,
  encodedHash: string,
): Promise<boolean> {
  const [algorithm, saltHex, hashHex, extra] = encodedHash.split("$");
  if (
    algorithm !== "scrypt" ||
    !saltHex ||
    !hashHex ||
    extra !== undefined ||
    !/^[0-9a-f]{32}$/i.test(saltHex) ||
    !/^[0-9a-f]{128}$/i.test(hashHex)
  ) {
    return false;
  }

  const expected = Buffer.from(hashHex, "hex");
  const actual = await derivePasswordHash(password, Buffer.from(saltHex, "hex"));
  return timingSafeEqual(actual, expected);
}

function signPayload(payload: string) {
  return createHmac("sha256", getSessionSecret())
    .update(payload)
    .digest("base64url");
}

export function verifySessionToken(token: string): SessionClaims | null {
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra !== undefined) {
    return null;
  }

  let actualSignature: Buffer;
  try {
    actualSignature = decodeBase64Url(signature);
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
    const claims = JSON.parse(
      decodeBase64Url(payload).toString("utf8"),
    ) as Partial<SessionClaims>;
    if (
      typeof claims.sub !== "string" ||
      typeof claims.sid !== "string" ||
      !["owner", "admin", "user"].includes(String(claims.role)) ||
      typeof claims.exp !== "number" ||
      claims.exp <= Math.floor(Date.now() / 1000)
    ) {
      return null;
    }
    return claims as SessionClaims;
  } catch {
    return null;
  }
}

export function createSessionToken(userId: string, sessionId: string, role: UserRole) {
  const now = Math.floor(Date.now() / 1000);
  const claims: SessionClaims = {
    sub: userId,
    sid: sessionId,
    role,
    iat: now,
    exp: now + sessionLifetimeSeconds,
  };
  const payload = encodeBase64Url(JSON.stringify(claims));
  return `${payload}.${signPayload(payload)}`;
}

function userCollection(): Promise<Collection<Document>> {
  return getCollection("users");
}

export async function getRequestUser(request?: Request): Promise<AuthUser | null> {
  let token: string | undefined;
  if (request) {
    token = request.headers
      .get("cookie")
      ?.split(";")
      .map((item) => item.trim())
      .find((item) => item.startsWith(`${sessionCookieName}=`))
      ?.slice(sessionCookieName.length + 1);
  } else {
    token = (await cookies()).get(sessionCookieName)?.value;
  }

  if (!token) {
    return null;
  }

  let claims: SessionClaims | null;
  try {
    claims = verifySessionToken(decodeURIComponent(token));
  } catch {
    return null;
  }
  if (!claims) {
    return null;
  }

  const [sessions, users] = await Promise.all([
    getCollection("auth_sessions"),
    userCollection(),
  ]);
  const [session, user] = await Promise.all([
    sessions.findOne({
      sessionId: claims.sid,
      userId: claims.sub,
      revokedAt: { $exists: false },
      expiresAt: { $gt: new Date() },
    }),
    ObjectId.isValid(claims.sub)
      ? users.findOne({
          _id: new ObjectId(claims.sub),
          status: "active",
          role: claims.role,
        })
      : Promise.resolve(null),
  ]);
  if (!session || !user) {
    return null;
  }

  return {
    _id: String(user._id),
    email: String(user.email),
    name: String(user.name),
    role: user.role as UserRole,
  };
}

export async function requireUser(
  request?: Request,
): Promise<{ user: AuthUser } | { response: Response }> {
  const user = await getRequestUser(request);
  if (!user) {
    return {
      response: Response.json(
        { error: "Wymagane jest zalogowanie." },
        { status: 401, headers: { "Cache-Control": "no-store" } },
      ),
    };
  }
  return { user };
}

export function hasRole(user: AuthUser, roles: UserRole[]) {
  return roles.includes(user.role);
}

export async function getSessionCollection() {
  return getCollection("auth_sessions");
}

export const sessionDurationMs = sessionLifetimeSeconds * 1000;
