"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type ModuleStatus = {
  id: string;
  label: string;
  description: string;
  state: "ready" | "needs-configuration" | "unavailable";
  requirements: string[];
  href?: string;
};

type Metric = { label: string; total: number; today: number };
type Report = {
  id: string;
  title: string;
  createdAt: string;
  metrics: Metric[];
};
type Activity = {
  action: string;
  status: string;
  createdAt: string;
  summary: string;
};
type DashboardData = {
  modules: ModuleStatus[];
  metrics: Metric[];
  reports: Report[];
  activity: Activity[];
};

const stateLabels = {
  ready: "Dane dostępne",
  "needs-configuration": "Brak konfiguracji",
  unavailable: "Moduł niedostępny",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pl-PL", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function AutomationCenter() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  const refresh = useCallback(async () => {
    setError("");
    try {
      const response = await fetch("/api/admin/automation", {
        cache: "no-store",
      });
      const result = (await response.json()) as DashboardData & {
        error?: string;
      };
      if (!response.ok) throw new Error(result.error || "Nie udało się pobrać danych.");
      setData(result);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Błąd połączenia.");
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(refresh);
  }, [refresh]);

  async function generateReport() {
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
      setError(requestError instanceof Error ? requestError.message : "Błąd połączenia.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
            QUALITET · tryb mobilny właściciela
          </p>
          <h1 className="mt-2 text-3xl font-semibold">Automation Center</h1>
          <p className="mt-2 max-w-3xl text-slate-600">
            Jedno miejsce do kontroli automatyzacji, danych i codziennych zadań.
            Moduły wymagające zewnętrznych usług pokazują stan konfiguracji zamiast
            udawać, że integracja jest aktywna.
          </p>
        </div>
        <button
          className="min-h-12 rounded-xl bg-emerald-700 px-5 py-3 font-semibold text-white hover:bg-emerald-600 disabled:cursor-wait disabled:opacity-60"
          disabled={busy}
          onClick={generateReport}
          type="button"
        >
          {busy ? "Generowanie raportu…" : "Generuj raport dzienny"}
        </button>
      </header>

      {error && (
        <p className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900" role="status">
          {notice}
        </p>
      )}

      <section aria-label="Statystyki ekosystemu" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {(data?.metrics ?? []).map((metric) => (
          <article className="rounded-2xl border border-slate-200 bg-white p-5" key={metric.label}>
            <p className="text-sm text-slate-600">{metric.label}</p>
            <p className="mt-2 text-3xl font-semibold">{metric.total.toLocaleString("pl-PL")}</p>
            <p className="mt-1 text-xs text-slate-500">
              Dzisiaj: {metric.today.toLocaleString("pl-PL")}
            </p>
          </article>
        ))}
        {!data && <p className="text-sm text-slate-500">Ładowanie statystyk…</p>}
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Moduły automatyzacji</h2>
            <p className="mt-1 text-sm text-slate-600">Status pochodzi z konfiguracji serwera i dostępnych modułów.</p>
          </div>
          <button className="min-h-11 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50" onClick={() => void refresh()} type="button">
            Odśwież
          </button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {(data?.modules ?? []).map((module) => (
            <article className="flex min-h-40 flex-col rounded-2xl border border-slate-200 bg-white p-5" key={module.id}>
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-semibold">{module.label}</h3>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs ${module.state === "ready" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                  {stateLabels[module.state]}
                </span>
              </div>
              <p className="mt-2 flex-1 text-sm text-slate-600">{module.description}</p>
              {module.requirements.length > 0 && module.state !== "ready" && (
                <p className="mt-3 text-xs text-slate-500">
                  Wymaga: {module.requirements.join(", ")}
                </p>
              )}
              {module.href && (
                <Link className="mt-4 inline-flex min-h-11 items-center font-medium text-emerald-700 hover:underline" href={module.href}>
                  Otwórz moduł <span aria-hidden="true" className="ml-1">→</span>
                </Link>
              )}
            </article>
          ))}
          {!data && <p className="text-sm text-slate-500">Ładowanie modułów…</p>}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-xl font-semibold">Ostatnie raporty</h2>
          <ul className="mt-4 divide-y divide-slate-200">
            {data?.reports.map((report) => (
              <li className="py-3" key={report.id}>
                <p className="font-medium">{report.title}</p>
                <p className="mt-1 text-sm text-slate-500">{formatDate(report.createdAt)}</p>
              </li>
            ))}
            {data?.reports.length === 0 && <li className="py-3 text-sm text-slate-500">Nie wygenerowano jeszcze raportów.</li>}
          </ul>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-xl font-semibold">Ostatnie działania</h2>
          <ul className="mt-4 divide-y divide-slate-200">
            {data?.activity.map((item, index) => (
              <li className="py-3" key={`${item.createdAt}-${index}`}>
                <div className="flex flex-wrap justify-between gap-2">
                  <p className="font-medium">{item.summary}</p>
                  <span className="text-xs text-slate-500">{item.status}</span>
                </div>
                <p className="mt-1 text-sm text-slate-500">{formatDate(item.createdAt)}</p>
              </li>
            ))}
            {data?.activity.length === 0 && <li className="py-3 text-sm text-slate-500">Brak zapisanych działań.</li>}
          </ul>
        </section>
      </div>

      <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
        Raport możesz uruchomić ręcznie. Automatyczny harmonogram, wysyłka mailingów,
        backup poza bazą i publikacja wymagają skonfigurowanych integracji oraz
        harmonogramu uruchomień — ten panel nie uruchamia ich po cichu.
      </p>
    </section>
  );
}
