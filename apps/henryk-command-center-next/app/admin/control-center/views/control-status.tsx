"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type Integration = {
  id: string;
  label: string;
  configured: boolean;
  fields: { key: string; label: string; configured: boolean }[];
  checkStatus: "connected" | "unavailable" | null;
  checkMessage: string | null;
  checkedAt: string | null;
};

const labels = [
  ["mongodb", "MongoDB"],
  ["render", "Render"],
  ["cloudflare", "Cloudflare"],
  ["discord", "Discord"],
  ["stripe", "Stripe"],
  ["facebook", "Facebook"],
  ["tiktok", "TikTok"],
  ["youtube", "YouTube"],
  ["metaAds", "Meta"],
  ["ollama", "Ollama"],
] as const;

export default function ControlStatus({ mode }: { mode: "integrations" | "checklist" }) {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setError("");
    try {
      const response = await fetch("/api/admin/setup", { cache: "no-store" });
      const result = (await response.json()) as { integrations?: Integration[]; error?: string };
      if (!response.ok) throw new Error(result.error || "Nie udało się odczytać integracji.");
      setIntegrations(result.integrations ?? []);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Błąd odczytu.");
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(refresh);
  }, [refresh]);

  const getIntegration = (id: string) => integrations.find((item) => item.id === id);
  const configuredCount = integrations.filter((item) => item.configured).length;

  return (
    <section className="space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold">{mode === "checklist" ? "Checklista właściciela" : "Integracje"}</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            {mode === "checklist" ? "Status konfiguracji i wymagane pola, bez zmieniania istniejącego panelu." : "Konfiguracje zapisane w MongoDB i wyniki ich testów."}
          </p>
        </div>
        <button className="min-h-11 rounded-xl border border-slate-300 px-4 text-sm font-semibold" onClick={() => void refresh()} type="button">Odśwież</button>
      </header>

      {error && <p className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900" role="alert">{error}</p>}
      {mode === "checklist" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-600">Konfiguracje zapisane</p>
          <p className="mt-1 text-2xl font-bold">{integrations.length ? `${configuredCount}/${integrations.length}` : "—"}</p>
        </div>
      )}

      <ul className="grid gap-3 lg:grid-cols-2">
        {labels.map(([id, label]) => {
          const item = getIntegration(id);
          const missing = item?.configured ? [] : item?.fields.filter((field) => !field.configured) ?? [];
          const connected = item?.checkStatus === "connected";
          return (
            <li className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5" key={id}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <h3 className="font-semibold">{label}</h3>
                  {missing.length > 0 && <p className="mt-2 break-words text-sm text-amber-800">Do uzupełnienia: {missing.map((field) => field.label).join(", ")}</p>}
                  {item?.checkMessage && <p className="mt-2 break-words text-sm text-slate-600">{item.checkMessage}</p>}
                </div>
                <span className={`inline-flex min-h-9 shrink-0 items-center rounded-full px-3 text-sm font-semibold ${connected ? "bg-emerald-100 text-emerald-900" : item?.configured ? "bg-amber-100 text-amber-900" : "bg-rose-50 text-rose-900"}`}>
                  {connected ? "✅ Test OK" : item?.configured ? "🟡 Do testu" : "❌ Brak"}
                </span>
              </div>
              <Link className="mt-3 inline-flex min-h-11 items-center font-semibold text-emerald-800" href="/admin/control-center/setup">Otwórz setup →</Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
