import { NextResponse } from "next/server";
import {
  hashPassword,
  hasRole,
  requireUser,
  type UserRole,
} from "../../../../lib/server/auth";
import { getCollection, writeAuditLog } from "../../../../lib/server/database";
import { readJsonBody } from "../../../../lib/server/request";

export async function GET(request: Request) {
  const auth = await requireUser(request);
  if ("response" in auth) return auth.response;
  if (!hasRole(auth.user, ["owner"])) {
    return NextResponse.json(
      { error: "Dostęp do zarządzania użytkownikami wymaga roli owner." },
      { status: 403, headers: { "Cache-Control": "no-store" } },
    );
  }
  const users = await getCollection("users");
  const items = await users
    .find({}, { projection: { passwordHash: 0 } })
    .sort({ createdAt: -1 })
    .limit(100)
    .toArray();
  return NextResponse.json(
    {
      items: items.map((item) => ({
        id: String(item._id),
        email: item.email,
        name: item.name,
        role: item.role,
        status: item.status,
        createdAt: item.createdAt,
        lastLoginAt: item.lastLoginAt,
      })),
      currentUserId: auth.user._id,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: Request) {
  const auth = await requireUser(request);
  if ("response" in auth) return auth.response;
  if (!hasRole(auth.user, ["owner"])) {
    return NextResponse.json(
      { error: "Tylko owner może tworzyć użytkowników." },
      { status: 403, headers: { "Cache-Control": "no-store" } },
    );
  }
  const parsed = await readJsonBody(request, 16_384);
  if (!parsed.ok) return parsed.response;
  const body = parsed.body;
  if (
    typeof body !== "object" ||
    body === null ||
    !("email" in body) ||
    typeof body.email !== "string" ||
    !("name" in body) ||
    typeof body.name !== "string" ||
    !("password" in body) ||
    typeof body.password !== "string" ||
    !("role" in body) ||
    (body.role !== "admin" && body.role !== "user")
  ) {
    return NextResponse.json(
      { error: "Podaj prawidłowe imię, e-mail, hasło i rolę admin/user." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }
  const email = body.email.trim().toLowerCase();
  const name = body.name.trim();
  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    email.length > 254 ||
    name.length < 1 ||
    name.length > 120 ||
    body.password.length < 12 ||
    body.password.length > 256
  ) {
    return NextResponse.json(
      { error: "E-mail, nazwa lub hasło nie spełniają wymagań." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const users = await getCollection("users");
  const existing = await users.findOne({ email });
  if (existing) {
    return NextResponse.json(
      { error: "Użytkownik o tym e-mailu już istnieje." },
      { status: 409, headers: { "Cache-Control": "no-store" } },
    );
  }
  const now = new Date();
  const role = body.role as UserRole;
  const result = await users.insertOne({
    email,
    name,
    role,
    passwordHash: await hashPassword(body.password),
    status: "active",
    createdAt: now,
    updatedAt: now,
  });
  await writeAuditLog({
    actorId: auth.user._id,
    action: "user.create",
    entity: "users",
    entityId: String(result.insertedId),
  });
  return NextResponse.json(
    { user: { id: String(result.insertedId), email, name, role, status: "active" } },
    { status: 201, headers: { "Cache-Control": "no-store" } },
  );
}
