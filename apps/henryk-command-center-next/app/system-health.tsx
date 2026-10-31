"use client";

import { useEffect, useState } from "react";

type HealthStatus = "healthy" | "degraded";
type DependencyState = "connected" | "unavailable" | "unconfigured";

type HealthResponse = {
  status: HealthStatus;
  checkedAt: string;
  uptimeSeconds: number;
  database: { state: DependencyState };
};

function isHealthResponse(value: unknown): value is HealthResponse {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  return (
    "status" in value &&
    (value.status === "healthy" || value.status === "degraded") &&
    "checkedAt" in value &&
    typeof value.checkedAt === "string" &&
    "uptimeSeconds" in value &&
    typeof value.uptimeSeconds === "number" &&
    "database" in value &&
    typeof value.database === "object" &&
    value.database !== null &&
    "state" in value.database &&
    ["connected", "unavailable", "unconfigured"].includes(
      String(value.database.state),
    )
  );
}

const databaseLabels: Record<DependencyState, string> = {
  connected: "Połączona",
  unavailable: "Niedostępna",
  unconfigured: "Nie skonfigurowano",
};

async function fetchHealth(signal?: AbortSignal): Promise<HealthResponse> {
  const response = await fetch("/api/health", {
    cache: "no-store",
    signal,
  });

  if (!response.ok) {
    throw new Error("Nie udało się odczytać stanu systemu.");
  }

  const result: unknown = await response.json();
  if (!isHealthResponse(result)) {
    throw new Error("Otrzymano nieprawidłową odpowiedź stanu systemu.");
  }

  return result;
}

function getErrorMessage(requestError: unknown) {
  return requestError instanceof Error
    ? requestError.message
    : "Nie udało się odczytać stanu systemu.";
}

export default function SystemHealth() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    setError(null);

    try {
      setHealth(await fetchHealth());
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    void fetchHealth(controller.signal)
      .then((result) => {
        if (active) {
          setHealth(result);
          setError(null);
        }
      })
      .catch((requestError: unknown) => {
        if (
          active &&
          !(requestError instanceof Error && requestError.name === "AbortError")
        ) {
          setError(getErrorMessage(requestError));
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  const isHealthy = health?.status === "healthy";

  return (
    <article
      aria-labelledby="system-health-heading"
      className="rounded-xl border border-slate-200/80 bg-white shadow-sm shadow-slate-200/40"
      id="system-health"
    >
      <header className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
        <div>
          <h2
            className="text-sm font-semibold text-slate-800"
            id="system-health-heading"
          >
            System Health
          </h2>
          <p className="mt-1 text-[11px] text-slate-400">
            Dostępność aplikacji i połączenia z bazą
          </p>
        </div>
        <button
          className="rounded-lg border border-slate-200 px-3 py-2 text-[10px] font-semibold text-slate-600 transition hover:border-indigo-200 hover:text-indigo-700 disabled:cursor-wait disabled:opacity-50"
          disabled={loading}
          onClick={() => void refresh()}
          type="button"
        >
          {loading ? "Sprawdzam…" : "Odśwież"}
        </button>
      </header>

      {error && (
        <p
          className="border-b border-rose-100 bg-rose-50 px-5 py-3 text-xs text-rose-700 sm:px-6"
          role="alert"
        >
          {error}
        </p>
      )}

      <dl className="grid gap-4 p-5 sm:grid-cols-3 sm:px-6">
        <div>
          <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            Aplikacja
          </dt>
          <dd
            className={`mt-1 text-xs font-semibold ${
              isHealthy ? "text-emerald-700" : "text-amber-700"
            }`}
          >
            {health
              ? isHealthy
                ? "Działa"
                : "Ograniczona gotowość"
              : "Oczekiwanie na status"}
          </dd>
        </div>
        <div>
          <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            MongoDB
          </dt>
          <dd
            className={`mt-1 text-xs font-semibold ${
              health?.database.state === "connected"
                ? "text-emerald-700"
                : "text-slate-600"
            }`}
          >
            {health
              ? databaseLabels[health.database.state]
              : "Nie sprawdzono"}
          </dd>
        </div>
        <div>
          <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            Czas pracy procesu
          </dt>
          <dd className="mt-1 text-xs font-semibold text-slate-700">
            {health ? `${health.uptimeSeconds} s` : "—"}
          </dd>
        </div>
      </dl>

      {health && (
        <p className="border-t border-slate-100 px-5 py-3 text-[10px] text-slate-400 sm:px-6">
          Ostatnia kontrola:{" "}
          <time dateTime={health.checkedAt}>
            {new Intl.DateTimeFormat("pl-PL", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            }).format(new Date(health.checkedAt))}
          </time>
        </p>
      )}
    </article>
  );
}
