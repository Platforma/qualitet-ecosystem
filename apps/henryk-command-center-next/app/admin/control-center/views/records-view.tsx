"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type RecordItem = Record<string, unknown> & { _id: string };

export default function RecordsView({
  collection,
  title,
}: {
  collection: "companies" | "products";
  title: string;
}) {
  const [items, setItems] = useState<RecordItem[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setError("");
    setLoading(true);
    try {
      const response = await fetch(`/api/management/${collection}?limit=50`, { cache: "no-store" });
      const result = (await response.json()) as { items?: RecordItem[]; error?: string };
      if (!response.ok) throw new Error(result.error || `Nie udało się pobrać: ${title}.`);
      setItems(result.items ?? []);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : `Błąd odczytu ${title.toLowerCase()}.`);
    } finally {
      setLoading(false);
    }
  }, [collection, title]);

  useEffect(() => {
    void Promise.resolve().then(refresh);
  }, [refresh]);

  return (
    <section className="space-y-4">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div><h2 className="text-2xl font-bold">{title}</h2><p className="mt-1 text-sm text-slate-600">Podgląd rekordów w nowej strefie właściciela. Edycja pozostaje w dotychczasowym panelu.</p></div>
        <div className="flex flex-wrap gap-2">
          <button className="min-h-11 rounded-xl border border-slate-300 px-4 text-sm font-semibold" onClick={() => void refresh()} type="button">Odśwież</button>
          <Link className="inline-flex min-h-11 items-center rounded-xl bg-emerald-700 px-4 text-sm font-semibold text-white" href={collection === "companies" ? "/admin/companies" : "/portal/market"}>Otwórz obecny widok</Link>
        </div>
      </header>
      {error && <p className="break-words rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900" role="alert">{error}</p>}
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <li className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4" key={item._id}>
            <h3 className="break-words font-semibold">{String(item.name ?? "Bez nazwy")}</h3>
            <p className="mt-1 break-words text-sm text-slate-600">{collection === "companies" ? String(item.email ?? item.website ?? "Brak danych kontaktowych") : `SKU: ${String(item.sku ?? "—")} · cena: ${String(item.price ?? "—")} ${String(item.currency ?? "")}`}</p>
            <span className="mt-3 inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700">Status: {String(item.status ?? "—")}</span>
          </li>
        ))}
        {!loading && !error && items.length === 0 && <li className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-600">Brak rekordów.</li>}
        {loading && <li className="text-sm text-slate-600">Ładowanie rekordów…</li>}
      </ul>
    </section>
  );
}
