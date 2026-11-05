import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getCollection, writeAuditLog } from "../../../../lib/server/database";
import { readJsonBody } from "../../../../lib/server/request";
import { companyTypes } from "../../../../lib/models/supplier-acquisition";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

function publicHost(request: Request) {
  const expected =
    process.env.PUBLIC_HOSTNAME?.trim().toLowerCase() || "qualitet-market.com";
  const host =
    request.headers.get("x-forwarded-host")?.split(",")[0].trim() ??
    request.headers.get("host");
  if (!host) return false;
  try {
    const hostname = new URL(`http://${host}`).hostname.toLowerCase();
    return hostname === expected || hostname === `www.${expected}`;
  } catch {
    return false;
  }
}

function websiteUrl(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return "";
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" && url.hostname.includes(".")
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  if (!publicHost(request)) {
    return NextResponse.json({ error: "Nie znaleziono zasobu." }, { status: 404 });
  }
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: "Nieprawidłowe źródło żądania." }, { status: 403 });
  }

  const parsed = await readJsonBody(request, 32_768);
  if (!parsed.ok) return parsed.response;
  const body = parsed.body;
  if (
    !isRecord(body) ||
    typeof body.name !== "string" ||
    typeof body.email !== "string" ||
    typeof body.phone !== "string" ||
    typeof body.country !== "string" ||
    typeof body.type !== "string" ||
    !Array.isArray(body.categories) ||
    typeof body.marketingConsent !== "boolean"
  ) {
    return NextResponse.json({ error: "Uzupełnij wymagane dane firmy." }, { status: 400 });
  }

  const name = body.name.trim();
  const email = body.email.trim().toLowerCase();
  const phone = body.phone.trim();
  const country = body.country.trim().toUpperCase();
  const website = websiteUrl(body.website);
  const logoUrl = body.logoUrl ? websiteUrl(body.logoUrl) : "";
  const categories = body.categories
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);

  if (
    name.length < 2 ||
    name.length > 160 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    email.length > 254 ||
    phone.length > 40 ||
    !/^[A-Z]{2}$/.test(country) ||
    !companyTypes.includes(body.type as (typeof companyTypes)[number]) ||
    (body.website && website === null) ||
    (body.logoUrl && logoUrl === null) ||
    categories.length > 30 ||
    categories.some((category) => category.length > 80)
  ) {
    return NextResponse.json(
      { error: "Sprawdź poprawność danych, adresów HTTPS i kategorii." },
      { status: 400 },
    );
  }

  const now = new Date();
  const slugBase =
    name
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 100) || "company";

  try {
    const companies = await getCollection("companies");
    if (await companies.findOne({ email }, { projection: { _id: 1 } })) {
      return NextResponse.json(
        { error: "Firma z tym adresem e-mail jest już zgłoszona." },
        { status: 409 },
      );
    }

    const companyResult = await companies.insertOne({
      name,
      slug: `${slugBase}-${randomUUID().slice(0, 8)}`,
      email,
      phone,
      website: website ?? "",
      country,
      type: body.type,
      categories,
      status: "pending",
      commissionDefault: 0,
      adBudget: 0,
      productsCount: 0,
      salesCount: 0,
      marketingConsent: body.marketingConsent,
      ...(logoUrl ? { logoUrl } : {}),
      createdAt: now,
      updatedAt: now,
    });

    let leadId: import("mongodb").ObjectId | undefined;
    let previousContact: import("mongodb").Document | null = null;
    const contacts = await getCollection("crm_contacts");
    try {
      const leadResult = await getCollection("leads").then((leads) =>
        leads.insertOne({
          name,
          companyName: name,
          website: website ?? "",
          email,
          phone,
          source: "public_supplier_registration",
          status: "REGISTERED",
          notes: `Company ID: ${companyResult.insertedId}`,
          categories,
          marketingConsent: body.marketingConsent,
          createdAt: now,
          updatedAt: now,
        }),
      );
      leadId = leadResult.insertedId;
      previousContact = await contacts.findOne({ email });
      await contacts.updateOne(
        { email },
        {
          $set: { name, email, phone, companyId: String(companyResult.insertedId), updatedAt: now },
          $setOnInsert: { createdAt: now, source: "supplier_registration" },
        },
        { upsert: true },
      );
      await writeAuditLog({
        actorId: "system:public-supplier-registration",
        action: "supplier.company.register",
        entity: "companies",
        entityId: String(companyResult.insertedId),
      });
    } catch (error) {
      const cleanup = await Promise.allSettled([
        companies.deleteOne({ _id: companyResult.insertedId }),
        leadId
          ? getCollection("leads").then((leads) => leads.deleteOne({ _id: leadId }))
          : Promise.resolve(),
        previousContact
          ? contacts.replaceOne({ _id: previousContact._id }, previousContact)
          : contacts.deleteOne({ companyId: String(companyResult.insertedId) }),
      ]);
      if (cleanup.some((result) => result.status === "rejected")) {
        console.error("Supplier registration rollback was incomplete.");
      }
      throw error;
    }

    return NextResponse.json(
      { success: true, companyId: String(companyResult.insertedId) },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error(
      "Supplier company registration failed:",
      error instanceof Error ? error.name : "UnknownError",
    );
    return NextResponse.json(
      { error: "Nie udało się zapisać zgłoszenia. Spróbuj ponownie później." },
      { status: 503 },
    );
  }
}
