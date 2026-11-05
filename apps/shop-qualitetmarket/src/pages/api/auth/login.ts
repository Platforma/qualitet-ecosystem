import type { NextApiRequest, NextApiResponse } from "next";
import {
  clearShopLoginAttempts,
  createShopEmailVerification,
  createShopSession,
  recordFailedShopLogin,
  registerShopAccount,
  shopCookieName,
  verifyShopAccountEmail,
  verifyShopOwnerPassword,
} from "../../../server/shop-auth";
import { getClientIp, hasSameOrigin, isRecord } from "../../../server/shop-request";

export const config = {
  api: { bodyParser: { sizeLimit: "4kb" } },
};

function noStore(response: NextApiResponse) {
  response.setHeader("Cache-Control", "no-store");
}

async function sendVerificationEmail(to: string, token: string, origin: string) {
  const serverToken = process.env.POSTMARK_SERVER_TOKEN?.trim();
  const from = process.env.SHOP_EMAIL_FROM?.trim();
  if (!serverToken || !from) {
    throw new Error("Postmark is not configured for Shop account verification.");
  }
  const verificationUrl = new URL("/login", origin);
  verificationUrl.searchParams.set("verify", token);
  const result = await fetch("https://api.postmarkapp.com/email", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-Postmark-Server-Token": serverToken,
    },
    body: JSON.stringify({
      From: from,
      To: to,
      Subject: "Potwierdź adres e-mail — Qualitet Shop",
      TextBody: `Aby aktywować konto Shop, otwórz link (ważny przez 30 minut): ${verificationUrl.toString()}`,
      MessageStream: "outbound",
    }),
    signal: AbortSignal.timeout(12_000),
  });
  if (!result.ok) {
    throw new Error(`Postmark rejected verification email (HTTP ${result.status}).`);
  }
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
  if (!isRecord(body)) {
    return response.status(400).json({ error: "Podaj prawidłowe dane." });
  }

  const action = body.action === undefined ? "login" : body.action;
  if (
    typeof action !== "string" ||
    (action !== "login" &&
      action !== "register" &&
      action !== "verify" &&
      action !== "resend")
  ) {
    return response.status(400).json({ error: "Nieobsługiwana operacja." });
  }
  if (action === "verify") {
    if (typeof body.token !== "string" || body.token.length > 128) {
      return response.status(400).json({ error: "Nieprawidłowy link weryfikacyjny." });
    }
  } else if (
    typeof body.email !== "string" ||
    body.email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim())
  ) {
    return response.status(400).json({ error: "Podaj prawidłowy e-mail." });
  }
  if (
    (action === "login" || action === "register") &&
    (typeof body.password !== "string" ||
      body.password.length < (action === "register" ? 12 : 1) ||
      body.password.length > 256)
  ) {
    return response.status(400).json({
      error: action === "register"
        ? "Hasło musi zawierać co najmniej 12 znaków."
        : "Podaj hasło.",
    });
  }
  if (
    action === "register" &&
    (typeof body.companyName !== "string" ||
      body.companyName.trim().length < 2 ||
      body.companyName.trim().length > 200)
  ) {
    return response.status(400).json({ error: "Podaj nazwę firmy." });
  }

  if (action === "verify") {
    try {
      const verified = await verifyShopAccountEmail(body.token as string);
      return verified
        ? response.status(200).json({ verified: true })
        : response.status(400).json({ error: "Link weryfikacyjny jest nieprawidłowy lub wygasł." });
    } catch (error) {
      console.error("Shop email verification failed:", error instanceof Error ? error.name : "UnknownError");
      return response.status(503).json({ error: "Nie udało się zweryfikować konta." });
    }
  }

  const email = (body.email as string).trim().toLowerCase();
  const origin = request.headers.origin;
  if (
    (action === "register" || action === "resend") &&
    (!origin || !/^https?:\/\//i.test(origin))
  ) {
    return response.status(400).json({ error: "Nie można ustalić adresu sklepu." });
  }

  if (action === "resend") {
    try {
      const token = await createShopEmailVerification(email);
      await sendVerificationEmail(email, token, origin as string);
      return response.status(200).json({ verificationSent: true });
    } catch (error) {
      console.error("Shop verification resend failed:", error instanceof Error ? error.name : "UnknownError");
      return response.status(503).json({ error: "Nie udało się wysłać wiadomości weryfikacyjnej." });
    }
  }

  if (action === "register") {
    try {
      await registerShopAccount(
        body.companyName as string,
        email,
        body.password as string,
      );
      const token = await createShopEmailVerification(email);
      await sendVerificationEmail(email, token, origin as string);
      return response.status(202).json({ verificationSent: true });
    } catch (error) {
      if (error instanceof TypeError) {
        return response.status(400).json({ error: error.message });
      }
      if (error instanceof Error && error.message.includes("already exists")) {
        return response.status(409).json({ error: error.message });
      }
      console.error("Shop account registration failed:", error instanceof Error ? error.name : "UnknownError");
      return response.status(503).json({ error: "Nie udało się utworzyć konta lub wysłać weryfikacji." });
    }
  }

  const clientIp = getClientIp(request);
  try {
    const ownerId = await verifyShopOwnerPassword(email, body.password as string);
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
