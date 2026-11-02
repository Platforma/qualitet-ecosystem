import { NextResponse } from "next/server";
import { requireUser } from "../../../../lib/server/auth";
import { getCollection, writeAuditLog } from "../../../../lib/server/database";
import type { ProductModel } from "../../../../lib/models/product";
import { readJsonBody } from "../../../../lib/server/request";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function GET(request: Request) {
  const auth = await requireUser(request);
  if ("response" in auth) return auth.response;
  const company = await getCollection("companies").then((companies) =>
    companies.findOne({ ownerUserId: auth.user._id, status: "active" }),
  );
  if (!company) return NextResponse.json({ error: "Nie znaleziono aktywnej firmy przypisanej do konta." }, { status: 404 });
  const products = await getCollection("products").then((items) =>
    items.find({ supplierCompanyId: String(company._id), archivedAt: { $exists: false } })
      .sort({ createdAt: -1 }).limit(100).toArray(),
  );
  return NextResponse.json(
    {
      company: {
        id: String(company._id),
        name: company.name,
        commissionDefault: company.commissionDefault,
        adBudget: company.adBudget,
        productsCount: company.productsCount,
        salesCount: company.salesCount,
      },
      products: products.map((product) => ({
        id: String(product._id),
        name: product.name,
        sku: product.sku,
        wholesalePrice: product.wholesalePrice,
        price: product.price,
        currency: product.currency,
        status: product.status,
      })),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: Request) {
  const auth = await requireUser(request);
  if ("response" in auth) return auth.response;
  const company = await getCollection("companies").then((companies) =>
    companies.findOne({ ownerUserId: auth.user._id, status: "active" }),
  );
  if (!company) return NextResponse.json({ error: "Panel wymaga aktywnej firmy przypisanej przez administratora." }, { status: 403 });

  const parsed = await readJsonBody(request, 32_768);
  if (!parsed.ok) return parsed.response;
  const body = parsed.body;
  if (
    !isRecord(body) ||
    typeof body.name !== "string" ||
    typeof body.description !== "string" ||
    typeof body.sku !== "string" ||
    typeof body.wholesalePrice !== "number" ||
    typeof body.retailPrice !== "number" ||
    typeof body.partnerCommission !== "number" ||
    typeof body.currency !== "string"
  ) {
    return NextResponse.json({ error: "Uzupełnij wszystkie pola produktu." }, { status: 400 });
  }
  const name = body.name.trim();
  const sku = body.sku.trim();
  if (
    name.length < 2 || name.length > 200 ||
    sku.length < 1 || sku.length > 100 ||
    body.description.length > 10_000 ||
    !Number.isFinite(body.wholesalePrice) || body.wholesalePrice < 0 ||
    !Number.isFinite(body.retailPrice) || body.retailPrice < body.wholesalePrice ||
    !Number.isFinite(body.partnerCommission) || body.partnerCommission < 0 || body.partnerCommission > 100 ||
    !/^[A-Z]{3}$/.test(body.currency)
  ) {
    return NextResponse.json({ error: "Sprawdź ceny, prowizję, walutę i długości pól." }, { status: 400 });
  }
  const companyId = String(company._id);
  if (await getCollection("products").then((items) =>
    items.findOne({ supplierCompanyId: companyId, sku }, { projection: { _id: 1 } }),
  )) {
    return NextResponse.json({ error: "SKU jest już używane przez tę firmę." }, { status: 409 });
  }

  const now = new Date();
  const product: ProductModel = {
    name,
    description: body.description.trim(),
    sku,
    price: body.retailPrice,
    wholesalePrice: body.wholesalePrice,
    currency: body.currency,
    partnerCommission: body.partnerCommission,
    supplierCompanyId: companyId,
    storeId: companyId,
    status: "active",
    publication: {
      marketplace: "published",
      partnerProgram: "published",
      aiQualitet: "published",
    },
    createdBy: auth.user._id,
    createdAt: now,
    updatedAt: now,
  };
  const result = await getCollection<ProductModel>("products").then((items) => items.insertOne(product));
  await Promise.all([
    getCollection("companies").then((companies) =>
      companies.updateOne({ _id: company._id }, { $inc: { productsCount: 1 }, $set: { updatedAt: now } }),
    ),
    writeAuditLog({
      actorId: auth.user._id,
      action: "supplier.product.publish",
      entity: "products",
      entityId: String(result.insertedId),
    }),
  ]);
  return NextResponse.json(
    { item: { id: String(result.insertedId), ...product } },
    { status: 201, headers: { "Cache-Control": "no-store" } },
  );
}
