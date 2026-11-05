import { NextResponse } from "next/server";
import { getCollection } from "../../../lib/server/database";

type RouteContext = { params: Promise<{ code: string }> };

export async function GET(request: Request, { params }: RouteContext) {
  const { code } = await params;
  if (!/^[a-f0-9]{12}$/.test(code)) {
    return NextResponse.redirect(new URL("/register", request.url));
  }

  const now = new Date();
  const result = await getCollection("partners").then((partners) =>
    partners.updateOne(
      { referralCode: code, status: "active" },
      { $inc: { clickCount: 1 }, $set: { lastClickAt: now, updatedAt: now } },
    ),
  );
  if (result.matchedCount === 0) {
    return NextResponse.redirect(new URL("/register", request.url));
  }

  return NextResponse.redirect(
    new URL(`/register?ref=${encodeURIComponent(code)}`, request.url),
  );
}
