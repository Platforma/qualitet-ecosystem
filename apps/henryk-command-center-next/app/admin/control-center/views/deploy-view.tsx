"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type DeployData = {
  render?: {
    configured: boolean;
    service: { name?: string; serviceType?: string; suspended?: boolean; dashboardUrl?: string } | null;
  };
  github?: { configured: boolean; repository: string; workflowConfigured: boolean; latestRun: { name?: string; status?: string; conclusion?: string | null; htmlUrl?: string } | null };
  errors?: string[];
  error?: string;
};

export default function DeployView() {
  const [data, setData] = useState<DeployData | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    setError("");
    try {
      const response = await fetch("/api/owner/deploy", { cache: "no-store" });
      const result = (await response.json()) as DeployData;
      if (!response.ok) throw new Error(result.error || "Nie udało się odczytać statusu deploy.");
      setData(result);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Błąd odczytu deploy.");
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(refresh);
  }, [refresh]);

  async function deploy() {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/owner/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "render-deploy" }),
      });
      const result = (await response.json()) as { error?: string; result?: string };
      if (!response.ok) throw new Error(result.error || "Deploy nie powiódł się.");
      setNotice(result.result || "Deploy Render uruchomiony.");
      await refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Deploy nie powiódł się.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div><h2 className="text-2xl font-bold">Deploy</h2><p className="mt-1 text-sm text-slate-600">Widok statusu i akcji wdrożeniowych; konfiguracja pozostaje w Setup.</p></div>
        <button className="min-h-11 rounded-xl border border-slate-300 px-4 text-sm font-semibold" onClick={() => void refresh()} type="button">Odśwież status</button>
      </header>
      {error && <p className="break-words rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900" role="alert">{error}</p>}
      {notice && <p className="break-words rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900" role="status">{notice}</p>}
      <article className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-semibold">Render</h3>
          <span className={`rounded-full px-3 py-1 text-sm font-semibold ${data?.render?.configured ? "bg-emerald-100 text-emerald-900" : "bg-amber-100 text-amber-900"}`}>
            {data?.render?.configured ? "Skonfigurowano" : "Wymaga konfiguracji"}
          </span>
        </div>
        {data?.render?.service && <p className="text-sm text-slate-700">Usługa: {data.render.service.name ?? "Render"} · typ: {data.render.service.serviceType ?? "—"}</p>}
        <p className="text-sm leading-6 text-slate-600">TEST i ustawienia RENDER_API_KEY, RENDER_SERVICE_ID oraz RENDER_DEPLOY_HOOK są dostępne w Setup.</p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button className="min-h-12 rounded-xl bg-slate-900 px-5 font-semibold text-white disabled:opacity-50 sm:flex-1" disabled={busy || !data?.render?.configured} onClick={() => void deploy()} type="button">{busy ? "Uruchamianie…" : "DEPLOY Render"}</button>
          <Link className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-300 px-5 font-semibold text-slate-800 sm:flex-1" href="/admin/control-center/setup#render">Ustawienia / TEST</Link>
        </div>
      </article>
      <article className="space-y-2 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
        <h3 className="font-semibold">GitHub Actions</h3>
        {data?.github ? (
          <>
            <p className="break-all text-sm text-slate-700">Repozytorium: {data.github.repository}</p>
            <p className="text-sm text-slate-600">{data.github.configured ? "Token skonfigurowany" : "Token wymaga konfiguracji"} · {data.github.workflowConfigured ? "Workflow skonfigurowany" : "Workflow wymaga konfiguracji"}</p>
            {data.github.latestRun && <p className="break-words text-sm text-slate-600">Ostatni workflow: {data.github.latestRun.name} · {data.github.latestRun.status} · {data.github.latestRun.conclusion ?? "w toku"}</p>}
          </>
        ) : <p className="text-sm text-slate-600">Ładowanie statusu…</p>}
        {data?.errors?.map((message) => <p className="break-words text-sm text-amber-800" key={message}>{message}</p>)}
      </article>
    </section>
  );
}
