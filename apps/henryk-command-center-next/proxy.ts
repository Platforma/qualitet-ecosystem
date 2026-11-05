import { NextRequest, NextResponse } from "next/server";

const cookieName = "henryk_session";

const configuredPublicHostname =
  process.env.PUBLIC_HOSTNAME?.trim().toLowerCase() || "qualitet-market.com";
const configuredOwnerHostname =
  process.env.OWNER_HOSTNAME?.trim().toLowerCase() || "admin.qualitet-market.com";
const publicHostnames = new Set([
  configuredPublicHostname,
  `www.${configuredPublicHostname}`,
]);
const publicApiPaths = new Set([
  "/api/auth/login",
  "/api/auth/logout",
  "/api/auth/register",
  "/api/auth/session",
  "/api/products",
  "/api/suppliers/register",
  "/api/suppliers/products",
  "/api/suppliers/products/import",
  "/api/suppliers/settings",
  "/api/advertiser/analytics",
  "/api/advertiser/campaigns",
]);

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
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0].trim();
  const host = forwardedHost || request.headers.get("host") || request.nextUrl.host;
  let hostname: string;
  try {
    hostname = new URL(`http://${host}`).hostname.toLowerCase();
  } catch {
    hostname = request.nextUrl.hostname.toLowerCase();
  }
  const pathname = request.nextUrl.pathname;

  if (publicHostnames.has(hostname)) {
    if (hostname.startsWith("www.")) {
      const canonicalUrl = request.nextUrl.clone();
      canonicalUrl.hostname = configuredPublicHostname;
      return NextResponse.redirect(canonicalUrl, 308);
    }

    if (pathname.startsWith("/portal")) {
      return NextResponse.next();
    }

    if (pathname.startsWith("/api/")) {
      const advertiserCampaignRoute =
        /^\/api\/advertiser\/campaigns\/[a-f\d]{24}$/i.test(pathname);
      return publicApiPaths.has(pathname) || advertiserCampaignRoute
        ? NextResponse.next()
        : NextResponse.json({ error: "Nie znaleziono zasobu." }, { status: 404 });
    }

    const publicRoutes = new Set([
      "/",
      "/market",
      "/partner",
      "/supplier",
      "/supplier/register",
      "/supplier/dashboard",
      "/ai",
      "/live",
      "/login",
      "/register",
    ]);
    const partnerReferralRoute = /^\/r\/[a-f\d]{12}$/i.test(pathname);
    if (!publicRoutes.has(pathname) && !partnerReferralRoute) {
      return NextResponse.rewrite(new URL("/portal/not-found", request.url));
    }
    if (partnerReferralRoute) return NextResponse.next();

    if (
      pathname === "/supplier/dashboard" &&
      !(await hasValidSession(request))
    ) {
      const loginUrl = new URL("/portal/login", request.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }

    const destination = pathname === "/" ? "/portal" : `/portal${pathname}`;
    return NextResponse.rewrite(new URL(destination, request.url));
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  const authenticated = await hasValidSession(request);
  if (pathname === "/login") {
    return authenticated
      ? NextResponse.redirect(new URL("/", request.url))
      : NextResponse.next();
  }

  if (!authenticated) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }
  if (hostname === configuredOwnerHostname && pathname === "/") {
    return NextResponse.redirect(new URL("/admin/checklist", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt).*)"],
};
