import { foundationCollections } from "../../../../lib/models/foundation";
import { handleFoundationCollection } from "../../../../lib/server/foundation-api";

const shopResources = new Set([
  "products",
  "categories",
  "stores",
  "carts",
  "orders",
  "payments",
  "subscriptions",
  "invoices",
  "notifications",
]);

type RouteContext = { params: Promise<{ resource: string }> };

async function handle(request: Request, { params }: RouteContext) {
  const { resource } = await params;
  if (
    !shopResources.has(resource) ||
    !(foundationCollections as readonly string[]).includes(resource)
  ) {
    return Response.json(
      { error: "Nieznany zasób sklepu." },
      { status: 404, headers: { "Cache-Control": "no-store" } },
    );
  }
  return handleFoundationCollection(request, resource);
}

export async function GET(request: Request, context: RouteContext) {
  return handle(request, context);
}

export async function POST(request: Request, context: RouteContext) {
  return handle(request, context);
}