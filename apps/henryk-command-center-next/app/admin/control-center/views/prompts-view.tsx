"use client";

import { useCallback, useEffect, useState } from "react";

type PromptFile = { path: string; size: number; modifiedAt?: string };

export default function PromptsView() {
  const [prompts, setPrompts] = useState<PromptFile[]>([]);
  const [selectedPath, setSelectedPath] = useState("");
  const [content, setContent] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [testResult, setTestResult] = useState("");

  const loadPrompts = useCallback(async () => {
    setError("");
    try {
      const response = await fetch("/api/owner/settings/prompts", { cache: "no-store" });
      const result = (await response.json()) as { prompts?: PromptFile[]; error?: string };
      if (!response.ok) throw new Error(result.error || "Nie udało się pobrać promptów.");
      setPrompts(result.prompts ?? []);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Błąd pobierania promptów.");
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(loadPrompts);
  }, [loadPrompts]);

  async function openPrompt(path: string) {
    setSelectedPath(path);
    setContent("");
    setError("");
    setNotice("");
    setTestResult("");
    try {
      const response = await fetch(`/api/owner/settings/prompts?path=${encodeURIComponent(path)}`, { cache: "no-store" });
      const result = (await response.json()) as { content?: string; error?: string };
      if (!response.ok) throw new Error(result.error || "Nie udało się otworzyć promptu.");
      setContent(result.content ?? "");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Błąd odczytu promptu.");
    }
  }

  async function runAction(action: "save" | "test") {
    if (!selectedPath) return;
    setBusy(true);
    setError("");
    setNotice("");
    setTestResult("");
    try {
      const response = await fetch("/api/owner/settings/prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, path: selectedPath, content }),
      });
      const result = (await response.json()) as { error?: string; result?: string };
      if (!response.ok) throw new Error(result.error || `Nie udało się ${action === "save" ? "zapisać" : "przetestować"} promptu.`);
      if (action === "save") setNotice("Prompt zapisany.");
      else setTestResult(result.result ?? "Test zakończony.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Operacja promptu nie powiodła się.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-4">
      <header><h2 className="text-2xl font-bold">Prompty AI</h2><p className="mt-1 text-sm leading-6 text-slate-600">Przeglądaj, edytuj i testuj prompty z istniejącego Owner Settings.</p></header>
      {error && <p className="break-words rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900" role="alert">{error}</p>}
      {notice && <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900" role="status">{notice}</p>}
      {testResult && <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-950" role="status">{testResult}</pre>}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_2fr]">
        <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4">
          <h3 className="font-semibold">Pliki promptów</h3>
          <ul className="mt-3 space-y-2">
            {prompts.map((prompt) => (
              <li key={prompt.path}>
                <button className={`min-h-11 w-full break-all rounded-xl px-3 py-2 text-left text-sm ${selectedPath === prompt.path ? "bg-emerald-100 font-semibold text-emerald-950" : "bg-slate-50 text-slate-800"}`} onClick={() => void openPrompt(prompt.path)} type="button">
                  {prompt.path}
                </button>
              </li>
            ))}
            {prompts.length === 0 && <li className="text-sm text-slate-600">Brak promptów lub trwa ładowanie…</li>}
          </ul>
        </section>
        <section className="min-w-0 space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
          <h3 className="break-all font-semibold">{selectedPath || "Wybierz prompt"}</h3>
          <textarea
            className="min-h-72 w-full min-w-0 resize-y rounded-xl border border-slate-300 p-3 font-mono text-sm leading-6 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
            disabled={!selectedPath || busy}
            onChange={(event) => setContent(event.target.value)}
            value={content}
          />
          <div className="flex flex-col gap-2 sm:flex-row">
            <button className="min-h-12 flex-1 rounded-xl bg-emerald-700 px-4 font-semibold text-white disabled:opacity-50" disabled={!selectedPath || busy} onClick={() => void runAction("save")} type="button">{busy ? "Przetwarzanie…" : "Zapisz prompt"}</button>
            <button className="min-h-12 flex-1 rounded-xl border border-slate-300 px-4 font-semibold disabled:opacity-50" disabled={!selectedPath || busy} onClick={() => void runAction("test")} type="button">Testuj z Ollama</button>
          </div>
        </section>
      </div>
    </section>
  );
}
