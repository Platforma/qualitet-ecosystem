import { NextResponse } from "next/server";
import { requireUser } from "../../../../lib/server/auth";
import { getCollection } from "../../../../lib/server/database";

export async function GET(request: Request) {
  const auth = await requireUser(request);
  if ("response" in auth) return auth.response;

  const campaigns = await getCollection("campaigns").then((collection) =>
    collection
      .find({ advertiserId: auth.user._id })
      .sort({ createdAt: -1 })
      .limit(100)
      .toArray(),
  );

  return NextResponse.json(
    { campaigns },
    { headers: { "Cache-Control": "no-store" } },
  );
}