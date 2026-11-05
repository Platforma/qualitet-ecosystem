import { NextResponse } from "next/server";
import {
  getRequestUser,
  getSessionCollection,
  sessionCookieName,
  verifySessionToken,
} from "../../../../lib/server/auth";
import { writeAuditLog } from "../../../../lib/server/database";

export async function POST(request: Request) {
  const user = await getRequestUser(request);
  const token = request.headers
    .get("cookie")
    ?.split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${sessionCookieName}=`))
    ?.slice(sessionCookieName.length + 1);
  if (user && token) {
    const claims = verifySessionToken(decodeURIComponent(token));
    if (claims) {
      await getSessionCollection().then((collection) =>
        collection.updateOne(
          { sessionId: claims.sid, userId: user._id, revokedAt: { $exists: false } },
          { $set: { revokedAt: new Date() } },
        ),
      );
      await writeAuditLog({
        actorId: user._id,
        action: "auth.logout",
        entity: "users",
        entityId: user._id,
      });
    }
  }

  const response = NextResponse.json(
    { success: true },
    { headers: { "Cache-Control": "no-store" } },
  );
  response.cookies.set(sessionCookieName, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}
