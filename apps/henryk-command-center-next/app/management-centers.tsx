"use client";

import { useEffect, useState } from "react";
import type { ManagementCenterId } from "../lib/management-centers";
import type { ManagementCenterSnapshot } from "../lib/management-center-data";
import CollectionManager from "./collection-manager";
import DatabaseStatus from "./database-status";
import SystemHealth from "./system-health";
import UserManager from "./user-manager";

type CentersResponse = { centers: ManagementCenterSnapshot[] };

function isCenterSnapshot(value: unknown): value is ManagementCenterSnapshot {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  return (
    "id" in value &&
    typeof value.id === "string" &&
    "label" in value &&
    typeof value.label === "string" &&
    "description" in value &&
    typeof value.description === "string" &&
    "api" in value &&
    typeof value.api === "string" &&
    "state" in value &&
    ["configured", "unconfigured", "limited"].includes(String(value.state)) &&
    "stateLabel" in value &&
    typeof value.stateLabel === "string" &&
    "checkedAt" in value &&
    typeof value.checkedAt === "string" &&
    "metrics" in value &&
    Array.isArray(value.metrics) &&
    "logs" in value &&
    Array.isArray(value.logs) &&
    "configuration" in value &&
    Array.isArray(value.configuration) &&
    "availableActions" in value &&
    Array.isArray(value.availableActions) &&
    "limitations" in value &&
    Array.isArray(value.limitations)
  );
}

function isCentersResponse(value: unknown): value is CentersResponse {
  return (
    typeof value === "object" &&
    value !== null &&
    "centers" in value &&
    Array.isArray(value.centers) &&
    value.centers.every(isCenterSnapshot)
  );
}

async function loadCenters(signal?: AbortSignal) {
  const response = await fetch("/api/centers", {
    cache: "no-store",
    signal,
  });
  if (!response.ok) {
    throw new Error("Nie udało się odczytać statusów modułów.");
  }

  const data: unknown = await response.json();
  if (!isCentersResponse(data)) {
    throw new Error("Otrzymano nieprawidłowy status modułów.");
  }
  return data.centers;
}

const stateStyles: Record<ManagementCenterSnapshot["state"], string> = {
  configured: "bg-sky-50 text-sky-700",
  unconfigured: "bg-slate-100 text-slate-600",
  limited: "bg-amber-50 text-amber-700",
};

export default function ManagementCenters() {
  const [centers, setCenters] = useState<ManagementCenterSnapshot[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState<ManagementCenterId | "all" | null>(
    null,
  );

  async function refreshCenter(id: ManagementCenterId) {
    setRefreshing(id);
    setError(null);
    try {
      const response = await fetch(`/api/centers/${id}`, {
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error("Nie udało się odświeżyć statusu modułu.");
      }
      const result: unknown = await response.json();
      if (!isCenterSnapshot(result) || result.id !== id) {
        throw new Error("Otrzymano nieprawidłowy status modułu.");
      }
      setCenters((previous) =>
        previous.map((center) =>
          center.id === id
            ? result
            : center,
        ),
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Nie udało się odświeżyć statusu modułu.",
      );
    } finally {
      setRefreshing(null);
    }
  }

  async function refreshAll() {
    setRefreshing("all");
    setError(null);
    try {
      setCenters(await loadCenters());
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Nie udało się odświeżyć statusów modułów.",
      );
    } finally {
      setRefreshing(null);
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    void loadCenters(controller.signal)
      .then(setCenters)
      .catch((requestError: unknown) => {
        if (
          requestError instanceof Error &&
          requestError.name === "AbortError"
        ) {
          return;
        }
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Nie udało się odczytać statusów modułów.",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });
    return () => controller.abort();
  }, []);

  return (
    <section aria-labelledby="management-centers-heading" className="mt-10">
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-indigo-600">
            Jedno centrum zarządzania
          </p>
          <h2
            className="text-lg font-bold tracking-tight text-slate-900"
            id="management-centers-heading"
          >
            Panele modułów
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Statusy, dostępne metryki, logi i konfiguracja. Brak danych lub
            połączenia jest pokazywany jawnie.
          </p>
        </div>
        <button
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold text-slate-600 transition hover:border-indigo-200 hover:text-indigo-700 disabled:cursor-wait disabled:opacity-50"
          disabled={refreshing !== null}
          onClick={() => void refreshAll()}
          type="button"
        >
          {refreshing === "all" ? "Odświeżam…" : "Odśwież wszystkie"}
        </button>
      </header>

      {error && (
        <p
          className="mb-4 rounded-lg border border-rose-100 bg-rose-50 px-4 py-3 text-xs text-rose-700"
          role="alert"
        >
          {error}
        </p>
      )}

      {loading && centers.length === 0 ? (
        <p className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
          Odczytywanie modułów…
        </p>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {centers.map((center) => (
            <article
              aria-labelledby={`${center.id}-heading`}
              className="scroll-mt-24 rounded-xl border border-slate-200/80 bg-white shadow-sm shadow-slate-200/40"
              id={center.id}
              key={center.id}
            >
              <header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
                <div>
                  <h3
                    className="text-sm font-semibold text-slate-800"
                    id={`${center.id}-heading`}
                  >
                    {center.label}
                  </h3>
                  <p className="mt-1 text-[11px] text-slate-400">
                    {center.description}
                  </p>
                  <p className="mt-1 font-mono text-[10px] text-slate-400">
                    GET {center.api}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${stateStyles[center.state]}`}
                >
                  {center.stateLabel}
                </span>
              </header>

              <div className="grid gap-5 p-5 sm:grid-cols-2 sm:px-6">
                <section>
                  <h4 className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    Statystyki · źródła
                  </h4>
                  <dl className="space-y-2">
                    {center.metrics.map((metric) => (
                      <div
                        className="flex items-start justify-between gap-3 border-b border-slate-50 pb-2"
                        key={metric.label}
                      >
                        <dt className="text-[11px] text-slate-600">
                          {metric.label}
                          <span className="mt-0.5 block text-[9px] text-slate-400">
                            {metric.source}
                          </span>
                        </dt>
                        <dd className="text-right text-xs font-semibold text-slate-800">
                          {metric.value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </section>

                <section>
                  <h4 className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    Logi / zdarzenia
                  </h4>
                  <ul className="space-y-2">
                    {center.logs.map((log, index) => (
                      <li
                        className="rounded-lg bg-slate-50 px-3 py-2"
                        key={`${log.label}-${index}`}
                      >
                        <p className="text-[10px] font-semibold text-slate-700">
                          {log.label}
                        </p>
                        <p className="mt-1 text-[10px] leading-4 text-slate-500">
                          {log.detail}
                        </p>
                      </li>
                    ))}
                  </ul>
                </section>

                <section>
                  <h4 className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    Konfiguracja serwerowa
                  </h4>
                  {center.configuration.length > 0 ? (
                    <ul className="space-y-1.5">
                      {center.configuration.map((item) => (
                        <li
                          className="flex items-center justify-between gap-3 text-[10px]"
                          key={item.key}
                        >
                          <code className="text-slate-600">{item.key}</code>
                          <span
                            className={
                              item.configured
                                ? "font-semibold text-emerald-700"
                                : "font-semibold text-slate-400"
                            }
                          >
                            {item.configured ? "USTAWIONA" : "BRAK"}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-[10px] text-slate-500">
                      Brak zmiennych wymaganych przez ten widok.
                    </p>
                  )}
                  <p className="mt-2 text-[9px] text-slate-400">
                    Pokazywana jest wyłącznie obecność zmiennej. Jej wartość nie
                    trafia do przeglądarki.
                  </p>
                </section>

                <section>
                  <h4 className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    Bezpieczne akcje
                  </h4>
                  <button
                    className="rounded-lg border border-slate-200 px-3 py-2 text-[10px] font-semibold text-slate-600 transition hover:border-indigo-200 hover:text-indigo-700 disabled:cursor-wait disabled:opacity-50"
                    disabled={refreshing !== null}
                    onClick={() => void refreshCenter(center.id)}
                    type="button"
                  >
                    {refreshing === center.id ? "Sprawdzam…" : "Odśwież status"}
                  </button>
                  <ul className="mt-2 space-y-1">
                    {center.limitations.map((limitation) => (
                      <li
                        className="text-[9px] leading-4 text-slate-400"
                        key={limitation}
                      >
                        {limitation}
                      </li>
                    ))}
                  </ul>
                </section>
              </div>
              {center.id === "mongodb" && (
                <div className="border-t border-slate-100 p-4 sm:p-5">
                  <DatabaseStatus />
                </div>
              )}
              {center.id === "system-health" && (
                <div className="border-t border-slate-100 p-4 sm:p-5">
                  <SystemHealth />
                </div>
              )}
              {center.id === "users" && <UserManager />}
              <CollectionManager center={center.id} />
              <footer className="border-t border-slate-100 px-5 py-2.5 text-[9px] text-slate-400 sm:px-6">
                API sprawdzone:{" "}
                {new Intl.DateTimeFormat("pl-PL", {
                  dateStyle: "short",
                  timeStyle: "medium",
                }).format(new Date(center.checkedAt))}
              </footer>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
