import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { hashPassword } from "../../../../lib/server/auth";
import { getCollection } from "../../../../lib/server/database";
import { readJsonBody } from "../../../../lib/server/request";
import { accountTypes } from "../../../../lib/models/user";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;

  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

function isPublicHost(request: Request) {
  const configuredHostname =
    process.env.PUBLIC_HOSTNAME?.trim().toLowerCase() || "qualitet-market.com";
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0].trim();
  const host = forwardedHost || request.headers.get("host");
  if (!host) return false;

  try {
    const hostname = new URL(`http://${host}`).hostname.toLowerCase();
    return (
      hostname === configuredHostname ||
      hostname === `www.${configuredHostname}`
    );
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  if (!isPublicHost(request)) {
    return NextResponse.json(
      { error: "Nie znaleziono zasobu." },
      { status: 404, headers: { "Cache-Control": "no-store" } },
    );
  }

  if (!isSameOrigin(request)) {
    return NextResponse.json(
      { error: "Nieprawidłowe źródło żądania." },
      { status: 403, headers: { "Cache-Control": "no-store" } },
    );
  }

  if (
    request.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase() !==
    "application/json"
  ) {
    return NextResponse.json(
      { error: "Żądanie musi być przesłane jako JSON." },
      { status: 415, headers: { "Cache-Control": "no-store" } },
    );
  }

  const parsed = await readJsonBody(request, 8_192);
  if (!parsed.ok) return parsed.response;

  const body = parsed.body;
  if (
    !isRecord(body) ||
    typeof body.name !== "string" ||
    typeof body.email !== "string" ||
    typeof body.password !== "string" ||
    typeof body.passwordConfirmation !== "string"
  ) {
    return NextResponse.json(
      { error: "Podaj imię i nazwisko, e-mail oraz hasło." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const name = body.name.trim();
  const email = body.email.trim().toLowerCase();
  const requestedAccountTypes =
    body.accountTypes === undefined ? ["customer"] : body.accountTypes;
  const referralCode = body.referralCode;
  if (
    name.length < 1 ||
    name.length > 120 ||
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    body.password.length < 12 ||
    body.password.length > 256 ||
    body.password !== body.passwordConfirmation ||
    !Array.isArray(requestedAccountTypes) ||
    requestedAccountTypes.length < 1 ||
    requestedAccountTypes.length > accountTypes.length ||
    requestedAccountTypes.some(
      (type) =>
        typeof type !== "string" ||
        !accountTypes.includes(type as (typeof accountTypes)[number]),
    ) ||
    new Set(requestedAccountTypes).size !== requestedAccountTypes.length
    || (referralCode !== undefined &&
      (typeof referralCode !== "string" || !/^[a-f0-9]{12}$/.test(referralCode)))
  ) {
    return NextResponse.json(
      {
        error:
          "Sprawdź dane, hasło i wybrane typy konta. Hasło musi mieć od 12 do 256 znaków.",
      },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const users = await getCollection("users");
    if (await users.findOne({ email }, { projection: { _id: 1 } })) {
      return NextResponse.json(
        { error: "Konto z tym adresem e-mail już istnieje." },
        { status: 409, headers: { "Cache-Control": "no-store" } },
      );
    }

    let referrer: { _id: import("mongodb").ObjectId } | null = null;
    if (typeof referralCode === "string") {
      referrer = await getCollection("partners").then((partners) =>
        partners.findOne(
          { referralCode, status: "active" },
          { projection: { _id: 1 } },
        ),
      );
      if (!referrer) {
        return NextResponse.json(
          { error: "Kod polecający jest nieaktywny lub nieprawidłowy." },
          { status: 400, headers: { "Cache-Control": "no-store" } },
        );
      }
    }

    const now = new Date();
    const passwordHash = await hashPassword(body.password);
    const result = await users.insertOne({
      email,
      name,
      role: "user",
      accountTypes: requestedAccountTypes,
      ...(referrer ? { referredByPartnerId: String(referrer._id) } : {}),
      passwordHash,
      status: "active",
      createdAt: now,
      updatedAt: now,
    });

    if (requestedAccountTypes.includes("partner")) {
      const partners = await getCollection("partners");
      let generatedCode = "";
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const candidate = randomBytes(6).toString("hex");
        if (!(await partners.findOne({ referralCode: candidate }, { projection: { _id: 1 } }))) {
          generatedCode = candidate;
          break;
        }
      }
      if (!generatedCode) {
        await users.deleteOne({ _id: result.insertedId });
        throw new Error("Unable to allocate a unique partner referral code.");
      }
      try {
        await partners.insertOne({
          userId: String(result.insertedId),
          referralCode: generatedCode,
          status: "active",
          clickCount: 0,
          createdAt: now,
          updatedAt: now,
        });
      } catch (error) {
        await users.deleteOne({ _id: result.insertedId });
        throw error;
      }
    }

    return NextResponse.json(
      { user: { id: String(result.insertedId), email, name } },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === 11000
    ) {
      return NextResponse.json(
        { error: "Konto z tym adresem e-mail już istnieje." },
        { status: 409, headers: { "Cache-Control": "no-store" } },
      );
    }

    console.error(
      "Public account registration failed:",
      error instanceof Error ? error.name : "UnknownError",
    );
    return NextResponse.json(
      { error: "Nie udało się utworzyć konta. Spróbuj ponownie później." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
