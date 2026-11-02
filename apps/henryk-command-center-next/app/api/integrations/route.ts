import { NextResponse } from "next/server";
import { hasRole, requireUser } from "../../../lib/server/auth";
import {
  isOwnerIntegrationConfigured,
  ownerIntegrations,
} from "../../../lib/owner-integrations";
import { getOwnerIntegrationSummaries } from "../../../lib/server/owner-config";

export async function GET(request: Request) {
  const auth = await requireUser(request);
  if ("response" in auth) return auth.response;
  if (!hasRole(auth.user, ["owner"])) {
    return NextResponse.json({ error: "Wymagane są uprawnienia właściciela." }, { status: 403 });
  }

  try {
    const summaries = await getOwnerIntegrationSummaries();
    return NextResponse.json(
      {
        checkedAt: new Date().toISOString(),
        integrations: ownerIntegrations.map((integration) => {
          const config = summaries.get(integration.id);
          const fields = config?.configuredFields ?? [];
          const configured = isOwnerIntegrationConfigured(integration.id, fields);
          return {
            id: integration.id,
            state: config?.checkStatus ?? (configured ? "unavailable" : "unconfigured"),
            configured,
            message: config?.checkMessage ?? (configured ? "Wymaga testu połączenia" : "Brak konfiguracji"),
            checkedAt: config?.checkedAt ?? null,
          };
        }),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Integration status load failed:", error instanceof Error ? error.name : "UnknownError");
    return NextResponse.json(
      { error: "Nie udało się odczytać statusów integracji." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
