"use client";

import { useCallback, useEffect, useState } from "react";

type IntegrationField = {
  key: string;
  label: string;
  type: "password" | "text" | "url";
  secret: boolean;
  value: string;
  configured: boolean;
};

type Integration = {
  id: string;
  label: string;
  configured: boolean;
  fields: IntegrationField[];
  checkStatus: "connected" | "unavailable" | null;
  checkMessage: string | null;
  checkedAt: string | null;
};

type SetupResponse = { integrations: Integration[]; error?: string };

export default function OwnerSetup() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const refresh = useCallback(async () => {
    setError("");
    try {
      const response = await fetch("/api/admin/setup", { cache: "no-store" });
      const result = (await response.json()) as SetupResponse;
      if (!response.ok) throw new Error(result.error || "Nie udało się pobrać konfiguracji.");
      setIntegrations(result.integrations);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Błąd połączenia.");
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(refresh);
  }, [refresh]);

  function updateField(provider: string, key: string, value: string) {
    setIntegrations((current) =>
      current.map((integration) =>
        integration.id === provider
          ? {
              ...integration,
              fields: integration.fields.map((field) =>
                field.key === key ? { ...field, value } : field,
              ),
            }
          : integration,
      ),
    );
  }

  async function save(integration: Integration) {
    setBusy(`${integration.id}:save`);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/admin/setup", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: integration.id,
          values: Object.fromEntries(
            integration.fields.map((field) => [field.key, field.value]),
          ),
        }),
      });
      const result = (await response.json()) as { error?: string; message?: string };
      if (!response.ok) throw new Error(result.error || "Nie udało się zapisać ustawień.");
      setNotice(result.message || "Konfiguracja zapisana.");
      await refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Błąd zapisu.");
    } finally {
      setBusy("");
    }
  }

  async function test(integration: Integration) {
    setBusy(`${integration.id}:test`);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/admin/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "test", provider: integration.id }),
      });
      const result = (await response.json()) as { error?: string; message?: string };
      if (!response.ok) throw new Error(result.error || "Test integracji nie powiódł się.");
      setNotice(result.message || "Test zakończony powodzeniem.");
      await refresh();
    } catch (requestError) {
      await refresh();
      setError(requestError instanceof Error ? requestError.message : "Test integracji nie powiódł się.");
    } finally {
      setBusy("");
    }
  }

  async function deployRender() {
    setBusy("render:deploy");
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/owner/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "render-deploy" }),
      });
      const result = (await response.json()) as { error?: string; result?: string };
      if (!response.ok) throw new Error(result.error || "Nie udało się uruchomić deployu.");
      setNotice(result.result || "Deploy Render uruchomiony.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Deploy nie powiódł się.");
    } finally {
      setBusy("");
    }
  }

  async function remove(integration: Integration) {
    if (!window.confirm(`Usunąć zapisane dane ${integration.label}?`)) return;
    setBusy(`${integration.id}:remove`);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/admin/setup?provider=${encodeURIComponent(integration.id)}`, {
        method: "DELETE",
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error || "Nie udało się usunąć konfiguracji.");
      setNotice(`Usunięto konfigurację: ${integration.label}.`);
      await refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Błąd usuwania.");
    } finally {
      setBusy("");
    }
  }

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
          Owner Studio · konfiguracja mobilna
        </p>
        <h1 className="text-3xl font-semibold">Konfiguracja projektu</h1>
        <p className="max-w-3xl text-sm leading-6 text-slate-600">
          Poświadczenia integracji są szyfrowane przed zapisem w MongoDB kluczem
          opartym na SESSION_SECRET. Puste pole sekretu zachowuje aktualną wartość.
          URI MongoDB można przetestować i zapisać tutaj; start aplikacji nadal
          wymaga bootstrapowego połączenia i stabilnego SESSION_SECRET w ustawieniach hostingu.
        </p>
      </header>

      {error && <p className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900" role="alert">{error}</p>}
      {notice && <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900" role="status">{notice}</p>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {integrations.map((integration) => {
          const saving = busy === `${integration.id}:save`;
          const testing = busy === `${integration.id}:test`;
          const deploying = busy === "render:deploy";
          return (
            <form
              className="min-w-0 space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
              key={integration.id}
              onSubmit={(event) => {
                event.preventDefault();
                void save(integration);
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-lg font-semibold">{integration.label}</h2>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${integration.checkStatus === "connected" ? "bg-emerald-100 text-emerald-800" : integration.configured ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-600"}`}>
                  {integration.checkStatus === "connected" ? "Połączono" : integration.configured ? "Do testu" : "Brak konfiguracji"}
                </span>
              </div>
              {integration.fields.map((field) => (
                <label className="block min-w-0 space-y-1.5 text-sm font-medium text-slate-700" key={field.key}>
                  <span>{field.label}{field.secret && field.configured ? " · zapisano" : ""}</span>
                  <input
                    autoComplete="off"
                    className="min-h-12 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 text-base text-slate-950 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
                    onChange={(event) => updateField(integration.id, field.key, event.target.value)}
                    placeholder={field.secret && field.configured ? "Zapisany sekret — zostaw puste, aby zachować" : ""}
                    type={field.type}
                    value={field.value}
                  />
                </label>
              ))}
              {integration.checkMessage && <p className="text-xs leading-5 text-slate-600">{integration.checkMessage}</p>}
              <div className="flex flex-wrap gap-2">
                <button className="min-h-11 flex-1 rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" disabled={Boolean(busy)} type="submit">
                  {saving ? "Zapisywanie…" : "Zapisz"}
                </button>
                <button className="min-h-11 flex-1 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 disabled:opacity-50" disabled={Boolean(busy) || !integration.configured} onClick={() => void test(integration)} type="button">
                  {testing ? "Testuję…" : "TEST"}
                </button>
                {integration.id === "render" && (
                  <button className="min-h-11 w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" disabled={Boolean(busy) || !integration.configured} onClick={() => void deployRender()} type="button">
                    {deploying ? "Uruchamianie…" : "DEPLOY"}
                  </button>
                )}
                {integration.configured && (
                  <button className="min-h-11 w-full rounded-xl px-4 py-2 text-sm font-medium text-rose-700 disabled:opacity-50" disabled={Boolean(busy)} onClick={() => void remove(integration)} type="button">
                    Usuń konfigurację
                  </button>
                )}
              </div>
            </form>
          );
        })}
        {integrations.length === 0 && !error && <p className="text-sm text-slate-600">Ładowanie konfiguracji…</p>}
      </div>
    </section>
  );
}
