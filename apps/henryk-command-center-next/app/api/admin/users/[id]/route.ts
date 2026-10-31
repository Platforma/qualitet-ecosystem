import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { hasRole, requireUser } from "../../../../../lib/server/auth";
import { getCollection, writeAuditLog } from "../../../../../lib/server/database";
import { readJsonBody } from "../../../../../lib/server/request";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireUser(request);
  if ("response" in auth) return auth.response;
  if (!hasRole(auth.user, ["owner"])) {
    return NextResponse.json(
      { error: "Tylko owner może zmieniać role i statusy użytkowników." },
      { status: 403, headers: { "Cache-Control": "no-store" } },
    );
  }

  const { id } = await params;
  const parsed = await readJsonBody(request, 16_384);
  if (!parsed.ok) return parsed.response;
  const body = parsed.body;
  if (
    typeof body !== "object" ||
    body === null ||
    !Object.keys(body).length ||
    Object.keys(body).some((key) => !["role", "status"].includes(key)) ||
    ("role" in body &&
      body.role !== "owner" &&
      body.role !== "admin" &&
      body.role !== "user") ||
    ("status" in body && body.status !== "active" && body.status !== "disabled")
  ) {
    return NextResponse.json(
      { error: "Podano nieprawidłową rolę lub status." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }
  const users = await getCollection("users");
  if (!ObjectId.isValid(id)) {
    return NextResponse.json(
      { error: "Nieprawidłowy identyfikator użytkownika." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }
  const userFilter = { _id: new ObjectId(id) };
  const target = await users.findOne(userFilter);
  if (!target) {
    return NextResponse.json(
      { error: "Nie znaleziono użytkownika." },
      { status: 404, headers: { "Cache-Control": "no-store" } },
    );
  }
  if (String(target._id) === auth.user._id) {
    return NextResponse.json(
      { error: "Nie można zmienić własnej roli ani wyłączyć własnego konta." },
      { status: 409, headers: { "Cache-Control": "no-store" } },
    );
  }
  if (
    String(target.email).toLowerCase() ===
    process.env.OWNER_EMAIL?.trim().toLowerCase()
  ) {
    return NextResponse.json(
      { error: "Konto właściciela skonfigurowane w środowisku nie może być zmieniane z panelu." },
      { status: 409, headers: { "Cache-Control": "no-store" } },
    );
  }
  if (
    target.role === "owner" &&
    (("role" in body && body.role !== "owner") ||
      ("status" in body && body.status !== "active"))
  ) {
    const activeOwners = await users.countDocuments({
      role: "owner",
      status: "active",
    });
    if (activeOwners <= 1) {
      return NextResponse.json(
        { error: "System musi zachować co najmniej jednego aktywnego ownera." },
        { status: 409, headers: { "Cache-Control": "no-store" } },
      );
    }
  }
  const update: Record<string, unknown> = { updatedAt: new Date() };
  if ("role" in body) update.role = body.role;
  if ("status" in body) update.status = body.status;
  await users.updateOne(userFilter, { $set: update });
  await getCollection("auth_sessions").then((sessions) =>
    sessions.updateMany(
      { userId: String(target._id), revokedAt: { $exists: false } },
      { $set: { revokedAt: new Date() } },
    ),
  );
  await writeAuditLog({
    actorId: auth.user._id,
    action: "user.update",
    entity: "users",
    entityId: String(target._id),
  });
  return NextResponse.json(
    { success: true },
    { headers: { "Cache-Control": "no-store" } },
  );
}
