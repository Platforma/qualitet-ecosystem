import { createHash, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import {
  createSessionToken,
  getSessionCollection,
  sessionCookieName,
  sessionDurationMs,
  verifyPassword,
  type UserRole,
} from "../../../../lib/server/auth";
import { getCollection, writeAuditLog } from "../../../../lib/server/database";
import { readJsonBody } from "../../../../lib/server/request";

const failedLoginLimit = 5;
const lockoutMs = 15 * 60 * 1000;

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function safeErrorResponse() {
  return NextResponse.json(
    { error: "Logowanie jest chwilowo niedostępne. Sprawdź konfigurację serwera." },
    { status: 503, headers: { "Cache-Control": "no-store" } },
  );
}

async function recordFailedAttempt(key: string) {
  const attempts = await getCollection("auth_attempts");
  const now = new Date();
  const current = await attempts.findOne({ key });
  if (!current || !(current.expiresAt instanceof Date) || current.expiresAt <= now) {
    await attempts.replaceOne(
      { key },
      { key, count: 1, expiresAt: new Date(now.getTime() + lockoutMs) },
      { upsert: true },
    );
    return;
  }
  await attempts.updateOne({ key }, { $inc: { count: 1 } });
}

export async function POST(request: Request) {
  const parsed = await readJsonBody(request, 16_384);
  if (!parsed.ok) return parsed.response;
  const body = parsed.body;

  if (
    typeof body !== "object" ||
    body === null ||
    !("email" in body) ||
    typeof body.email !== "string" ||
    !("password" in body) ||
    typeof body.password !== "string"
  ) {
    return NextResponse.json(
      { error: "Podaj adres e-mail i hasło." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const email = normalizeEmail(body.email);
  if (
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    body.password.length < 1 ||
    body.password.length > 256
  ) {
    return NextResponse.json(
      { error: "Nieprawidłowy e-mail lub hasło." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const ownerEmail = process.env.OWNER_EMAIL
    ? normalizeEmail(process.env.OWNER_EMAIL)
    : "";
  const ownerPasswordHash = process.env.OWNER_PASSWORD_HASH ?? "";
  const configuredOwner = email === ownerEmail && ownerPasswordHash.length > 0;
  const clientIp =
    request.headers.get("x-real-ip")?.trim() ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown";
  const attemptKey = createHash("sha256")
    .update(`${email}:${clientIp}`)
    .digest("hex");

  try {
    if (!process.env.SESSION_SECRET || Buffer.byteLength(process.env.SESSION_SECRET) < 32) {
      return safeErrorResponse();
    }

    const attempts = await getCollection("auth_attempts");
    const activeLockout = await attempts.findOne({
      key: attemptKey,
      count: { $gte: failedLoginLimit },
      expiresAt: { $gt: new Date() },
    });
    if (activeLockout) {
      return NextResponse.json(
        { error: "Zbyt wiele nieudanych prób. Spróbuj ponownie później." },
        { status: 429, headers: { "Cache-Control": "no-store" } },
      );
    }

    const users = await getCollection("users");
    let user = await users.findOne({ email });
    if (user && user.status !== "active") {
      return NextResponse.json(
        { error: "Nieprawidłowy e-mail lub hasło." },
        { status: 401, headers: { "Cache-Control": "no-store" } },
      );
    }
    const passwordHash =
      configuredOwner && ownerPasswordHash.startsWith("scrypt$")
        ? ownerPasswordHash
        : typeof user?.passwordHash === "string"
          ? user.passwordHash
          : "";

    if (configuredOwner && !ownerPasswordHash.startsWith("scrypt$")) {
      return safeErrorResponse();
    }

    if (!(await verifyPassword(body.password, passwordHash))) {
      await recordFailedAttempt(attemptKey);
      return NextResponse.json(
        { error: "Nieprawidłowy e-mail lub hasło." },
        { status: 401, headers: { "Cache-Control": "no-store" } },
      );
    }
    await attempts.deleteOne({ key: attemptKey });

    if (!user && configuredOwner) {
      const now = new Date();
      await users.insertOne({
        email,
        name: "Owner",
        role: "owner" satisfies UserRole,
        passwordHash,
        status: "active",
        createdAt: now,
        updatedAt: now,
        lastLoginAt: now,
      });
      user = await users.findOne({ email });
    } else if (user && configuredOwner) {
      await users.updateOne(
        { _id: user._id },
        {
          $set: {
            role: "owner",
            passwordHash,
            updatedAt: new Date(),
            lastLoginAt: new Date(),
          },
        },
      );
      user = await users.findOne({ _id: user._id });
    } else if (user) {
      await users.updateOne(
        { _id: user._id },
        { $set: { lastLoginAt: new Date() } },
      );
    }

    if (!user || user._id === undefined || user._id === null) {
      return safeErrorResponse();
    }

    if (!["owner", "admin", "user"].includes(String(user.role))) {
      return safeErrorResponse();
    }
    const role = user.role as UserRole;
    const sessionId = randomUUID();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + sessionDurationMs);
    await getSessionCollection().then((collection) =>
      collection.insertOne({
        sessionId,
        userId: String(user?._id),
        role,
        createdAt: now,
        expiresAt,
      }),
    );
    await writeAuditLog({
      actorId: String(user._id),
      action: "auth.login",
      entity: "users",
      entityId: String(user._id),
    });

    const token = createSessionToken(String(user._id), sessionId, role);
    const response = NextResponse.json(
      {
        user: {
          id: String(user._id),
          email: user.email,
          name: user.name,
          role,
        },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
    response.cookies.set(sessionCookieName, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: Math.floor(sessionDurationMs / 1000),
    });
    return response;
  } catch (error) {
    console.error(
      "Authentication login failed:",
      error instanceof Error ? error.name : "UnknownError",
    );
    return safeErrorResponse();
  }
}
