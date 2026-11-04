"use client";

import { useCallback, useEffect, useState } from "react";

type Metric = { label: string; total: number; today: number };
type Report = { id: string; title: string; createdAt: string; metrics: Metric[] };
type ReportsData = { reports: Report[]; metrics: Metric[] };

export default function ReportsView() {
  const [data, setData] = useState<ReportsData | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    setError("");
    try {
      const response = await fetch("/api/admin/automation", { cache: "no-store" });
      const result = (await response.json()) as ReportsData & { error?: string };
      if (!response.ok) throw new Error(result.error || "Nie udało się pobrać raportów.");
      setData(result);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Błąd raportów.");
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(refresh);
  }, [refresh]);

  async function generate() {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/admin/automation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate-daily-report" }),
      });
      const result = (await response.json()) as { error?: string; title?: string };
      if (!response.ok) throw new Error(result.error || "Nie udało się wygenerować raportu.");
      setNotice(`Zapisano raport: ${result.title ?? "Raport dzienny"}.`);
      await refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Generowanie raportu nie powiodło się.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div><h2 className="text-2xl font-bold">Raporty</h2><p className="mt-1 text-sm text-slate-600">Raport dzienny i liczniki danych pobierane z istniejącego centrum automatyzacji.</p></div>
        <button className="min-h-12 rounded-xl bg-emerald-700 px-5 font-semibold text-white disabled:opacity-50" disabled={busy} onClick={() => void generate()} type="button">{busy ? "Generowanie…" : "Generuj raport dzienny"}</button>
      </header>
      {error && <p className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900" role="alert">{error}</p>}
      {notice && <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900" role="status">{notice}</p>}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {(data?.metrics ?? []).map((metric) => (
          <article className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4" key={metric.label}>
            <p className="text-sm text-slate-600">{metric.label}</p>
            <p className="mt-1 text-2xl font-bold">{metric.total.toLocaleString("pl-PL")}</p>
            <p className="text-xs text-slate-500">Dzisiaj: {metric.today.toLocaleString("pl-PL")}</p>
          </article>
        ))}
        {!data && !error && <p className="text-sm text-slate-600">Ładowanie statystyk…</p>}
      </div>
      <section>
        <h3 className="mb-3 text-lg font-semibold">Ostatnie raporty</h3>
        <ul className="space-y-2">
          {(data?.reports ?? []).map((report) => (
            <li className="rounded-xl border border-slate-200 bg-white p-4" key={report.id}>
              <p className="font-semibold">{report.title}</p>
              <p className="mt-1 text-sm text-slate-600">{new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium", timeStyle: "short" }).format(new Date(report.createdAt))}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {(report.metrics ?? []).map((metric) => <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs text-slate-700" key={metric.label}>{metric.label}: {metric.total}</span>)}
              </div>
            </li>
          ))}
          {data?.reports.length === 0 && <li className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-600">Nie ma jeszcze raportów.</li>}
        </ul>
      </section>
    </section>
  );
}
