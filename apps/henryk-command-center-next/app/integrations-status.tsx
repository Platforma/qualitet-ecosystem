"use client";

import { useEffect, useState } from "react";

type IntegrationId = "cloudflare" | "mongodb" | "ollama" | "render" | "github";

type IntegrationStatus = {
  id: IntegrationId;
  state: "connected" | "unavailable" | "unconfigured";
  message: string;
};

type IntegrationsResponse = {
  checkedAt: string;
  integrations: IntegrationStatus[];
};

const integrationIds = new Set<string>([
  "cloudflare",
  "mongodb",
  "ollama",
  "render",
  "github",
]);
const integrationStates = new Set<string>([
  "connected",
  "unavailable",
  "unconfigured",
]);

function isIntegrationsResponse(value: unknown): value is IntegrationsResponse {
  if (
    typeof value !== "object" ||
    value === null ||
    !("integrations" in value) ||
    !Array.isArray(value.integrations) ||
    !("checkedAt" in value) ||
    typeof value.checkedAt !== "string"
  ) {
    return false;
  }

  return value.integrations.every(
    (item) =>
      typeof item === "object" &&
      item !== null &&
      "id" in item &&
      typeof item.id === "string" &&
      integrationIds.has(item.id) &&
      "state" in item &&
      typeof item.state === "string" &&
      integrationStates.has(item.state) &&
      "message" in item &&
      typeof item.message === "string",
  );
}

async function fetchIntegrations(signal?: AbortSignal) {
  const response = await fetch("/api/integrations", {
    cache: "no-store",
    signal,
  });

  if (!response.ok) {
    throw new Error("Status integracji jest chwilowo niedostępny.");
  }

  const data: unknown = await response.json();
  if (!isIntegrationsResponse(data)) {
    throw new Error("Otrzymano nieprawidłową odpowiedź statusu.");
  }

  return data;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Nie udało się odczytać statusu integracji.";
}

const integrations: {
  id: IntegrationId;
  name: string;
  detail: string;
}[] = [
  { id: "cloudflare", name: "Cloudflare", detail: "DNS i infrastruktura" },
  { id: "mongodb", name: "MongoDB", detail: "Baza danych" },
  { id: "ollama", name: "Ollama", detail: "Lokalne modele AI" },
  { id: "render", name: "Render", detail: "Hosting aplikacji" },
  { id: "github", name: "GitHub", detail: "Repozytorium i kod" },
];

const stateLabels: Record<IntegrationStatus["state"], string> = {
  connected: "Połączono",
  unavailable: "Brak połączenia",
  unconfigured: "Nie skonfigurowano",
};

export default function IntegrationsStatus() {
  const [result, setResult] = useState<IntegrationsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    void fetchIntegrations(controller.signal)
      .then((data) => {
        setResult(data);
        setError(null);
      })
      .catch((requestError: unknown) => {
        if (
          requestError instanceof Error &&
          requestError.name === "AbortError"
        ) {
          return;
        }
        setError(getErrorMessage(requestError));
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, []);

  async function refreshStatus() {
    setLoading(true);
    setError(null);
    try {
      setResult(await fetchIntegrations());
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }

  const connectedCount =
    result?.integrations.filter((item) => item.state === "connected").length ??
    0;

  return (
    <article
      className="rounded-xl border border-slate-200/80 bg-white shadow-sm shadow-slate-200/40"
      id="integracje"
    >
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
        <div>
          <h2 className="text-sm font-semibold text-slate-800">
            Integracje i infrastruktura
          </h2>
          <p className="mt-1 text-[11px] text-slate-400">
            Rzeczywisty test połączenia z serwerowej warstwy aplikacji
          </p>
        </div>
        <button
          className="shrink-0 rounded-lg border border-slate-200 px-3 py-2 text-[10px] font-semibold text-slate-600 transition hover:border-indigo-200 hover:text-indigo-700 disabled:cursor-wait disabled:opacity-50"
          disabled={loading}
          onClick={() => void refreshStatus()}
          type="button"
        >
          {loading ? "Sprawdzam…" : "Odśwież"}
        </button>
      </div>
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3 sm:px-6">
        <span className="text-[11px] text-slate-500">
          {result
            ? `${connectedCount}/${integrations.length} połączonych`
            : "Odczytywanie statusów…"}
        </span>
        {result && (
          <time
            className="text-[10px] text-slate-400"
            dateTime={result.checkedAt}
          >
            Sprawdzono:{" "}
            {new Intl.DateTimeFormat("pl-PL", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            }).format(new Date(result.checkedAt))}
          </time>
        )}
      </div>
      {error && (
        <p
          className="border-b border-rose-100 bg-rose-50 px-5 py-3 text-xs text-rose-700 sm:px-6"
          role="alert"
        >
          {error}
        </p>
      )}
      <ul className="divide-y divide-slate-100 px-5 sm:px-6">
        {integrations.map((integration) => {
          const status = result?.integrations.find(
            (item) => item.id === integration.id,
          );
          const isConnected = status?.state === "connected";
          const stateClass = isConnected
            ? "bg-emerald-50 text-emerald-700"
            : status?.state === "unavailable"
              ? "bg-rose-50 text-rose-700"
              : "bg-slate-100 text-slate-500";

          return (
            <li
              className="flex items-center justify-between gap-4 py-4"
              key={integration.id}
            >
              <div className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-lg bg-slate-50 text-xs font-bold text-slate-500">
                  {integration.name.slice(0, 1)}
                </span>
                <div>
                  <p className="text-xs font-semibold text-slate-800">
                    {integration.name}
                  </p>
                  <p className="mt-0.5 text-[10px] text-slate-400">
                    {integration.detail}
                  </p>
                </div>
              </div>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold ${stateClass}`}
              >
                <span
                  className={`size-1.5 rounded-full ${
                    isConnected
                      ? "bg-emerald-500"
                      : status?.state === "unavailable"
                        ? "bg-rose-500"
                        : "bg-slate-400"
                  }`}
                />
                {status ? stateLabels[status.state] : "Sprawdzanie"}
              </span>
            </li>
          );
        })}
      </ul>
      <p className="border-t border-slate-100 px-5 py-3 text-[10px] text-slate-400 sm:px-6">
        Testy sprawdzają dostępność API. Statusy są buforowane przez 30 sekund;
        szczegóły i klucze API nie są zwracane do przeglądarki.
      </p>
    </article>
  );
}
