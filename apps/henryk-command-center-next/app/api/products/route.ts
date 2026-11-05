import { connection, NextResponse } from "next/server";
import type { ProductModel } from "../../../lib/models/product";
import { getCollection } from "../../../lib/server/database";
import { handleFoundationCollection } from "../../../lib/server/foundation-api";

const catalogLimit = 50;

function toPublicProduct(product: ProductModel) {
  if (typeof product.name !== "string" || !product.name.trim()) return null;

  return {
    id: String(product._id),
    name: product.name,
    description: typeof product.description === "string" ? product.description : "",
    price: Number.isFinite(product.price) ? product.price : null,
    currency:
      typeof product.currency === "string" && /^[A-Z]{3}$/.test(product.currency)
        ? product.currency
        : "PLN",
  };
}

export async function GET() {
  await connection();

  const products = await getCollection<ProductModel>("products")
    .then((collection) =>
      collection
        .find(
          { status: "active", archivedAt: { $exists: false } },
          {
            projection: {
              name: 1,
              description: 1,
              price: 1,
              currency: 1,
            },
          },
        )
        .sort({ createdAt: -1 })
        .limit(catalogLimit)
        .toArray(),
    );

  return NextResponse.json(
    { products: products.map(toPublicProduct).filter((product) => product !== null) },
    {
      headers: {
        "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
      },
    },
  );
}

export async function POST(request: Request) {
  return handleFoundationCollection(request, "products");
}
