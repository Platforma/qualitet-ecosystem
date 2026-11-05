import { connection, NextResponse } from "next/server";
import { requireUser } from "../../../../lib/server/auth";
import {
  getManagementCenter,
  isManagementCenterId,
} from "../../../../lib/management-center-data";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ module: string }> },
) {
  const auth = await requireUser(request);
  if ("response" in auth) return auth.response;
  await connection();
  const { module } = await params;
  if (!isManagementCenterId(module)) {
    return NextResponse.json(
      { error: "Nie znaleziono modułu centrum." },
      { status: 404, headers: { "Cache-Control": "no-store" } },
    );
  }

  return NextResponse.json(getManagementCenter(module), {
    headers: { "Cache-Control": "no-store" },
  });
}
