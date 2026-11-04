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

type OverviewResponse = {
  integrations: Integration[];
  database: { connected: boolean };
  error?: string;
};

type OverviewMode = "integrations" | "checklist" | "system";

const checklistLabels = [
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

const descriptions: Record<string, string> = {
  mongodb: "Dane i pamięć aplikacji; URI wymaga bootstrapowego połączenia i restartu po zmianie.",
  render: "Status usługi oraz ręczne uruchamianie wdrożenia.",
  cloudflare: "Weryfikacja tokenu API Cloudflare.",
  discord: "Bot lub webhook powiadomień.",
  stripe: "Klucz API; uruchomienie płatności wymaga osobnego checkoutu i webhooków.",
  facebook: "Token i identyfikator strony Facebook.",
  tiktok: "Token API konta TikTok.",
  youtube: "Google OAuth dla kanału YouTube.",
  metaAds: "Token i identyfikator konta reklamowego.",
  ollama: "Adres API i test dostępności runtime.",
};

export default function OwnerOverview({ mode }: { mode: OverviewMode }) {
  const [data, setData] = useState<OverviewResponse | null>(null);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setError("");
    try {
      const response = await fetch("/api/admin/setup", { cache: "no-store" });
      const result = (await response.json()) as OverviewResponse;
      if (!response.ok) throw new Error(result.error || "Nie udało się odczytać statusów.");
      setData(result);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Błąd odczytu.");
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(refresh);
  }, [refresh]);

  const integrations = data?.integrations ?? [];
  const configuredCount = integrations.filter((item) => item.configured).length;
  const getIntegration = (id: string) => integrations.find((item) => item.id === id);
  const title = mode === "integrations" ? "Integracje" : mode === "checklist" ? "Checklist uruchomienia" : "Status systemu";

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">QUALITET · Owner Control Center</p>
        <h1 className="text-3xl font-semibold">{title}</h1>
        <p className="max-w-3xl text-sm leading-6 text-slate-600">
          {mode === "checklist"
            ? "Zobacz, co jest gotowe, co wymaga konfiguracji i które dane musisz jeszcze uzupełnić."
            : mode === "system"
              ? "Status aplikacji, usług zewnętrznych oraz elementów wymagających ręcznej konfiguracji."
              : "Poświadczenia przechowywane są zaszyfrowane w MongoDB. Test połączenia jest osobnym krokiem od samego zapisu."}
        </p>
        <button
          className="mt-2 inline-flex min-h-11 items-center rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-800"
          onClick={() => void refresh()}
          type="button"
        >
          Odśwież status
        </button>
      </header>

      {error && <p className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900" role="alert">{error}</p>}
      {!data && !error && <p className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">Odczytuję statusy…</p>}

      {mode === "checklist" && data && (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <SummaryCard label="Skonfigurowane" value={configuredCount} tone="green" />
            <SummaryCard label="Brakujące" value={integrations.length - configuredCount} tone="amber" />
            <SummaryCard label="Integracje" value={integrations.length} tone="slate" />
          </div>
          <ul className="space-y-3">
            {checklistLabels.map(([id, label]) => {
              const integration = getIntegration(id);
              const missing = integration?.configured
                ? []
                : integration?.fields.filter((field) => !field.configured) ?? [];
              const connected = integration?.checkStatus === "connected";
              return (
                <li className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5" key={id}>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <h2 className="font-semibold">{label}</h2>
                      <p className="mt-1 text-sm leading-5 text-slate-600">{descriptions[id]}</p>
                      {missing.length > 0 && (
                        <p className="mt-2 text-sm text-amber-800">Do uzupełnienia: {missing.map((field) => field.label).join(", ")}</p>
                      )}
                      {integration?.checkMessage && <p className="mt-2 text-sm text-slate-600">{integration.checkMessage}</p>}
                    </div>
                    <span className={`inline-flex min-h-9 shrink-0 items-center rounded-full px-3 text-sm font-semibold ${connected ? "bg-emerald-100 text-emerald-800" : integration?.configured ? "bg-amber-100 text-amber-900" : "bg-rose-50 text-rose-800"}`}>
                      {connected ? "✅ Skonfigurowane · test OK" : integration?.configured ? "🟡 Zapisane · wymaga testu" : "❌ Brakujące"}
                    </span>
                  </div>
                  <Link className="mt-3 inline-flex min-h-11 items-center font-semibold text-emerald-800 underline-offset-4 hover:underline" href="/admin/setup">Otwórz konfigurację</Link>
                </li>
              );
            })}
          </ul>
        </>
      )}

      {mode === "integrations" && data && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {integrations.map((integration) => (
            <article className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5" key={integration.id}>
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-semibold">{integration.label}</h2>
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${integration.checkStatus === "connected" ? "bg-emerald-100 text-emerald-800" : integration.configured ? "bg-amber-100 text-amber-900" : "bg-rose-50 text-rose-800"}`}>
                  {integration.checkStatus === "connected" ? "Połączono" : integration.configured ? "Do testu" : "Brak konfiguracji"}
                </span>
              </div>
              <p className="mt-3 text-sm text-slate-600">{integration.checkMessage || (integration.configured ? "Zapisano ustawienia. Uruchom test połączenia." : "Uzupełnij wymagane dane w konfiguracji.")}</p>
              <Link className="mt-3 inline-flex min-h-11 items-center font-semibold text-emerald-800" href="/admin/setup">Konfiguruj →</Link>
            </article>
          ))}
        </div>
      )}

      {mode === "system" && data && (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <SummaryCard label="Owner Studio" value="Dostępne" tone="green" />
            <SummaryCard label="Połączenie MongoDB" value={data.database.connected ? "Dostępne" : "Niedostępne"} tone={data.database.connected ? "green" : "amber"} />
            <SummaryCard label="Integracje skonfigurowane" value={`${configuredCount}/${integrations.length}`} tone="slate" />
            <SummaryCard label="Połączenia potwierdzone" value={integrations.filter((item) => item.checkStatus === "connected").length} tone="green" />
          </div>
          <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
            <h2 className="text-lg font-semibold">Wymaga założenia lub weryfikacji</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-slate-700">
              <li>Utwórz konta i tokeny dostępu u dostawców wymienionych na checkliście.</li>
              <li>Ustaw bootstrapowe połączenie MongoDB i SESSION_SECRET w bezpiecznej konfiguracji hostingu; nie przechowuj ich w plikach .env.</li>
              <li>Po zmianie URI MongoDB uruchom ponownie aplikację, by zastosować nowe połączenie.</li>
              <li>DNS, TLS, backupy oraz dostępność usług produkcyjnych wymagają osobnego testu.</li>
              <li>Stripe jest konfigurowany tutaj, ale checkout i obsługa webhooków nie są jeszcze gotowe.</li>
            </ul>
            <Link className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-emerald-700 px-4 font-semibold text-white" href="/admin/checklist">Otwórz checklistę</Link>
          </section>
        </>
      )}
    </section>
  );
}

function SummaryCard({ label, value, tone }: { label: string; value: string | number; tone: "green" | "amber" | "slate" }) {
  const colors = {
    green: "border-emerald-200 bg-emerald-50",
    amber: "border-amber-200 bg-amber-50",
    slate: "border-slate-200 bg-white",
  };
  return (
    <article className={`rounded-2xl border p-4 ${colors[tone]}`}>
      <p className="text-sm text-slate-600">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </article>
  );
}
