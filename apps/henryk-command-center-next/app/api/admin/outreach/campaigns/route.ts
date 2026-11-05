import { NextResponse } from "next/server";
import { hasRole, requireUser } from "../../../../../lib/server/auth";
import { getCollection, writeAuditLog } from "../../../../../lib/server/database";
import { readJsonBody } from "../../../../../lib/server/request";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function GET(request: Request) {
  const auth = await requireUser(request);
  if ("response" in auth) return auth.response;
  if (!hasRole(auth.user, ["owner"])) {
    return NextResponse.json({ error: "Wymagane są uprawnienia właściciela." }, { status: 403 });
  }
  const items = await getCollection("outreach_campaigns")
    .then((campaigns) => campaigns.find({}).sort({ createdAt: -1 }).limit(100).toArray());
  return NextResponse.json(
    { items: items.map(({ _id, name, subject, status, sent, opened, clicked, registered, createdAt }) => ({
      id: String(_id), name, subject, status, sent, opened, clicked, registered, createdAt,
    })) },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: Request) {
  const auth = await requireUser(request);
  if ("response" in auth) return auth.response;
  if (!hasRole(auth.user, ["owner"])) {
    return NextResponse.json({ error: "Wymagane są uprawnienia właściciela." }, { status: 403 });
  }
  const parsed = await readJsonBody(request, 16_384);
  if (!parsed.ok) return parsed.response;
  const body = parsed.body;
  if (
    !isRecord(body) ||
    typeof body.name !== "string" ||
    typeof body.subject !== "string" ||
    typeof body.message !== "string"
  ) {
    return NextResponse.json({ error: "Uzupełnij nazwę, temat i treść kampanii." }, { status: 400 });
  }
  const name = body.name.trim();
  const subject = body.subject.trim();
  const message = body.message.trim();
  if (!name || name.length > 160 || !subject || subject.length > 250 || !message || message.length > 10_000) {
    return NextResponse.json({ error: "Dane kampanii przekraczają dozwolone limity." }, { status: 400 });
  }
  const followUps = Array.isArray(body.followUps)
    ? body.followUps.slice(0, 2).filter((entry): entry is Record<string, unknown> =>
        typeof entry === "object" && entry !== null && !Array.isArray(entry),
      ).map((entry) => ({
        subject: typeof entry.subject === "string" ? entry.subject.trim().slice(0, 250) : "",
        message: typeof entry.message === "string" ? entry.message.trim().slice(0, 10_000) : "",
      }))
    : [];
  const now = new Date();
  const document = {
    name,
    subject,
    message,
    followUps,
    status: "draft",
    sent: 0,
    opened: 0,
    clicked: 0,
    registered: 0,
    createdBy: auth.user._id,
    createdAt: now,
    updatedAt: now,
  };
  const result = await getCollection("outreach_campaigns").then((items) => items.insertOne(document));
  await writeAuditLog({
    actorId: auth.user._id,
    action: "supplier.outreach.campaign.create",
    entity: "outreach_campaigns",
    entityId: String(result.insertedId),
  });
  return NextResponse.json(
    { item: { id: String(result.insertedId), ...document } },
    { status: 201, headers: { "Cache-Control": "no-store" } },
  );
}
