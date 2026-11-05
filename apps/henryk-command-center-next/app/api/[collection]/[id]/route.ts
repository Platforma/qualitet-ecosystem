import { handleFoundationItem } from "../../../../lib/server/foundation-api";

type RouteContext = {
  params: Promise<{ collection: string; id: string }>;
};

export async function GET(request: Request, { params }: RouteContext) {
  const { collection, id } = await params;
  return handleFoundationItem(request, collection, id);
}
