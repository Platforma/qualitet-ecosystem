import { handleFoundationCollection } from "../../../lib/server/foundation-api";

type RouteContext = { params: Promise<{ collection: string }> };

export async function GET(request: Request, { params }: RouteContext) {
  const { collection } = await params;
  return handleFoundationCollection(request, collection);
}

export async function POST(request: Request, { params }: RouteContext) {
  const { collection } = await params;
  return handleFoundationCollection(request, collection);
}
