import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { requireUser } from "../../../../../lib/server/auth";
import { getCollection } from "../../../../../lib/server/database";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: RouteContext) {
  const auth = await requireUser(request);
  if ("response" in auth) return auth.response;

  const { id } = await params;
  if (!ObjectId.isValid(id)) {
    return NextResponse.json(
      { error: "Nie znaleziono kampanii." },
      { status: 404, headers: { "Cache-Control": "no-store" } },
    );
  }

  const campaign = await getCollection("campaigns").then((collection) =>
    collection.findOne({
      _id: new ObjectId(id),
      advertiserId: auth.user._id,
    }),
  );
  if (!campaign) {
    return NextResponse.json(
      { error: "Nie znaleziono kampanii." },
      { status: 404, headers: { "Cache-Control": "no-store" } },
    );
  }

  return NextResponse.json(
    { campaign },
    { headers: { "Cache-Control": "no-store" } },
  );
}