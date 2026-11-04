import { connection, NextResponse } from "next/server";
import { requireUser } from "../../../lib/server/auth";
import { getAllManagementCenters } from "../../../lib/management-center-data";

export async function GET(request: Request) {
  const auth = await requireUser(request);
  if ("response" in auth) return auth.response;
  await connection();
  return NextResponse.json(
    { centers: getAllManagementCenters() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
