import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { hasRole, requireUser } from "../../../../../lib/server/auth";
import { getCollection, writeAuditLog } from "../../../../../lib/server/database";
import { readJsonBody } from "../../../../../lib/server/request";

const companyStatuses = ["pending", "active", "rejected", "suspended"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireUser(request);
  if ("response" in auth) return auth.response;
  if (!hasRole(auth.user, ["owner"])) {
    return NextResponse.json({ error: "Wymagane są uprawnienia właściciela." }, { status: 403 });
  }
  const { id } = await params;
  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Nieprawidłowy identyfikator firmy." }, { status: 400 });
  }
  const parsed = await readJsonBody(request, 8_192);
  if (!parsed.ok) return parsed.response;
  if (!isRecord(parsed.body)) {
    return NextResponse.json({ error: "Nieprawidłowe dane." }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};
  if (parsed.body.status !== undefined) {
    if (typeof parsed.body.status !== "string" || !companyStatuses.includes(parsed.body.status)) {
      return NextResponse.json({ error: "Nieprawidłowy status firmy." }, { status: 400 });
    }
    patch.status = parsed.body.status;
  }
  if (parsed.body.ownerUserId !== undefined) {
    const ownerUserId = parsed.body.ownerUserId;
    if (typeof ownerUserId !== "string" || !ObjectId.isValid(ownerUserId)) {
      return NextResponse.json({ error: "Podaj prawidłowe ID konta użytkownika." }, { status: 400 });
    }
    const user = await getCollection("users").then((users) =>
      users.findOne({ _id: new ObjectId(ownerUserId), role: "user", status: "active" }),
    );
    if (!user) return NextResponse.json({ error: "Nie znaleziono aktywnego konta dostawcy." }, { status: 404 });
    patch.ownerUserId = ownerUserId;
  }
  if (!Object.keys(patch).length) {
    return NextResponse.json({ error: "Brak zmian do zapisania." }, { status: 400 });
  }

  const result = await getCollection("companies").then((companies) =>
    companies.updateOne(
      { _id: new ObjectId(id) },
      { $set: { ...patch, updatedAt: new Date() } },
    ),
  );
  if (!result.matchedCount) return NextResponse.json({ error: "Nie znaleziono firmy." }, { status: 404 });
  await writeAuditLog({
    actorId: auth.user._id,
    action: "supplier.company.update",
    entity: "companies",
    entityId: id,
  });
  return NextResponse.json({ success: true }, { headers: { "Cache-Control": "no-store" } });
}
