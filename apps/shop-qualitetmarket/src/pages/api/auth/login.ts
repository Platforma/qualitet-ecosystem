import type { NextApiRequest, NextApiResponse } from "next";
import {
  clearShopLoginAttempts,
  createShopSession,
  recordFailedShopLogin,
  shopCookieName,
  verifyShopOwnerPassword,
} from "../../../server/shop-auth";
import { getClientIp, hasSameOrigin, isRecord } from "../../../server/shop-request";

export const config = {
  api: { bodyParser: { sizeLimit: "4kb" } },
};

function noStore(response: NextApiResponse) {
  response.setHeader("Cache-Control", "no-store");
}

export default async function loginHandler(
  request: NextApiRequest,
  response: NextApiResponse,
) {
  noStore(response);
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ error: "Metoda niedozwolona." });
  }
  if (!hasSameOrigin(request)) {
    return response.status(403).json({ error: "Nieprawidłowe źródło żądania." });
  }

  const body: unknown = request.body;
  if (
    !isRecord(body) ||
    typeof body.email !== "string" ||
    typeof body.password !== "string" ||
    body.email.length > 254 ||
    body.password.length < 1 ||
    body.password.length > 256 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim())
  ) {
    return response.status(400).json({ error: "Podaj prawidłowy e-mail i hasło." });
  }

  const email = body.email.trim().toLowerCase();
  const clientIp = getClientIp(request);
  try {
    const ownerId = await verifyShopOwnerPassword(email, body.password);
    if (!ownerId) {
      const locked = await recordFailedShopLogin(email, clientIp);
      return response
        .status(locked ? 429 : 401)
        .json({
          error: locked
            ? "Zbyt wiele nieudanych prób. Spróbuj ponownie później."
            : "Nieprawidłowy e-mail lub hasło.",
        });
    }

    await clearShopLoginAttempts(email, clientIp);
    const session = await createShopSession(ownerId);
    const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
    response.setHeader(
      "Set-Cookie",
      `${shopCookieName}=${encodeURIComponent(session.token)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${session.maxAge}${secure}`,
    );
    return response.status(200).json({ success: true });
  } catch (error) {
    console.error(
      "Shop login failed:",
      error instanceof Error ? error.name : "UnknownError",
    );
    return response.status(503).json({
      error: "Logowanie Shop jest niedostępne. Sprawdź konfigurację serwera.",
    });
  }
}
