import { NextResponse } from "next/server";
import { getCollection, writeAuditLog } from "../../../../lib/server/database";
import { hasRole, requireUser } from "../../../../lib/server/auth";
import { readJsonBody } from "../../../../lib/server/request";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function GET(request: Request) {
  const auth = await requireUser(request);
  if ("response" in auth) return auth.response;

  const campaigns = await getCollection("campaigns").then((collection) =>
    collection
      .find({ advertiserId: auth.user._id })
      .sort({ createdAt: -1 })
      .limit(100)
      .toArray(),
  );

  return NextResponse.json(
    { campaigns },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: Request) {
  const auth = await requireUser(request);
  if ("response" in auth) return auth.response;

  const user = await getCollection("users").then((users) =>
    users.findOne(
      { email: auth.user.email },
      { projection: { accountTypes: 1 } },
    ),
  );
  const userAccountTypes = Array.isArray(user?.accountTypes)
    ? user.accountTypes
    : [];
  const canAdvertise =
    hasRole(auth.user, ["owner", "admin"]) ||
    userAccountTypes.some((type) =>
      ["advertiser", "company", "store", "wholesaler", "service_provider"].includes(
        String(type),
      ),
    );
  if (!canAdvertise) {
    return NextResponse.json(
      { error: "Wybierz typ konta reklamodawcy lub firmy, aby utworzyć kampanię." },
      { status: 403, headers: { "Cache-Control": "no-store" } },
    );
  }

  const parsed = await readJsonBody(request, 16_384);
  if (!parsed.ok) return parsed.response;
  const body = parsed.body;
  if (
    !isRecord(body) ||
    typeof body.name !== "string" ||
    typeof body.budget !== "number" ||
    typeof body.currency !== "string"
  ) {
    return NextResponse.json(
      { error: "Podaj nazwę kampanii, budżet i walutę." },
      { status: 400 },
    );
  }

  const name = body.name.trim();
  const currency = body.currency.toUpperCase();
  const budget = body.budget;
  if (
    name.length < 2 ||
    name.length > 120 ||
    !Number.isFinite(budget) ||
    budget <= 0 ||
    budget > 100_000_000 ||
    !/^[A-Z]{3}$/.test(currency)
  ) {
    return NextResponse.json(
      { error: "Sprawdź nazwę kampanii, budżet oraz kod waluty." },
      { status: 400 },
    );
  }

  const now = new Date();
  const campaign = {
    name,
    advertiserId: auth.user._id,
    status: "draft" as const,
    budget: Math.round(budget * 100) / 100,
    currency,
    createdAt: now,
    updatedAt: now,
  };
  const result = await getCollection("campaigns").then((campaigns) =>
    campaigns.insertOne(campaign),
  );
  await writeAuditLog({
    actorId: auth.user._id,
    action: "advertiser.campaign.create",
    entity: "campaigns",
    entityId: String(result.insertedId),
  });

  return NextResponse.json(
    { campaign: { id: String(result.insertedId), ...campaign } },
    { status: 201, headers: { "Cache-Control": "no-store" } },
  );
}