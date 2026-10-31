"use client";

import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import Link from "next/link";

type SectionId = "prompts" | "system" | "mongodb" | "crm" | "marketplace" | "agents" | "files" | "integrations";
type Config = Record<"APP_NAME" | "DOMAIN" | "EMAIL" | "OWNER_EMAIL" | "OLLAMA_MODEL" | "OLLAMA_URL", string>;
type PromptFile = { path: string; size: number; modifiedAt?: string };
type Integration = {
  provider: string;
  status: string;
  displayName: string;
  accountName: string;
  endpoint: string;
  webhookUrl: string;
  publicKey: string;
  hasSecret: boolean;
};
type Agent = { _id: string; agentId: string; name: string; model: string; role: string; prompt: string; status: string };
type Snapshot = {
  config: Config;
  integrations: Integration[];
  agents: Agent[];
  database: { name: string; collections: string[] };
};
type ProjectFile = { path: string; size: number; modifiedAt: string };
type RecordRow = Record<string, unknown> & { _id: string };

const sections: { id: SectionId; title: string; mark: string }[] = [
  { id: "prompts", title: "AI Prompts", mark: "AI" },
  { id: "system", title: "System Config", mark: "SYS" },
  { id: "mongodb", title: "MongoDB", mark: "DB" },
  { id: "crm", title: "CRM", mark: "CRM" },
  { id: "marketplace", title: "Marketplace", mark: "MKT" },
  { id: "agents", title: "AI Agents", mark: "AG" },
  { id: "files", title: "Files Center", mark: "<>" },
  { id: "integrations", title: "Integrations", mark: "INT" },
];

const systemFields: { key: keyof Config; label: string; hint: string; type?: string }[] = [
  { key: "APP_NAME", label: "Nazwa aplikacji", hint: "Nazwa wyświetlana platformy" },
  { key: "DOMAIN", label: "Domena", hint: "Główna domena bez protokołu" },
  { key: "EMAIL", label: "E-mail systemowy", hint: "Adres nadawcy systemowego", type: "email" },
  { key: "OWNER_EMAIL", label: "E-mail właściciela", hint: "Główny adres powiadomień", type: "email" },
  { key: "OLLAMA_MODEL", label: "Model Ollama", hint: "Identyfikator modelu" },
  { key: "OLLAMA_URL", label: "URL Ollama", hint: "Adres API Ollama", type: "url" },
];

const collectionFields: Record<string, { key: string; label: string; numeric?: boolean }[]> = {
  companies: [
    { key: "name", label: "Firma" }, { key: "industry", label: "Branża" },
    { key: "email", label: "E-mail" }, { key: "phone", label: "Telefon" },
    { key: "website", label: "WWW" }, { key: "notes", label: "Notatki" },
  ],
  crm_contacts: [
    { key: "name", label: "Kontakt" }, { key: "email", label: "E-mail" },
    { key: "phone", label: "Telefon" }, { key: "companyId", label: "Firma ID" },
    { key: "title", label: "Stanowisko" }, { key: "notes", label: "Notatki" },
  ],
  leads: [
    { key: "name", label: "Lead" }, { key: "email", label: "E-mail" },
    { key: "phone", label: "Telefon" }, { key: "status", label: "Status" },
    { key: "source", label: "Źródło" }, { key: "notes", label: "Notatki" },
  ],
  products: [
    { key: "name", label: "Produkt" }, { key: "sku", label: "SKU" },
    { key: "price", label: "Cena", numeric: true }, { key: "currency", label: "Waluta" },
    { key: "status", label: "Status" }, { key: "description", label: "Opis" },
  ],
  stores: [
    { key: "name", label: "Sklep" }, { key: "domain", label: "Domena" },
    { key: "platform", label: "Platforma" }, { key: "status", label: "Status" },
  ],
  marketplace_ads: [
    { key: "title", label: "Ogłoszenie" }, { key: "marketplace", label: "Kanał" },
    { key: "status", label: "Status" }, { key: "url", label: "URL" },
    { key: "externalId", label: "ID zewnętrzne" },
  ],
};

const inputClass = "w-full rounded-md border border-[#4B5563] bg-[#111827] px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-[#9CA3AF] focus:border-[#3B82F6] focus:ring-2 focus:ring-blue-500/20";
const buttonClass = "inline-flex items-center justify-center gap-2 rounded-md border border-[#374151] bg-[#1F2937] px-3 py-2 text-xs font-semibold text-[#D1D5DB] transition hover:border-[#4B5563] hover:bg-[#293548] disabled:cursor-not-allowed disabled:opacity-45";
const primaryButtonClass = "inline-flex items-center justify-center gap-2 rounded-md border border-blue-400/40 bg-[#3B82F6] px-3.5 py-2 text-xs font-bold text-white transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50";

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { cache: "no-store", ...init });
  const result: unknown = await response.json();
  if (!response.ok) {
    const message = typeof result === "object" && result !== null && "error" in result && typeof result.error === "string"
      ? result.error
      : "Operacja nie powiodła się.";
    throw new Error(message);
  }
  return result as T;
}

function sendJson(url: string, body: unknown, method = "POST") {
  return requestJson<{ success?: boolean; imported?: number; result?: string; content?: string }>(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function Field({
  label,
  hint,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-1.5 block text-xs font-semibold text-slate-300">{label}</span>
      {hint && <span className="mb-2 block text-[11px] text-slate-500">{hint}</span>}
      <input className={inputClass} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} type={type} value={value} />
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
  rows = 9,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-2 block text-xs font-semibold text-slate-300">{label}</span>
      <textarea className={`${inputClass} resize-y font-mono text-[12px] leading-5`} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} rows={rows} value={value} />
    </label>
  );
}

function SectionHeading({
  eyebrow,
  title,
  detail,
  mode,
}: {
  eyebrow: string;
  title: string;
  detail: string;
  mode: "edit" | "read" | "mixed";
}) {
  const editMode = mode === "edit" || mode === "mixed";
  const readMode = mode === "read" || mode === "mixed";

  return (
    <header className={`mb-7 border-b pb-5 ${editMode ? "border-blue-500/30" : "border-[#374151]"}`}>
      <p className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-cyan-300">{eyebrow}</p>
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-xl font-semibold text-[#F9FAFB]">{title}</h1>
        {editMode && <span className="rounded border border-blue-400/30 bg-blue-500/10 px-2 py-1 font-mono text-[9px] font-semibold uppercase tracking-wide text-blue-200">Edycja</span>}
        {readMode && <span className="rounded border border-[#4B5563] bg-[#1F2937] px-2 py-1 font-mono text-[9px] font-semibold uppercase tracking-wide text-[#D1D5DB]">Odczyt danych</span>}
      </div>
      <p className="mt-1.5 max-w-2xl text-sm text-slate-400">{detail}</p>
    </header>
  );
}

export default function OwnerSettings() {
  const [section, setSection] = useState<SectionId>("prompts");
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [prompts, setPrompts] = useState<PromptFile[]>([]);
  const [selectedPrompt, setSelectedPrompt] = useState("");
  const [promptContent, setPromptContent] = useState("");
  const [promptTest, setPromptTest] = useState("");
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [selectedFile, setSelectedFile] = useState("");
  const [fileContent, setFileContent] = useState("");
  const [fileQuery, setFileQuery] = useState("");
  const [activeCollection, setActiveCollection] = useState("crm_contacts");
  const [records, setRecords] = useState<RecordRow[]>([]);
  const [integrationSecrets, setIntegrationSecrets] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [newCollection, setNewCollection] = useState("");
  const [importFile, setImportFile] = useState<File | null>(null);

  async function loadSnapshot() {
    const data = await requestJson<Snapshot>("/api/owner/settings");
    setSnapshot(data);
  }

  async function openPrompt(path: string) {
    const result = await requestJson<{ path: string; content: string }>(`/api/owner/settings/prompts?path=${encodeURIComponent(path)}`);
    setSelectedPrompt(result.path);
    setPromptContent(result.content);
    setPromptTest("");
  }

  async function loadFiles(query = "") {
    const result = await requestJson<{ files: ProjectFile[] }>(`/api/owner/settings/files${query ? `?q=${encodeURIComponent(query)}` : ""}`);
    setFiles(result.files);
  }

  async function openFile(path: string) {
    const result = await requestJson<{ path: string; content: string }>(`/api/owner/settings/files?path=${encodeURIComponent(path)}`);
    setSelectedFile(result.path);
    setFileContent(result.content);
  }

  async function loadRecords(collection = activeCollection) {
    const result = await requestJson<{ items: RecordRow[] }>(`/api/management/${collection}?limit=100`);
    setRecords(result.items);
  }

  async function changeSection(nextSection: SectionId) {
    setSection(nextSection);
    setError("");
    setNotice("");
    if (nextSection === "crm" || nextSection === "marketplace") {
      const collections = nextSection === "crm"
        ? ["companies", "crm_contacts", "leads"]
        : ["products", "stores", "marketplace_ads"];
      const collection = collections.includes(activeCollection)
        ? activeCollection
        : nextSection === "crm" ? "crm_contacts" : "products";
      setActiveCollection(collection);
      try {
        await loadRecords(collection);
      } catch (requestError) {
        reportFailure(requestError);
      }
    }
    if (nextSection === "files" && files.length === 0) {
      try {
        await loadFiles();
      } catch (requestError) {
        reportFailure(requestError);
      }
    }
  }

  function changeCollection(collection: string) {
    setActiveCollection(collection);
    void loadRecords(collection).catch(reportFailure);
  }

  useEffect(() => {
    let active = true;
    Promise.all([
      requestJson<Snapshot>("/api/owner/settings"),
      requestJson<{ prompts: PromptFile[] }>("/api/owner/settings/prompts"),
    ]).then(async ([data, promptResult]) => {
      if (!active) return;
      setSnapshot(data);
      setPrompts(promptResult.prompts);
      if (promptResult.prompts[0]) await openPrompt(promptResult.prompts[0].path);
    }).catch((requestError: unknown) => {
      if (active) setError(requestError instanceof Error ? requestError.message : "Nie udało się załadować ustawień.");
    });
    return () => { active = false; };
  }, []);

  function reportFailure(requestError: unknown) {
    setError(requestError instanceof Error ? requestError.message : "Operacja nie powiodła się.");
    setNotice("");
  }

  async function perform(action: () => Promise<unknown>, success: string) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await action();
      setNotice(success);
    } catch (requestError) {
      reportFailure(requestError);
    } finally {
      setBusy(false);
    }
  }

  async function saveConfig(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!snapshot) return;
    await perform(async () => {
      await sendJson("/api/owner/settings", { action: "save-config", values: snapshot.config });
      await loadSnapshot();
    }, "Konfiguracja została zapisana.");
  }

  async function savePrompt() {
    if (!selectedPrompt) return;
    await perform(() => sendJson("/api/owner/settings/prompts", { action: "save", path: selectedPrompt, content: promptContent }), "Prompt został zapisany.");
  }

  async function resetPrompt() {
    if (!selectedPrompt || !window.confirm("Przywrócić zapisaną wersję domyślną tego promptu?")) return;
    await perform(async () => {
      const result = await sendJson("/api/owner/settings/prompts", { action: "reset", path: selectedPrompt });
      if (typeof result.content === "string") setPromptContent(result.content);
    }, "Przywrócono domyślny prompt.");
  }

  async function testPrompt() {
    if (!selectedPrompt) return;
    await perform(async () => {
      const result = await sendJson("/api/owner/settings/prompts", { action: "test", path: selectedPrompt, content: promptContent });
      setPromptTest(result.result ?? "Brak odpowiedzi.");
    }, "Test promptu zakończony.");
  }

  async function saveAgent(event: FormEvent<HTMLFormElement>, agent: Agent) {
    event.preventDefault();
    await perform(() => sendJson("/api/owner/settings", {
      action: "update-agent", agentId: agent.agentId,
      values: { model: agent.model, role: agent.role, prompt: agent.prompt },
    }), "Agent został zaktualizowany.");
  }

  async function saveIntegration(event: FormEvent<HTMLFormElement>, integration: Integration) {
    event.preventDefault();
    const secret = integrationSecrets[integration.provider] ?? "";
    await perform(async () => {
      await sendJson("/api/owner/settings", {
        action: "save-integration",
        provider: integration.provider,
        values: {
          displayName: integration.displayName,
          accountName: integration.accountName,
          endpoint: integration.endpoint,
          webhookUrl: integration.webhookUrl,
          publicKey: integration.publicKey,
        },
        secret,
      });
      setIntegrationSecrets((previous) => ({ ...previous, [integration.provider]: "" }));
      await loadSnapshot();
    }, "Dane integracji zostały zapisane.");
  }

  async function saveCell(record: RecordRow, field: { key: string; numeric?: boolean }, value: string) {
    const previousValue = record[field.key];
    const nextValue: string | number = field.numeric && value.trim() !== "" ? Number(value) : value;
    if (String(previousValue ?? "") === value) return;
    setError("");
    setNotice("");
    try {
      await sendJson(`/api/management/${activeCollection}?id=${encodeURIComponent(record._id)}`, { [field.key]: nextValue }, "PATCH");
      setRecords((previous) => previous.map((item) => item._id === record._id ? { ...item, [field.key]: nextValue } : item));
      setNotice("Zmiana zapisana.");
    } catch (requestError) {
      reportFailure(requestError);
    }
  }

  async function createCollection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!newCollection.trim()) return;
    await perform(async () => {
      await sendJson("/api/owner/settings", { action: "create-collection", name: newCollection.trim() });
      setNewCollection("");
      await loadSnapshot();
    }, "Kolekcja została utworzona.");
  }

  async function dropCollection(name: string) {
    if (!window.confirm(`Usunąć kolekcję ${name} wraz z danymi?`)) return;
    await perform(async () => {
      await sendJson("/api/owner/settings", { action: "drop-collection", name });
      await loadSnapshot();
    }, `Usunięto kolekcję ${name}.`);
  }

  async function importCollection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!importFile || !activeCollection) return;
    await perform(async () => {
      const value: unknown = JSON.parse(await importFile.text());
      const recordsToImport = Array.isArray(value) ? value : typeof value === "object" && value !== null && "records" in value && Array.isArray(value.records) ? value.records : null;
      if (!recordsToImport) throw new Error("Plik JSON musi zawierać tablicę dokumentów.");
      const result = await sendJson("/api/owner/settings", { action: "import-collection", name: activeCollection, records: recordsToImport });
      await loadSnapshot();
      await loadRecords(activeCollection);
      setImportFile(null);
      setNotice(`Zaimportowano ${result.imported ?? 0} dokumentów.`);
    }, "Import zakończony.");
  }

  async function runFileSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await perform(() => loadFiles(fileQuery.trim()), "Wyniki wyszukiwania zaktualizowane.");
  }

  async function saveFile() {
    if (!selectedFile) return;
    await perform(() => sendJson("/api/owner/settings/files", { path: selectedFile, content: fileContent }, "PATCH"), "Plik został zapisany.");
  }

  function updateConfig(key: keyof Config, value: string) {
    setSnapshot((previous) => previous ? { ...previous, config: { ...previous.config, [key]: value } } : previous);
  }

  function updateAgent(agentId: string, key: "model" | "role" | "prompt", value: string) {
    setSnapshot((previous) => previous ? {
      ...previous,
      agents: previous.agents.map((agent) => agent.agentId === agentId ? { ...agent, [key]: value } : agent),
    } : previous);
  }

  function updateIntegration(provider: string, key: keyof Integration, value: string) {
    setSnapshot((previous) => previous ? {
      ...previous,
      integrations: previous.integrations.map((integration) => integration.provider === provider ? { ...integration, [key]: value } : integration),
    } : previous);
  }

  const currentSection = sections.find((item) => item.id === section) ?? sections[0];

  return (
    <div className="min-h-screen bg-[#0B0F19] text-[#F9FAFB]">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-62 flex-col border-r border-[#374151] bg-[#111827] lg:flex">
        <Link className="flex h-17 items-center gap-3 border-b border-white/8 px-5" href="/">
          <span className="flex size-8 items-center justify-center rounded-md border border-cyan-300/25 bg-cyan-300/10 font-mono text-[10px] font-bold text-cyan-200">Q/</span>
          <span><span className="block text-xs font-bold tracking-[0.08em] text-white">OWNER STUDIO</span><span className="mt-0.5 block text-[9px] font-medium uppercase tracking-[0.16em] text-slate-500">Qualitet Platform</span></span>
        </Link>
        <div className="px-3 pt-6">
          <p className="px-3 pb-2 font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-600">Workspace</p>
          <Link className="mb-5 flex items-center gap-3 rounded-md px-3 py-2.5 text-xs font-medium text-slate-500 transition hover:bg-white/4 hover:text-white" href="/">← <span>Command Center</span></Link>
          <p className="px-3 pb-2 font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-600">Settings</p>
          <nav aria-label="Sekcje ustawień" className="space-y-1">
            {sections.map((item) => (
              <button aria-current={section === item.id ? "page" : undefined} className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-xs font-medium transition ${section === item.id ? "bg-cyan-300/11 text-cyan-100" : "text-slate-400 hover:bg-white/4 hover:text-slate-100"}`} key={item.id} onClick={() => void changeSection(item.id)} type="button">
                <span className={`flex h-5 min-w-7 items-center justify-center rounded border px-1 font-mono text-[8px] ${section === item.id ? "border-cyan-300/20 bg-cyan-300/10 text-cyan-200" : "border-white/8 text-slate-500"}`}>{item.mark}</span>
                {item.title}
                {section === item.id && <span className="ml-auto size-1.5 rounded-full bg-cyan-300" />}
              </button>
            ))}
          </nav>
        </div>
        <div className="mt-auto border-t border-white/8 p-4">
          <div className="flex items-center gap-2.5">
            <span className="size-2 rounded-full bg-emerald-400 shadow-[0_0_10px_#34d39966]" />
            <span className="text-[10px] font-medium text-slate-400">Owner session active</span>
          </div>
        </div>
      </aside>

      <div className="lg:pl-62">
        <header className="sticky top-0 z-10 flex min-h-17 flex-wrap items-center justify-between gap-3 border-b border-[#374151] bg-[#0B0F19]/95 px-5 backdrop-blur-md sm:px-7">
          <div><p className="text-xs font-semibold text-white">Owner Studio <span className="px-1.5 text-slate-600">/</span> <span className="text-slate-400">{currentSection.title}</span></p><p className="mt-1 font-mono text-[9px] text-slate-600">PLATFORM CONTROL CENTER</p></div>
          <div className="flex items-center gap-2"><span className="hidden items-center gap-2 rounded border border-white/8 px-2.5 py-1.5 text-[10px] text-slate-400 sm:flex"><span className="size-1.5 rounded-full bg-emerald-400" /> Owner access</span><Link className={buttonClass} href="/">← Dashboard</Link></div>
          <nav aria-label="Sekcje Settings" className="flex w-full gap-1 overflow-x-auto pb-2 lg:hidden">
            {sections.map((item) => <button className={`shrink-0 rounded px-2.5 py-1.5 text-[10px] ${section === item.id ? "bg-cyan-300/10 text-cyan-200" : "text-slate-500"}`} key={item.id} onClick={() => void changeSection(item.id)} type="button">{item.title}</button>)}
          </nav>
        </header>

        <main className="mx-auto max-w-360 px-5 py-7 sm:px-7 sm:py-9">
          {error && <div className="mb-5 flex items-start justify-between gap-3 border border-rose-400/20 bg-rose-400/6 px-4 py-3 text-xs text-rose-200" role="alert"><span>{error}</span><button aria-label="Zamknij komunikat" className="text-rose-200/70" onClick={() => setError("")} type="button">×</button></div>}
          {notice && <div className="mb-5 border border-emerald-400/20 bg-emerald-400/6 px-4 py-3 text-xs text-emerald-200" role="status">{notice}</div>}

          {section === "prompts" && <section className="rounded-xl border border-blue-500/30 bg-[#111827] p-4 sm:p-6">
            <SectionHeading detail="Przeglądaj, aktualizuj i testuj prompty bezpośrednio w panelu." eyebrow="AI / Prompt Library" mode="edit" title="AI Prompts" />
            <div className="grid gap-6 xl:grid-cols-[270px_minmax(0,1fr)]">
              <div className="border-r border-white/8 pr-4">
                <div className="mb-3 flex items-center justify-between"><span className="font-mono text-[10px] uppercase tracking-wider text-slate-500">Prompty projektu</span><span className="text-[10px] text-slate-600">{prompts.length}</span></div>
                <div className="max-h-[65vh] space-y-1 overflow-y-auto">
                  {prompts.map((prompt) => <button className={`block w-full truncate rounded px-3 py-2.5 text-left font-mono text-[10px] transition ${selectedPrompt === prompt.path ? "bg-white/7 text-cyan-200" : "text-slate-400 hover:bg-white/4 hover:text-white"}`} key={prompt.path} onClick={() => void perform(() => openPrompt(prompt.path), "Prompt został wczytany.")} type="button">{prompt.path}</button>)}
                  {prompts.length === 0 && <p className="px-3 py-5 text-xs text-slate-600">Nie znaleziono plików promptów.</p>}
                </div>
              </div>
              <div className="min-w-0">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><p className="font-mono text-[10px] text-slate-500">{selectedPrompt || "Wybierz prompt z listy"}</p><p className="mt-1 text-[10px] text-slate-600">Edycja tekstu źródłowego</p></div><div className="flex flex-wrap gap-2"><button className={buttonClass} disabled={!selectedPrompt || busy} onClick={() => void resetPrompt()} type="button">Przywróć domyślny</button><button className={buttonClass} disabled={!selectedPrompt || busy} onClick={() => void testPrompt()} type="button">▷ Test prompt</button><button className={primaryButtonClass} disabled={!selectedPrompt || busy} onClick={() => void savePrompt()} type="button">Zapisz prompt</button></div></div>
                <textarea aria-label="Treść promptu" className={`${inputClass} min-h-107.5 resize-y font-mono text-[12px] leading-6`} onChange={(event) => setPromptContent(event.target.value)} value={promptContent} />
                {promptTest && <div className="mt-4 border-l-2 border-cyan-300/60 bg-white/3 p-4"><p className="mb-2 font-mono text-[9px] uppercase tracking-wider text-cyan-200">Wynik testu · Ollama</p><p className="whitespace-pre-wrap text-xs leading-5 text-slate-300">{promptTest}</p></div>}
              </div>
            </div>
          </section>}

          {section === "system" && <section className="rounded-xl border border-blue-500/30 bg-[#111827] p-4 sm:p-6">
            <SectionHeading detail="Wartości są zapisywane jako konfiguracja platformy w MongoDB. Zmiany środowiskowe wymagają wdrożenia po stronie hostingu." eyebrow="Platform / Runtime" mode="edit" title="System Config" />
            {!snapshot ? <p className="text-sm text-slate-500">Ładowanie konfiguracji…</p> : <form className="max-w-3xl" onSubmit={(event) => void saveConfig(event)}>
              <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">{systemFields.map((field) => <Field hint={field.hint} key={field.key} label={field.label} onChange={(value) => updateConfig(field.key, value)} type={field.type} value={snapshot.config[field.key] ?? ""} />)}</div>
              <div className="mt-7 flex items-center justify-between border-t border-white/8 pt-5"><p className="max-w-md text-[10px] leading-4 text-slate-500">Ustawienia zapisane tutaj są dostępne dla panelu i jego funkcji konfiguracyjnych.</p><button className={primaryButtonClass} disabled={busy} type="submit">Zapisz konfigurację</button></div>
            </form>}
          </section>}

          {section === "mongodb" && <section className="rounded-xl border border-[#374151] bg-[#1F2937] p-4 sm:p-6">
            <SectionHeading detail="Stan połączenia, kolekcje, import i eksport danych." eyebrow="Data / MongoDB Atlas" mode="read" title="MongoDB" />
            {!snapshot ? <p className="text-sm text-slate-500">Ładowanie informacji o bazie…</p> : <>
              <div className="mb-7 grid gap-5 border-b border-white/8 pb-6 sm:grid-cols-3"><div><p className="font-mono text-[9px] uppercase tracking-wider text-slate-600">Connection</p><p className="mt-2 flex items-center gap-2 text-sm text-slate-200"><span className="size-2 rounded-full bg-emerald-400" /> Połączono</p></div><div><p className="font-mono text-[9px] uppercase tracking-wider text-slate-600">Database</p><p className="mt-2 font-mono text-sm text-slate-200">{snapshot.database.name || "Nieznana"}</p></div><div><p className="font-mono text-[9px] uppercase tracking-wider text-slate-600">Collections</p><p className="mt-2 text-sm text-slate-200">{snapshot.database.collections.length} kolekcji</p></div></div>
              <div className="mb-8"><div className="mb-3 flex items-center justify-between"><h2 className="text-xs font-semibold text-white">Kolekcje</h2><form className="flex gap-2" onSubmit={(event) => void createCollection(event)}><input aria-label="Nazwa nowej kolekcji" className={`${inputClass} w-48 py-2 text-xs`} onChange={(event) => setNewCollection(event.target.value)} placeholder="nazwa_kolekcji" value={newCollection} /><button className={buttonClass} disabled={busy || !newCollection.trim()} type="submit">＋ Utwórz</button></form></div>
                <div className="divide-y divide-white/6 border-y border-white/8">{snapshot.database.collections.map((name) => <div className="flex flex-wrap items-center justify-between gap-3 py-2.5" key={name}><span className="font-mono text-[11px] text-slate-300">{name}</span><div className="flex gap-2"><a className={buttonClass} href={`/api/owner/settings?export=${encodeURIComponent(name)}`}>↓ Eksport JSON</a><button className={`${buttonClass} text-rose-300 hover:border-rose-400/30 hover:text-rose-200`} disabled={busy || ["users", "auth_sessions", "auth_attempts", "audit_logs", "owner_settings", "integrations", "system_health"].includes(name)} onClick={() => void dropCollection(name)} type="button">Usuń</button></div></div>)}</div>
              </div>
              <form className="flex flex-wrap items-end gap-3 border-t border-white/8 pt-5" onSubmit={(event) => void importCollection(event)}><label className="block"><span className="mb-1.5 block text-[10px] font-semibold text-slate-400">Import JSON do kolekcji</span><input accept="application/json,.json" className="block max-w-70 text-xs text-slate-400 file:mr-3 file:rounded file:border-0 file:bg-white/8 file:px-3 file:py-2 file:text-[10px] file:font-semibold file:text-slate-200" onChange={(event: ChangeEvent<HTMLInputElement>) => setImportFile(event.target.files?.[0] ?? null)} type="file" /></label><label className="block"><span className="mb-1.5 block text-[10px] font-semibold text-slate-400">Kolekcja docelowa</span><select className={`${inputClass} min-w-48 py-2`} onChange={(event) => setActiveCollection(event.target.value)} value={activeCollection}>{snapshot.database.collections.filter((name) => !["users", "auth_sessions", "auth_attempts", "audit_logs", "owner_settings", "integrations", "system_health"].includes(name)).map((name) => <option key={name} value={name}>{name}</option>)}</select></label><button className={primaryButtonClass} disabled={busy || !importFile} type="submit">↑ Importuj dane</button></form>
            </>}
          </section>}

          {(section === "crm" || section === "marketplace") && <section className="rounded-xl border border-blue-500/30 bg-[#111827] p-4 sm:p-6">
            <SectionHeading detail={section === "crm" ? "Wybierz komórkę, zmień wartość i zapisz ją po opuszczeniu pola." : "Edytuj produkty, sklepy i ogłoszenia bezpośrednio w bazie."} eyebrow={section === "crm" ? "Customers / CRM" : "Commerce / Catalog"} mode="mixed" title={section === "crm" ? "CRM" : "Marketplace"} />
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div className="flex gap-1 border-b border-white/8">{(section === "crm" ? ["companies", "crm_contacts", "leads"] : ["products", "stores", "marketplace_ads"]).map((name) => <button className={`border-b-2 px-3 py-2 text-[10px] font-medium ${activeCollection === name ? "border-cyan-300 text-cyan-200" : "border-transparent text-slate-500 hover:text-slate-300"}`} key={name} onClick={() => changeCollection(name)} type="button">{name}</button>)}</div><span className="font-mono text-[9px] text-slate-600">{records.length} rekordów · wybierz komórkę do edycji</span></div>
            <div className="overflow-x-auto rounded-lg border border-[#374151] bg-[#1F2937]"><table className="w-full min-w-190 border-collapse text-left"><thead><tr className="border-b border-white/8">{(collectionFields[activeCollection] ?? []).map((field) => <th className="px-2 py-2.5 font-mono text-[9px] font-medium uppercase tracking-wider text-slate-500" key={field.key}>{field.label}</th>)}</tr></thead><tbody className="divide-y divide-white/5">{records.map((record) => <tr className="group" key={record._id}>{(collectionFields[activeCollection] ?? []).map((field) => <td className="max-w-65 px-1.5 py-1" key={field.key}><input aria-label={`${field.label}: ${String(record.name ?? record.title ?? record._id)}`} className="w-full min-w-24 rounded-sm border border-transparent bg-[#111827] px-1.5 py-2 text-[11px] text-slate-300 outline-none transition hover:border-white/10 hover:bg-[#293548] focus:border-[#3B82F6] focus:bg-[#111827]" defaultValue={String(record[field.key] ?? "")} onBlur={(event) => void saveCell(record, field, event.target.value)} type={field.numeric ? "number" : "text"} /></td>)}</tr>)}{records.length === 0 && <tr><td className="px-3 py-10 text-center text-xs text-slate-600" colSpan={collectionFields[activeCollection]?.length ?? 1}>Brak rekordów.</td></tr>}</tbody></table></div>
          </section>}

          {section === "agents" && <section className="rounded-xl border border-blue-500/30 bg-[#111827] p-4 sm:p-6">
            <SectionHeading detail="Zarządzaj definicją promptu, modelem i rolą agentów zapisanych w MongoDB." eyebrow="AI / Runtime" mode="edit" title="AI Agents" />
            {!snapshot ? <p className="text-sm text-slate-500">Ładowanie agentów…</p> : <div className="divide-y divide-white/8">{snapshot.agents.map((agent) => <form className="grid gap-5 py-6 lg:grid-cols-[220px_minmax(0,1fr)]" key={agent.agentId} onSubmit={(event) => void saveAgent(event, agent)}><div><h2 className="text-sm font-semibold text-white">{agent.name}</h2><p className="mt-1 font-mono text-[10px] text-slate-500">{agent.agentId}</p><span className="mt-3 inline-flex items-center gap-1.5 text-[10px] text-slate-500"><span className="size-1.5 rounded-full bg-cyan-300" />{agent.status}</span></div><div className="grid gap-4"><div className="grid gap-4 sm:grid-cols-2"><Field label="Model" onChange={(value) => updateAgent(agent.agentId, "model", value)} placeholder="np. llama3.1" value={agent.model} /><Field label="Rola" onChange={(value) => updateAgent(agent.agentId, "role", value)} placeholder="Rola agenta" value={agent.role} /></div><TextArea label="Prompt agenta" onChange={(value) => updateAgent(agent.agentId, "prompt", value)} rows={5} value={agent.prompt} /><div className="flex justify-end"><button className={primaryButtonClass} disabled={busy} type="submit">Zapisz agenta</button></div></div></form>)}{snapshot.agents.length === 0 && <p className="py-10 text-center text-xs text-slate-600">Brak agentów w bazie.</p>}</div>}
          </section>}

          {section === "files" && <section className="rounded-xl border border-blue-500/30 bg-[#111827] p-4 sm:p-6">
            <SectionHeading detail="Przeszukuj tekstowe pliki projektu, otwieraj podgląd i zapisuj zmiany z panelu." eyebrow="Workspace / Source" mode="edit" title="Files Center" />
            <div className="grid min-h-[65vh] border border-white/8 lg:grid-cols-[280px_minmax(0,1fr)]">
              <div className="border-b border-white/8 lg:border-b-0 lg:border-r"><form className="flex gap-2 border-b border-white/8 p-3" onSubmit={(event) => void runFileSearch(event)}><input aria-label="Szukaj w plikach" className={`${inputClass} min-w-0 py-2 text-[11px]`} onChange={(event) => setFileQuery(event.target.value)} placeholder="Szukaj plików i treści" value={fileQuery} /><button aria-label="Uruchom wyszukiwanie" className={buttonClass} type="submit">⌕</button></form><div className="max-h-[65vh] overflow-y-auto p-2">{files.map((file) => <button className={`block w-full truncate rounded px-2.5 py-2 text-left font-mono text-[10px] ${selectedFile === file.path ? "bg-white/7 text-cyan-200" : "text-slate-400 hover:bg-white/4 hover:text-white"}`} key={file.path} onClick={() => void perform(() => openFile(file.path), "Plik otwarty.")} type="button">{file.path}</button>)}{files.length === 0 && <p className="px-2 py-6 text-[10px] text-slate-600">Brak wyników.</p>}</div></div>
              <div className="flex min-w-0 flex-col"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/8 px-4 py-3"><span className="truncate font-mono text-[10px] text-slate-400">{selectedFile || "Wybierz plik z listy"}</span><button className={primaryButtonClass} disabled={!selectedFile || busy} onClick={() => void saveFile()} type="button">Zapisz plik</button></div><textarea aria-label="Treść pliku" className="min-h-[55vh] flex-1 resize-none bg-[#090e14] p-4 font-mono text-[11px] leading-5 text-slate-300 outline-none" onChange={(event) => setFileContent(event.target.value)} spellCheck={false} value={fileContent} /></div>
            </div>
          </section>}

          {section === "integrations" && <section className="rounded-xl border border-blue-500/30 bg-[#111827] p-4 sm:p-6">
            <SectionHeading detail="Edytuj dane połączeń. Klucze są szyfrowane po stronie serwera i nie są odczytywane z powrotem do przeglądarki." eyebrow="Connections / Providers" mode="edit" title="Integrations" />
            {!snapshot ? <p className="text-sm text-slate-500">Ładowanie integracji…</p> : <div className="divide-y divide-white/8">{snapshot.integrations.map((integration) => <form className="grid gap-5 py-5 lg:grid-cols-[190px_minmax(0,1fr)]" key={integration.provider} onSubmit={(event) => void saveIntegration(event, integration)}><div><h2 className="text-sm font-semibold capitalize text-white">{integration.provider}</h2><p className="mt-1 font-mono text-[9px] uppercase tracking-wider text-slate-500">{integration.status}</p><p className="mt-2 text-[10px] text-slate-600">{integration.hasSecret ? "Sekret zapisany" : "Sekret nieustawiony"}</p></div><div className="grid gap-3 sm:grid-cols-2"><Field label="Nazwa" onChange={(value) => updateIntegration(integration.provider, "displayName", value)} value={integration.displayName} /><Field label="Konto / workspace" onChange={(value) => updateIntegration(integration.provider, "accountName", value)} value={integration.accountName} /><Field label="Endpoint" onChange={(value) => updateIntegration(integration.provider, "endpoint", value)} value={integration.endpoint} /><Field label="Webhook URL" onChange={(value) => updateIntegration(integration.provider, "webhookUrl", value)} value={integration.webhookUrl} /><Field label="Klucz publiczny" onChange={(value) => updateIntegration(integration.provider, "publicKey", value)} value={integration.publicKey} /><Field label="Token / secret" onChange={(value) => setIntegrationSecrets((previous) => ({ ...previous, [integration.provider]: value }))} placeholder={integration.hasSecret ? "Zapisany · wpisz, aby zastąpić" : "Wartość sekretna"} value={integrationSecrets[integration.provider] ?? ""} /><div className="flex justify-end sm:col-span-2"><button className={primaryButtonClass} disabled={busy} type="submit">Zapisz integrację</button></div></div></form>)}</div>}
          </section>}

          <footer className="mt-12 flex flex-wrap items-center justify-between gap-2 border-t border-white/8 py-4 font-mono text-[9px] text-slate-600"><span>OWNER STUDIO · QUALITET ECOSYSTEM</span><span>Changes are recorded in the audit log</span></footer>
        </main>
      </div>
    </div>
  );
}