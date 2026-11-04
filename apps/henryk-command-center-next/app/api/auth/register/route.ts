import { NextResponse } from "next/server";
import { hashPassword } from "../../../../lib/server/auth";
import { getCollection } from "../../../../lib/server/database";
import { readJsonBody } from "../../../../lib/server/request";

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
  if (
    name.length < 1 ||
    name.length > 120 ||
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    body.password.length < 12 ||
    body.password.length > 256 ||
    body.password !== body.passwordConfirmation
  ) {
    return NextResponse.json(
      {
        error:
          "Sprawdź dane. Hasło musi mieć od 12 do 256 znaków, a oba pola hasła muszą być zgodne.",
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

    const now = new Date();
    const passwordHash = await hashPassword(body.password);
    const result = await users.insertOne({
      email,
      name,
      role: "user",
      passwordHash,
      status: "active",
      createdAt: now,
      updatedAt: now,
    });

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
