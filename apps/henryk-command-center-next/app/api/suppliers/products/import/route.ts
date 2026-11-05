import { NextResponse } from "next/server";
import { requireUser } from "../../../../../lib/server/auth";
import { parseCsvRows } from "../../../../../lib/server/csv";
import {
  marketplaceCategories,
  type ProductModel,
} from "../../../../../lib/models/product";
import { getCollection, writeAuditLog } from "../../../../../lib/server/database";

const maxBytes = 2 * 1024 * 1024;
const maxRows = 1_000;

export async function POST(request: Request) {
  const auth = await requireUser(request);
  if ("response" in auth) return auth.response;
  const company = await getCollection("companies").then((companies) =>
    companies.findOne({ ownerUserId: auth.user._id, status: "active" }),
  );
  if (!company) return NextResponse.json({ error: "Wymagane jest przypisane i aktywne konto dostawcy." }, { status: 403 });

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File) || !file.name.toLowerCase().endsWith(".csv")) {
    return NextResponse.json({ error: "Wybierz plik CSV." }, { status: 415 });
  }
  if (file.size < 1 || file.size > maxBytes) {
    return NextResponse.json({ error: "Plik musi mieć maksymalnie 2 MB." }, { status: 413 });
  }
  const rows = parseCsvRows(await file.text());
  if (rows.length < 2) return NextResponse.json({ error: "CSV nie zawiera produktów." }, { status: 400 });
  if (rows.length - 1 > maxRows) return NextResponse.json({ error: "Maksymalnie 1000 produktów w jednym imporcie." }, { status: 413 });

  const [rawHeaders = [], ...dataRows] = rows;
  const headers = rawHeaders.map((header) => header.trim().toLowerCase().replace(/[\s-]+/g, "_"));
  const invalidRows: string[] = [];
  const products: ProductModel[] = [];
  const skus = new Set<string>();
  const now = new Date();
  for (const [index, values] of dataRows.entries()) {
    const row = Object.fromEntries(headers.map((header, column) => [header, values[column] ?? ""]));
    const name = String(row.name ?? row.product ?? "").trim();
    const sku = String(row.sku ?? "").trim();
    const wholesalePrice = Number(row.wholesale_price ?? row.wholesaleprice);
    const retailPrice = Number(row.retail_price ?? row.retailprice ?? row.price);
    const commissionRaw = row.partner_commission ?? row.partnercommission;
    const partnerCommission = commissionRaw === undefined || commissionRaw === ""
      ? Number(company.commissionDefault ?? 0)
      : Number(commissionRaw);
    const description = String(row.description ?? "").trim();
    const category = String(row.category ?? "inne").trim();
    if (
      name.length < 2 || name.length > 200 ||
      !sku || sku.length > 100 || skus.has(sku) ||
      !Number.isFinite(wholesalePrice) || wholesalePrice < 0 ||
      !Number.isFinite(retailPrice) || retailPrice < wholesalePrice ||
      !Number.isFinite(partnerCommission) || partnerCommission < 0 || partnerCommission > 100 ||
      description.length > 10_000 ||
      !marketplaceCategories.some((item) => item.slug === category)
    ) {
      invalidRows.push(`Wiersz ${index + 2}: sprawdź nazwę, unikalne SKU i ceny.`);
      continue;
    }
    skus.add(sku);
    products.push({
      kind: "product",
      category: category as ProductModel["category"],
      name,
      sku,
      description,
      price: retailPrice,
      wholesalePrice,
      currency: /^[A-Z]{3}$/.test(String(row.currency ?? "")) ? row.currency : "PLN",
      partnerCommission,
      supplierCompanyId: String(company._id),
      storeId: String(company._id),
      status: "active",
      publication: {
        marketplace: "published",
        partnerProgram: "published",
        aiQualitet: "published",
      },
      distributionChannels: ["marketplace", "partner_program", "ai_qualitet"],
      createdBy: auth.user._id,
      createdAt: now,
      updatedAt: now,
    });
  }

  const productCollection = await getCollection<ProductModel>("products");
  const existing = await productCollection.find(
    { supplierCompanyId: String(company._id), sku: { $in: products.map((product) => product.sku) } },
    { projection: { sku: 1 } },
  ).toArray();
  const existingSkus = new Set(existing.map((product) => String(product.sku)));
  const toInsert = products.filter((product) => !existingSkus.has(String(product.sku)));
  if (!toInsert.length) {
    return NextResponse.json({ imported: 0, rejected: invalidRows.length + products.length, rowErrors: invalidRows.slice(0, 20) });
  }
  const result = await productCollection.insertMany(toInsert);
  await Promise.all([
    getCollection("companies").then((companies) =>
      companies.updateOne({ _id: company._id }, { $inc: { productsCount: result.insertedCount }, $set: { updatedAt: new Date() } }),
    ),
    writeAuditLog({
      actorId: auth.user._id,
      action: "supplier.products.import",
      entity: "products",
      entityId: String(company._id),
    }),
  ]);
  return NextResponse.json(
    { imported: result.insertedCount, rejected: invalidRows.length + products.length - toInsert.length, rowErrors: invalidRows.slice(0, 20) },
    { status: 201, headers: { "Cache-Control": "no-store" } },
  );
}
