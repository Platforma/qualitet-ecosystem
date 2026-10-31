import { NextRequest, NextResponse } from "next/server";

const cookieName = "henryk_session";

function decodeBase64Url(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
}

async function hasValidSession(request: NextRequest) {
  const token = request.cookies.get(cookieName)?.value;
  const secret = process.env.SESSION_SECRET;
  if (!token || !secret || new TextEncoder().encode(secret).length < 32) {
    return false;
  }

  const [encodedPayload, encodedSignature, extra] = token.split(".");
  if (!encodedPayload || !encodedSignature || extra !== undefined) {
    return false;
  }

  try {
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"],
    );
    const validSignature = await crypto.subtle.verify(
      "HMAC",
      key,
      decodeBase64Url(encodedSignature),
      new TextEncoder().encode(encodedPayload),
    );
    if (!validSignature) {
      return false;
    }

    const claims: unknown = JSON.parse(
      new TextDecoder().decode(decodeBase64Url(encodedPayload)),
    );
    return (
      typeof claims === "object" &&
      claims !== null &&
      "sub" in claims &&
      typeof claims.sub === "string" &&
      "sid" in claims &&
      typeof claims.sid === "string" &&
      "role" in claims &&
      ["owner", "admin", "user"].includes(String(claims.role)) &&
      "exp" in claims &&
      typeof claims.exp === "number" &&
      claims.exp > Math.floor(Date.now() / 1000)
    );
  } catch {
    return false;
  }
}

export async function proxy(request: NextRequest) {
  const authenticated = await hasValidSession(request);
  if (request.nextUrl.pathname === "/login") {
    return authenticated
      ? NextResponse.redirect(new URL("/", request.url))
      : NextResponse.next();
  }

  if (!authenticated) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api/|_next/static|_next/image|favicon.ico|robots.txt).*)"],
};
