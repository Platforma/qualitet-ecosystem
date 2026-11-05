import { NextResponse } from "next/server";
import { requireUser } from "../../../../lib/server/auth";
import { getCollection } from "../../../../lib/server/database";

export async function GET(request: Request) {
  const auth = await requireUser(request);
  if ("response" in auth) return auth.response;

  const campaigns = await getCollection("campaigns");
  const [total, active, completed] = await Promise.all([
    campaigns.countDocuments({ advertiserId: auth.user._id }),
    campaigns.countDocuments({
      advertiserId: auth.user._id,
      status: "active",
    }),
    campaigns.countDocuments({
      advertiserId: auth.user._id,
      status: "completed",
    }),
  ]);

  return NextResponse.json(
    { total, active, completed },
    { headers: { "Cache-Control": "no-store" } },
  );
}