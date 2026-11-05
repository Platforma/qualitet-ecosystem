"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { ManagementCenterId } from "../lib/management-centers";

type ManagedCollection =
  | "ai_agents"
  | "ai_tasks"
  | "memory_entries"
  | "integrations"
  | "audit_logs"
  | "system_health"
  | "companies"
  | "crm_contacts"
  | "leads"
  | "products"
  | "stores"
  | "marketplace_ads";

type ManagedRecord = Record<string, unknown> & { _id: string };
type CollectionResult = { collection: string; items: ManagedRecord[] };

const collectionLabels: Record<ManagedCollection, string> = {
  ai_agents: "Agenci AI",
  ai_tasks: "Zadania AI",
  memory_entries: "Pamięć AI",
  integrations: "Integracje",
  audit_logs: "Audit logs",
  system_health: "Historia health",
  companies: "Firmy",
  crm_contacts: "Kontakty",
  leads: "Leady",
  products: "Produkty",
  stores: "Sklepy",
  marketplace_ads: "Ogłoszenia",
};

const fields: Partial<
  Record<ManagedCollection, { key: string; label: string; type?: string }[]>
> = {
  companies: [
    { key: "name", label: "Nazwa firmy" },
    { key: "website", label: "Strona www" },
    { key: "industry", label: "Branża" },
    { key: "email", label: "E-mail", type: "email" },
    { key: "phone", label: "Telefon" },
    { key: "notes", label: "Notatki" },
  ],
  crm_contacts: [
    { key: "name", label: "Imię i nazwisko" },
    { key: "email", label: "E-mail", type: "email" },
    { key: "phone", label: "Telefon" },
    { key: "companyId", label: "ID firmy" },
    { key: "title", label: "Stanowisko" },
    { key: "notes", label: "Notatki" },
  ],
  leads: [
    { key: "name", label: "Nazwa / kontakt" },
    { key: "email", label: "E-mail", type: "email" },
    { key: "phone", label: "Telefon" },
    { key: "companyId", label: "ID firmy" },
    { key: "status", label: "Status" },
    { key: "source", label: "Źródło" },
    { key: "notes", label: "Notatki" },
  ],
  products: [
    { key: "name", label: "Nazwa produktu" },
    { key: "description", label: "Opis" },
    { key: "sku", label: "SKU" },
    { key: "price", label: "Cena", type: "number" },
    { key: "currency", label: "Waluta" },
    { key: "status", label: "Status" },
    { key: "storeId", label: "ID sklepu" },
  ],
  stores: [
    { key: "name", label: "Nazwa sklepu" },
    { key: "domain", label: "Domena" },
    { key: "platform", label: "Platforma" },
    { key: "status", label: "Status" },
  ],
  marketplace_ads: [
    { key: "title", label: "Tytuł ogłoszenia" },
    { key: "marketplace", label: "Marketplace" },
    { key: "externalId", label: "ID zewnętrzne" },
    { key: "status", label: "Status" },
    { key: "url", label: "URL" },
    { key: "productId", label: "ID produktu" },
  ],
};

function getCollections(center: ManagementCenterId): ManagedCollection[] {
  switch (center) {
    case "ai-center":
      return ["ai_agents"];
    case "ai-tasks":
      return ["ai_tasks"];
    case "ai-memory":
      return ["memory_entries"];
    case "ai-logs":
      return ["audit_logs"];
    case "crm":
      return ["companies", "crm_contacts", "leads"];
    case "marketplace":
      return ["products", "stores", "marketplace_ads"];
    case "shops":
      return ["stores", "products"];
    case "mongodb":
      return [
        "ai_agents",
        "ai_tasks",
        "memory_entries",
        "integrations",
        "audit_logs",
        "system_health",
        "companies",
        "crm_contacts",
        "leads",
        "products",
        "stores",
        "marketplace_ads",
      ];
    case "owner-studio":
      return ["system_health", "integrations", "audit_logs", "ai_tasks"];
    default:
      return [];
  }
}

function isCollectionResult(value: unknown): value is CollectionResult {
  return (
    typeof value === "object" &&
    value !== null &&
    "collection" in value &&
    typeof value.collection === "string" &&
    "items" in value &&
    Array.isArray(value.items) &&
    value.items.every(
      (item) =>
        typeof item === "object" &&
        item !== null &&
        "_id" in item &&
        typeof item._id === "string",
    )
  );
}

async function fetchCollections(
  collections: ManagedCollection[],
  signal?: AbortSignal,
) {
  const results = await Promise.all(
    collections.map(async (collection) => {
      const response = await fetch(
        `/api/management/${collection}?limit=20`,
        { cache: "no-store", signal },
      );
      if (!response.ok) {
        throw new Error(
          response.status === 401 || response.status === 403
            ? `Brak dostępu do kolekcji ${collection}.`
            : `Nie udało się odczytać kolekcji ${collection}.`,
        );
      }
      const result: unknown = await response.json();
      if (!isCollectionResult(result)) {
        throw new Error(`Nieprawidłowa odpowiedź kolekcji ${collection}.`);
      }
      return [collection, result.items] as const;
    }),
  );
  return Object.fromEntries(results) as Partial<
    Record<ManagedCollection, ManagedRecord[]>
  >;
}

export default function CollectionManager({
  center,
}: {
  center: ManagementCenterId;
}) {
  const collections = getCollections(center);
  const [records, setRecords] = useState<
    Partial<Record<ManagedCollection, ManagedRecord[]>>
  >({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    setBusy(true);
    setError(null);
    try {
      setRecords(await fetchCollections(collections));
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Nie udało się odczytać danych MongoDB.",
      );
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    void fetchCollections(getCollections(center), controller.signal)
      .then((result) => {
        if (active) setRecords(result);
      })
      .catch((requestError: unknown) => {
        if (
          active &&
          !(requestError instanceof Error && requestError.name === "AbortError")
        ) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "Nie udało się odczytać danych MongoDB.",
          );
        }
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [center]);

  async function createRecord(
    event: FormEvent<HTMLFormElement>,
    collection: ManagedCollection,
  ) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const payload: Record<string, string | number> = {};
    for (const [key, value] of formData.entries()) {
      if (typeof value !== "string" || value.trim() === "") continue;
      const field = fields[collection]?.find((item) => item.key === key);
      payload[key] =
        field?.type === "number" ? Number(value) : value.trim();
    }

    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/management/${collection}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const result: unknown = await response.json();
        const message =
          typeof result === "object" &&
          result !== null &&
          "error" in result &&
          typeof result.error === "string"
            ? result.error
            : "Nie udało się zapisać rekordu.";
        throw new Error(message);
      }
      form.reset();
      await load();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Nie udało się zapisać rekordu.",
      );
      setBusy(false);
    }
  }

  async function archiveRecord(collection: ManagedCollection, id: string) {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/management/${collection}?id=${encodeURIComponent(id)}`,
        { method: "DELETE" },
      );
      if (!response.ok) {
        const result: unknown = await response.json();
        const message =
          typeof result === "object" &&
          result !== null &&
          "error" in result &&
          typeof result.error === "string"
            ? result.error
            : "Nie udało się zarchiwizować rekordu.";
        throw new Error(message);
      }
      await load();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Nie udało się zarchiwizować rekordu.",
      );
      setBusy(false);
    }
  }

  if (collections.length === 0) return null;

  return (
    <section className="border-t border-slate-100 p-5 sm:px-6">
      <header className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h4 className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
            Dane MongoDB
          </h4>
          <p className="mt-1 text-[9px] text-slate-400">
            {collections
              .map((collection) => collectionLabels[collection])
              .join(" · ")}
          </p>
        </div>
        <button
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-[10px] font-semibold text-slate-600 disabled:opacity-50"
          disabled={busy}
          onClick={() => void load()}
          type="button"
        >
          Odśwież dane
        </button>
      </header>

      {error && (
        <p
          className="mb-3 rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-[10px] text-rose-700"
          role="alert"
        >
          {error}
        </p>
      )}

      <div className="space-y-5">
        {collections.map((collection) => {
          const items = records[collection] ?? [];
          const editable = fields[collection] !== undefined;
          return (
            <section className="rounded-lg border border-slate-100" key={collection}>
              <header className="flex items-center justify-between border-b border-slate-100 px-3 py-2.5">
                <h5 className="text-[11px] font-semibold text-slate-700">
                  {collectionLabels[collection]}
                </h5>
                <span className="text-[9px] text-slate-400">
                  {items.length} rekordów · limit 20
                </span>
              </header>

              {editable && (
                <form
                  className="grid gap-2 border-b border-slate-100 p-3 sm:grid-cols-2"
                  onSubmit={(event) => void createRecord(event, collection)}
                >
                  {fields[collection]?.map((field) => (
                    <label className="block" key={field.key}>
                      <span className="mb-1 block text-[9px] font-medium text-slate-500">
                        {field.label}
                      </span>
                      <input
                        className="w-full rounded-md border border-slate-200 px-2.5 py-2 text-[10px] outline-none focus:border-indigo-400"
                        maxLength={10_000}
                        name={field.key}
                        required={
                          ["name", "title"].includes(field.key) &&
                          ["companies", "crm_contacts", "leads", "products", "stores", "marketplace_ads"].includes(collection)
                        }
                        step={field.type === "number" ? "any" : undefined}
                        type={field.type ?? "text"}
                      />
                    </label>
                  ))}
                  <button
                    className="rounded-md bg-indigo-600 px-3 py-2 text-[10px] font-semibold text-white disabled:opacity-50 sm:col-span-2"
                    disabled={busy}
                    type="submit"
                  >
                    Dodaj rekord
                  </button>
                </form>
              )}

              {items.length > 0 ? (
                <ul className="divide-y divide-slate-50">
                  {items.map((item) => (
                    <li
                      className="flex items-start justify-between gap-3 px-3 py-2.5"
                      key={item._id}
                    >
                      <div className="min-w-0">
                        <p className="truncate text-[10px] font-semibold text-slate-700">
                          {String(item.name ?? item.title ?? item.agentId ?? item.provider ?? item.action ?? item.key ?? item._id)}
                        </p>
                        <p className="mt-0.5 truncate font-mono text-[9px] text-slate-400">
                          {String(item.status ?? item.type ?? item.email ?? item.createdAt ?? item._id)}
                        </p>
                      </div>
                      {editable && (
                        <button
                          className="shrink-0 rounded border border-slate-200 px-2 py-1 text-[9px] font-semibold text-slate-500 hover:border-rose-200 hover:text-rose-700 disabled:opacity-50"
                          disabled={busy}
                          onClick={() => void archiveRecord(collection, item._id)}
                          type="button"
                        >
                          Archiwizuj
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-3 py-4 text-center text-[10px] text-slate-400">
                  {busy ? "Odczytuję…" : "Brak rekordów lub kolekcja nie jest jeszcze skonfigurowana."}
                </p>
              )}
            </section>
          );
        })}
      </div>
    </section>
  );
}
