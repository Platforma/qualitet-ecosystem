"use client";

import { useEffect, useState } from "react";
import {
  databaseCollections,
  type DatabaseCollectionName,
} from "../lib/database-collections";

type CollectionState = "present" | "missing" | "unavailable" | "unconfigured";
type DatabaseState = "connected" | "unavailable" | "unconfigured";

type DatabaseResponse = {
  checkedAt: string;
  state: DatabaseState;
  collections: { name: DatabaseCollectionName; state: CollectionState }[];
};

const collectionNames = new Set<string>(
  databaseCollections.map(({ name }) => name),
);
const collectionStates = new Set<string>([
  "present",
  "missing",
  "unavailable",
  "unconfigured",
]);

function isDatabaseResponse(value: unknown): value is DatabaseResponse {
  if (
    typeof value !== "object" ||
    value === null ||
    !("checkedAt" in value) ||
    typeof value.checkedAt !== "string" ||
    !("state" in value) ||
    !["connected", "unavailable", "unconfigured"].includes(
      String(value.state),
    ) ||
    !("collections" in value) ||
    !Array.isArray(value.collections)
  ) {
    return false;
  }

  return value.collections.every(
    (item) =>
      typeof item === "object" &&
      item !== null &&
      "name" in item &&
      typeof item.name === "string" &&
      collectionNames.has(item.name) &&
      "state" in item &&
      typeof item.state === "string" &&
      collectionStates.has(item.state),
  );
}

async function fetchDatabaseStatus(signal?: AbortSignal, refresh = false) {
  const response = await fetch(
    refresh ? "/api/database?refresh=1" : "/api/database",
    {
    cache: "no-store",
    signal,
    },
  );

  if (!response.ok) {
    throw new Error("Nie udało się odczytać statusu MongoDB.");
  }

  const data: unknown = await response.json();
  if (!isDatabaseResponse(data)) {
    throw new Error("Otrzymano nieprawidłowy status kolekcji.");
  }

  return data;
}

const databaseStateLabels: Record<DatabaseState, string> = {
  connected: "Połączenie potwierdzone",
  unavailable: "Baza niedostępna",
  unconfigured: "Nie skonfigurowano",
};

const collectionStateLabels: Record<CollectionState, string> = {
  present: "ISTNIEJE",
  missing: "BRAK",
  unavailable: "NIE SPRAWDZONO",
  unconfigured: "NIE SKONFIGUROWANO",
};

export default function DatabaseStatus() {
  const [result, setResult] = useState<DatabaseResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    void fetchDatabaseStatus(controller.signal)
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
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Nie udało się odczytać statusu MongoDB.",
        );
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
      setResult(await fetchDatabaseStatus(undefined, true));
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Nie udało się odczytać statusu MongoDB.",
      );
    } finally {
      setLoading(false);
    }
  }

  const presentCount =
    result?.collections.filter((item) => item.state === "present").length ?? 0;
  const groupedCollections = Map.groupBy(
    databaseCollections,
    ({ group }) => group,
  );

  return (
    <section
      aria-labelledby="database-status-heading"
      className="rounded-xl border border-slate-200/80 bg-white shadow-sm shadow-slate-200/40"
      id="database-status"
    >
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
        <div>
          <h2
            className="text-sm font-semibold text-slate-800"
            id="database-status-heading"
          >
            Kolekcje MongoDB
          </h2>
          <p className="mt-1 text-[11px] text-slate-400">
            Odczytowa kontrola kolekcji z wybranej bazy Atlas
          </p>
        </div>
        <div className="flex items-center gap-3">
          {result && (
            <span className="text-[11px] text-slate-500">
              {databaseStateLabels[result.state]}
              {result.state === "connected" &&
                ` · ${presentCount}/${databaseCollections.length}`}
            </span>
          )}
          <button
            className="rounded-lg border border-slate-200 px-3 py-2 text-[10px] font-semibold text-slate-600 transition hover:border-indigo-200 hover:text-indigo-700 disabled:cursor-wait disabled:opacity-50"
            disabled={loading}
            onClick={() => void refreshStatus()}
            type="button"
          >
            {loading ? "Sprawdzam…" : "Odśwież"}
          </button>
        </div>
      </header>

      {error && (
        <p
          className="border-b border-rose-100 bg-rose-50 px-5 py-3 text-xs text-rose-700 sm:px-6"
          role="alert"
        >
          {error}
        </p>
      )}

      <div className="grid gap-6 p-5 sm:grid-cols-2 sm:px-6">
        {[...groupedCollections].map(([group, entries]) => (
          <div key={group}>
            <h3 className="mb-2 text-[11px] font-semibold uppercase text-slate-500">
              {group}
            </h3>
            <ul className="divide-y divide-slate-100">
              {entries.map((collection) => {
                const status = result?.collections.find(
                  (item) => item.name === collection.name,
                )?.state;
                const state = status ?? "unavailable";
                const colorClass =
                  state === "present"
                    ? "text-emerald-700"
                    : state === "missing"
                      ? "text-rose-700"
                      : "text-slate-500";

                return (
                  <li
                    className="flex min-h-9 items-center justify-between gap-3 py-2"
                    key={collection.name}
                  >
                    <span className="font-mono text-[11px] text-slate-700">
                      {collection.name}
                      {collection.source === "proposal" && (
                        <span className="ml-2 font-sans text-[9px] text-slate-400">
                          propozycja
                        </span>
                      )}
                    </span>
                    <span
                      className={`shrink-0 text-right text-[9px] font-bold ${colorClass}`}
                    >
                      {collectionStateLabels[state]}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}