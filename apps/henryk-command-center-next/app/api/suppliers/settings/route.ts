import { NextResponse } from "next/server";
import { requireUser } from "../../../../lib/server/auth";
import { getCollection, writeAuditLog } from "../../../../lib/server/database";
import { readJsonBody } from "../../../../lib/server/request";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function PATCH(request: Request) {
  const auth = await requireUser(request);
  if ("response" in auth) return auth.response;
  const parsed = await readJsonBody(request, 8_192);
  if (!parsed.ok) return parsed.response;
  const body = parsed.body;
  if (
    !isRecord(body) ||
    typeof body.adBudget !== "number" ||
    typeof body.commissionDefault !== "number" ||
    !Number.isFinite(body.adBudget) ||
    !Number.isFinite(body.commissionDefault) ||
    body.adBudget < 0 ||
    body.adBudget > 1_000_000 ||
    body.commissionDefault < 0 ||
    body.commissionDefault > 100
  ) {
    return NextResponse.json({ error: "Nieprawidłowy budżet lub prowizja." }, { status: 400 });
  }
  const result = await getCollection("companies").then((companies) =>
    companies.updateOne(
      { ownerUserId: auth.user._id, status: "active" },
      { $set: { adBudget: body.adBudget, commissionDefault: body.commissionDefault, updatedAt: new Date() } },
    ),
  );
  if (!result.matchedCount) return NextResponse.json({ error: "Nie znaleziono aktywnej firmy." }, { status: 404 });
  await writeAuditLog({
    actorId: auth.user._id,
    action: "supplier.company.settings.update",
    entity: "companies",
  });
  return NextResponse.json({ success: true }, { headers: { "Cache-Control": "no-store" } });
}
