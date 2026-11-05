import type { NextApiRequest, NextApiResponse } from "next";
import {
  revokeShopSession,
  shopCookieName,
} from "../../../server/shop-auth";
import { hasSameOrigin } from "../../../server/shop-request";

export default async function logoutHandler(
  request: NextApiRequest,
  response: NextApiResponse,
) {
  response.setHeader("Cache-Control", "no-store");
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ error: "Metoda niedozwolona." });
  }
  if (!hasSameOrigin(request)) {
    return response.status(403).json({ error: "Nieprawidłowe źródło żądania." });
  }

  try {
    await revokeShopSession(request);
    response.setHeader(
      "Set-Cookie",
      `${shopCookieName}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${process.env.NODE_ENV === "production" ? "; Secure" : ""}`,
    );
    return response.redirect(303, "/login");
  } catch (error) {
    console.error(
      "Shop logout failed:",
      error instanceof Error ? error.name : "UnknownError",
    );
    return response.status(503).json({
      error: "Nie udało się bezpiecznie zakończyć sesji Shop.",
    });
  }
}
