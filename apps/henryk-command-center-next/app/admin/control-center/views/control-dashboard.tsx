"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type Integration = { id: string; label: string; configured: boolean; checkStatus: string | null };
type Module = { id: string; label: string; description: string; state: string; requirements: string[]; href?: string };
type Metric = { label: string; total: number; today: number };
type DashboardData = {
  integrations: Integration[];
  modules: Module[];
  metrics: Metric[];
};

const shortcuts = [
  ["Setup", "/admin/control-center/setup"],
  ["Integracje", "/admin/control-center/integrations"],
  ["Checklista", "/admin/control-center/checklist"],
  ["Deploy", "/admin/control-center/deploy"],
  ["Roadmapa", "/admin/control-center/roadmap"],
  ["AI Memory", "/admin/control-center/ai-memory"],
  ["Prompty", "/admin/control-center/prompts"],
  ["Firmy", "/admin/control-center/companies"],
  ["Produkty", "/admin/control-center/products"],
  ["Partnerzy", "/admin/control-center/partners"],
];

export default function ControlDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setError("");
    try {
      const [setupResponse, automationResponse] = await Promise.all([
        fetch("/api/admin/setup", { cache: "no-store" }),
        fetch("/api/admin/automation", { cache: "no-store" }),
      ]);
      const [setup, automation] = (await Promise.all([
        setupResponse.json(),
        automationResponse.json(),
      ])) as [
        { integrations?: Integration[]; error?: string },
        { modules?: Module[]; metrics?: Metric[]; error?: string },
      ];
      if (!setupResponse.ok) throw new Error(setup.error || "Nie udało się odczytać konfiguracji.");
      if (!automationResponse.ok) throw new Error(automation.error || "Nie udało się odczytać dashboardu.");
      setData({
        integrations: setup.integrations ?? [],
        modules: automation.modules ?? [],
        metrics: automation.metrics ?? [],
      });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Błąd odczytu dashboardu.");
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(refresh);
  }, [refresh]);

  const configured = data?.integrations.filter((item) => item.configured).length ?? 0;
  const connected = data?.integrations.filter((item) => item.checkStatus === "connected").length ?? 0;
  const readyModules = data?.modules.filter((item) => item.state === "ready").length ?? 0;

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-800">QUALITET · Owner Control Center</p>
          <h2 className="mt-1 text-2xl font-bold sm:text-3xl">Dashboard Właściciela</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Szybki podgląd gotowości projektu i skróty do zadań właściciela.
          </p>
        </div>
        <button className="min-h-11 rounded-xl border border-slate-300 px-4 text-sm font-semibold" onClick={() => void refresh()} type="button">
          Odśwież status
        </button>
      </header>

      {error && <p className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900" role="alert">{error}</p>}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Integracje zapisane" value={data ? `${configured}/${data.integrations.length}` : "—"} />
        <Stat label="Połączenia potwierdzone" value={data ? `${connected}/${data.integrations.length}` : "—"} />
        <Stat label="Moduły gotowe" value={data ? `${readyModules}/${data.modules.length}` : "—"} />
        <Stat label="Rekordy projektowe" value={data ? data.metrics.reduce((sum, item) => sum + item.total, 0).toLocaleString("pl-PL") : "—"} />
      </div>

      <section>
        <h3 className="mb-3 text-lg font-semibold">Strefy właściciela</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {shortcuts.map(([label, href]) => (
            <Link className="flex min-h-16 items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-900 shadow-sm hover:border-emerald-300" href={href} key={href}>
              <span>{label}</span><span aria-hidden="true">→</span>
            </Link>
          ))}
          <Link className="flex min-h-16 items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-900 shadow-sm hover:border-emerald-300" href="/admin/control-center/automation">
            Automatyzacje <span aria-hidden="true">→</span>
          </Link>
          <Link className="flex min-h-16 items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-900 shadow-sm hover:border-emerald-300" href="/admin/control-center/reports">
            Raporty <span aria-hidden="true">→</span>
          </Link>
        </div>
      </section>

      {data && (
        <section>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold">Co wymaga uwagi</h3>
            <Link className="inline-flex min-h-11 items-center font-semibold text-emerald-800" href="/admin/control-center/checklist">Pełna checklista →</Link>
          </div>
          <ul className="space-y-2">
            {data.integrations.filter((item) => !item.configured || item.checkStatus !== "connected").slice(0, 5).map((item) => (
              <li className="flex flex-col gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 sm:flex-row sm:items-center sm:justify-between" key={item.id}>
                <span className="text-sm font-medium">{item.label}: {!item.configured ? "brak konfiguracji" : "wymaga testu połączenia"}</span>
                <Link className="inline-flex min-h-10 items-center text-sm font-semibold text-emerald-900" href="/admin/control-center/setup">Skonfiguruj</Link>
              </li>
            ))}
            {data.integrations.every((item) => item.configured && item.checkStatus === "connected") && (
              <li className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-900">Wszystkie skonfigurowane integracje mają potwierdzone połączenie.</li>
            )}
          </ul>
        </section>
      )}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <article className="min-w-0 rounded-2xl border border-slate-200 bg-white p-3 sm:p-4">
      <p className="text-xs leading-5 text-slate-600">{label}</p>
      <p className="mt-1 break-words text-xl font-bold sm:text-2xl">{value}</p>
    </article>
  );
}
