"use client";

import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import Link from "next/link";

type SectionId = "prompts" | "system" | "mongodb" | "crm" | "marketplace" | "agents" | "files" | "integrations" | "git" | "deploy" | "ads" | "command";
type Config = Record<"APP_NAME" | "DOMAIN" | "EMAIL" | "OWNER_EMAIL" | "OLLAMA_MODEL" | "OLLAMA_URL", string>;
type PromptFile = { path: string; size: number; modifiedAt?: string };
type PromptVersion = { id: string; createdAt: string; createdBy: string };
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
type ReplaceChange = { path: string; count: number; hash: string; preview: string };
type GitSnapshot = {
  available: boolean;
  branch?: string;
  files?: { status: string; path: string }[];
  commits?: { hash: string; subject: string; age: string }[];
  error?: string;
};
type AdsCampaign = {
  id: string;
  name: string;
  status: string;
  budget: number | null;
  budgetType: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions?: number;
  currency: string;
};
type AdsSnapshot = {
  provider: string;
  status: string;
  message: string;
  accounts: { id: string; name: string; status: string; currency: string; spend: number | null; balance: number | null }[];
  campaigns: AdsCampaign[];
};
type DeploySnapshot = {
  github: {
    configured: boolean;
    repository: string;
    workflowConfigured: boolean;
    latestRun: { name?: string; status?: string; conclusion?: string | null; htmlUrl?: string; updatedAt?: string } | null;
  };
  render: {
    configured: boolean;
    service: { name?: string; serviceType?: string; suspended?: boolean; dashboardUrl?: string } | null;
  };
  errors: string[];
};

const sections: { id: SectionId; title: string; mark: string }[] = [
  { id: "prompts", title: "AI Prompts", mark: "AI" },
  { id: "system", title: "System Config", mark: "SYS" },
  { id: "mongodb", title: "MongoDB", mark: "DB" },
  { id: "crm", title: "CRM", mark: "CRM" },
  { id: "marketplace", title: "Marketplace", mark: "MKT" },
  { id: "agents", title: "AI Agents", mark: "AG" },
  { id: "files", title: "Files Center", mark: "<>" },
  { id: "command", title: "Owner Command", mark: "AI" },
  { id: "integrations", title: "Integrations", mark: "INT" },
  { id: "ads", title: "Ads Center", mark: "ADS" },
  { id: "git", title: "Git Center", mark: "GIT" },
  { id: "deploy", title: "Deploy Center", mark: "DEP" },
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
  return requestJson<{
    success?: boolean;
    imported?: number;
    result?: string;
    content?: string;
    path?: string;
    changes?: ReplaceChange[];
    totalMatches?: number;
    proposal?: string;
  }>(url, {
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
  const [promptHistory, setPromptHistory] = useState<PromptVersion[]>([]);
  const [promptPreview, setPromptPreview] = useState(false);
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
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [findText, setFindText] = useState("");
  const [replaceText, setReplaceText] = useState("");
  const [replaceChanges, setReplaceChanges] = useState<ReplaceChange[]>([]);
  const [replaceTotal, setReplaceTotal] = useState(0);
  const [aiInstruction, setAiInstruction] = useState("");
  const [aiProposal, setAiProposal] = useState("");
  const [gitSnapshot, setGitSnapshot] = useState<GitSnapshot | null>(null);
  const [gitMessage, setGitMessage] = useState("");
  const [gitSelection, setGitSelection] = useState<Set<string>>(new Set());
  const [adsProvider, setAdsProvider] = useState("facebook");
  const [adsSnapshot, setAdsSnapshot] = useState<AdsSnapshot | null>(null);
  const [selectedAdAccount, setSelectedAdAccount] = useState("");
  const [campaignName, setCampaignName] = useState("");
  const [campaignObjective, setCampaignObjective] = useState("OUTCOME_TRAFFIC");
  const [campaignBudget, setCampaignBudget] = useState("10");
  const [deploySnapshot, setDeploySnapshot] = useState<DeploySnapshot | null>(null);
  const [mongoDocument, setMongoDocument] = useState('{\n  "name": ""\n}');
  const [mongoField, setMongoField] = useState("");
  const [mongoFieldValue, setMongoFieldValue] = useState("");

  async function loadSnapshot() {
    const data = await requestJson<Snapshot>("/api/owner/settings");
    setSnapshot(data);
  }

  async function openPrompt(path: string) {
    const result = await requestJson<{ path: string; content: string }>(`/api/owner/settings/prompts?path=${encodeURIComponent(path)}`);
    setSelectedPrompt(result.path);
    setPromptContent(result.content);
    setPromptTest("");
    setPromptHistory([]);
    setPromptPreview(false);
  }

  async function loadPromptHistory() {
    if (!selectedPrompt) return;
    const result = await requestJson<{ history: PromptVersion[] }>(
      `/api/owner/settings/prompts?path=${encodeURIComponent(selectedPrompt)}&history=1`,
    );
    setPromptHistory(result.history);
  }

  async function loadFiles(query = "") {
    const result = await requestJson<{ files: ProjectFile[] }>(`/api/owner/settings/files${query ? `?q=${encodeURIComponent(query)}` : ""}`);
    setFiles(result.files);
  }

  async function loadGit() {
    setGitSnapshot(await requestJson<GitSnapshot>("/api/owner/git"));
  }

  async function loadAds(provider = adsProvider) {
    setAdsProvider(provider);
    setSelectedAdAccount("");
    setAdsSnapshot(await requestJson<AdsSnapshot>(`/api/owner/ads?provider=${encodeURIComponent(provider)}`));
  }

  async function saveAdsAccount() {
    if (!selectedAdAccount) return;
    await perform(async () => {
      await sendJson("/api/owner/settings", {
        action: "save-integration",
        provider: adsProvider,
        values: { accountName: selectedAdAccount },
      });
      await Promise.all([loadSnapshot(), loadAds(adsProvider)]);
    }, "Konto reklamowe zostało zapisane.");
  }

  async function loadDeploy() {
    setDeploySnapshot(await requestJson<DeploySnapshot>("/api/owner/deploy"));
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
    if (nextSection === "git") {
      try {
        await loadGit();
      } catch (requestError) {
        reportFailure(requestError);
      }
    }
    if (nextSection === "ads") {
      try {
        await loadAds();
      } catch (requestError) {
        reportFailure(requestError);
      }
    }
    if (nextSection === "deploy") {
      try {
        await loadDeploy();
      } catch (requestError) {
        reportFailure(requestError);
      }
    }
  }

  async function triggerDeploy(action: "render-deploy" | "github-dispatch", confirmation: string) {
    if (!window.confirm(confirmation)) return;
    await perform(async () => {
      const result = await sendJson("/api/owner/deploy", { action });
      await loadDeploy();
      setNotice(result.result ?? "Operacja wdrożenia została uruchomiona.");
    }, "Operacja wdrożenia została uruchomiona.");
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

  async function restorePromptVersion(historyId: string) {
    if (!selectedPrompt || !window.confirm("Przywrócić tę wersję promptu? Bieżąca wersja zostanie zachowana w historii.")) return;
    await perform(async () => {
      const result = await sendJson("/api/owner/settings/prompts", {
        action: "restore-history", path: selectedPrompt, historyId,
      });
      if (typeof result.content === "string") setPromptContent(result.content);
      await loadPromptHistory();
    }, "Przywrócono wersję promptu.");
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

  async function createMongoDocument(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await perform(async () => {
      const document: unknown = JSON.parse(mongoDocument);
      if (typeof document !== "object" || document === null || Array.isArray(document)) {
        throw new Error("Dokument musi być obiektem JSON.");
      }
      await sendJson("/api/owner/settings", { action: "create-document", name: activeCollection, document });
      setMongoDocument('{\n  "name": ""\n}');
    }, "Dokument został utworzony.");
  }

  async function addMongoField(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    let value: string | number | boolean = mongoFieldValue;
    if (mongoFieldValue === "true") value = true;
    else if (mongoFieldValue === "false") value = false;
    else if (mongoFieldValue.trim() !== "" && Number.isFinite(Number(mongoFieldValue))) value = Number(mongoFieldValue);
    await perform(async () => {
      await sendJson("/api/owner/settings", {
        action: "add-field", name: activeCollection, field: mongoField, value,
      });
      setMongoField("");
    }, "Pole dodane do dokumentów, w których wcześniej nie występowało.");
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

  async function previewReplace(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await perform(async () => {
      const result = await sendJson("/api/owner/settings/files", {
        action: "preview-replace", search: findText, replacement: replaceText,
      });
      setReplaceChanges((result as { changes?: ReplaceChange[] }).changes ?? []);
      setReplaceTotal((result as { totalMatches?: number }).totalMatches ?? 0);
    }, "Podgląd zmian jest gotowy.");
  }

  async function applyReplace() {
    if (replaceChanges.length === 0 || !window.confirm(`Zamienić ${replaceTotal} wystąpień w ${replaceChanges.length} plikach?`)) return;
    await perform(async () => {
      await sendJson("/api/owner/settings/files", {
        action: "apply-replace", search: findText, replacement: replaceText,
        targets: replaceChanges.map(({ path, hash }) => ({ path, hash })),
      });
      setReplaceChanges([]);
      setReplaceTotal(0);
      await loadFiles(fileQuery.trim());
    }, "Zmiany zostały zastosowane.");
  }

  async function requestAiProposal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedFile) {
      setError("Najpierw wybierz plik do edycji przez AI.");
      return;
    }
    await perform(async () => {
      const result = await sendJson("/api/owner/settings/files", {
        action: "ai-propose", path: selectedFile, instruction: aiInstruction,
      });
      const proposal = (result as { proposal?: string }).proposal;
      if (typeof proposal !== "string") throw new Error("AI nie zwróciło propozycji.");
      setAiProposal(proposal);
    }, "Propozycja AI jest gotowa do sprawdzenia.");
  }

  async function executeOwnerCommand(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await perform(async () => {
      const location = await sendJson("/api/owner/settings/files", {
        action: "ai-locate", instruction: aiInstruction,
      });
      if (!location.path) throw new Error("AI nie wskazało pliku.");
      const path = location.path;
      await openFile(path);
      const proposal = await sendJson("/api/owner/settings/files", {
        action: "ai-propose", path, instruction: aiInstruction,
      });
      if (!proposal.proposal) throw new Error("AI nie przygotowało propozycji.");
      setAiProposal(proposal.proposal);
      setSection("command");
    }, "AI znalazło plik i przygotowało propozycję do sprawdzenia.");
  }

  async function acceptAiProposal() {
    if (!selectedFile || !aiProposal) return;
    setFileContent(aiProposal);
    setAiProposal("");
    setSection("files");
    setNotice("Propozycja wczytana do edytora. Sprawdź ją i kliknij „Zapisz plik”, aby zastosować.");
  }

  async function performGitAction(action: string, extra: Record<string, unknown> = {}) {
    await perform(async () => {
      await sendJson("/api/owner/git", { action, ...extra });
      await loadGit();
    }, "Operacja Git zakończona.");
  }

  async function commitSelectedFiles(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (gitSelection.size === 0 || !gitMessage.trim()) return;
    await performGitAction("commit", { message: gitMessage, files: [...gitSelection] });
    setGitMessage("");
    setGitSelection(new Set());
  }

  async function createAdCampaign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!campaignName.trim()) return;
    if (!window.confirm(`Utworzyć kampanię ${adsProvider === "facebook" ? "Meta" : "Google"} w stanie PAUSED?`)) return;
    await perform(async () => {
      await sendJson("/api/owner/ads", {
        action: "create-campaign",
        provider: adsProvider,
        name: campaignName,
        objective: campaignObjective,
        dailyBudget: Number(campaignBudget),
      });
      setCampaignName("");
      await loadAds(adsProvider);
    }, "Kampania utworzona jako wstrzymana.");
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
  const fileTree = files.map((file) => {
    const parts = file.path.split("/");
    const fileName = parts.pop() ?? file.path;
    const folders = parts.map((_, index) => parts.slice(0, index + 1).join("/"));
    return { ...file, fileName, folders };
  });
  const treeEntries = fileTree.flatMap((file) => [
    ...file.folders.map((path, index) => ({
      path,
      label: path.split("/").at(-1) ?? path,
      isFolder: true,
      depth: index,
      ancestors: file.folders.slice(0, index),
    })),
    {
      path: file.path,
      label: file.fileName,
      isFolder: false,
      depth: file.folders.length,
      ancestors: file.folders,
    },
  ]);
  const uniqueTreeEntries = [...new Map(treeEntries.map((entry) => [`${entry.isFolder ? "d" : "f"}:${entry.path}`, entry])).values()]
    .filter((entry) => entry.ancestors.every((folder) => expandedFolders.has(folder)))
    .sort((left, right) => left.path.localeCompare(right.path) || Number(right.isFolder) - Number(left.isFolder));

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
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><p className="font-mono text-[10px] text-slate-500">{selectedPrompt || "Wybierz prompt z listy"}</p><p className="mt-1 text-[10px] text-slate-600">{promptPreview ? "Podgląd treści" : "Edycja tekstu źródłowego"}</p></div><div className="flex flex-wrap gap-2"><button className={buttonClass} disabled={!selectedPrompt || busy} onClick={() => setPromptPreview((previous) => !previous)} type="button">{promptPreview ? "Edytuj" : "Podgląd"}</button><button className={buttonClass} disabled={!selectedPrompt || busy} onClick={() => void resetPrompt()} type="button">Przywróć domyślny</button><button className={buttonClass} disabled={!selectedPrompt || busy} onClick={() => void perform(loadPromptHistory, "Historia promptu wczytana.")} type="button">Historia promptu</button><button className={buttonClass} disabled={!selectedPrompt || busy} onClick={() => void testPrompt()} type="button">▷ Test prompt</button><button className={primaryButtonClass} disabled={!selectedPrompt || busy || promptPreview} onClick={() => void savePrompt()} type="button">Zapisz prompt</button></div></div>
                {promptPreview ? <pre className="min-h-107.5 overflow-auto whitespace-pre-wrap rounded-md border border-[#374151] bg-[#0B0F19] p-4 font-mono text-[12px] leading-6 text-[#D1D5DB]">{promptContent}</pre> : <textarea aria-label="Treść promptu" className={`${inputClass} min-h-107.5 resize-y font-mono text-[12px] leading-6`} onChange={(event) => setPromptContent(event.target.value)} value={promptContent} />}
                {promptHistory.length > 0 && <div className="mt-4 rounded border border-[#374151] bg-[#111827] p-3"><p className="mb-2 text-[10px] font-semibold text-[#D1D5DB]">Zapisane wersje</p><div className="space-y-2">{promptHistory.map((version) => <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#374151] pt-2" key={version.id}><span className="text-[10px] text-[#9CA3AF]">{version.createdAt ? new Date(version.createdAt).toLocaleString("pl-PL") : "Wersja"} · {version.createdBy}</span><button className={buttonClass} disabled={busy} onClick={() => void restorePromptVersion(version.id)} type="button">Przywróć</button></div>)}</div></div>}
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
              <div className="mb-6 grid gap-4 border-t border-white/8 pt-5 lg:grid-cols-2">
                <form className="rounded border border-blue-500/30 bg-[#111827] p-4" onSubmit={(event) => void createMongoDocument(event)}><h2 className="mb-2 text-xs font-semibold text-white">Nowy dokument</h2><select aria-label="Kolekcja nowego dokumentu" className={`${inputClass} mb-2`} onChange={(event) => setActiveCollection(event.target.value)} value={activeCollection}>{snapshot.database.collections.filter((name) => !["users", "auth_sessions", "auth_attempts", "audit_logs", "owner_settings", "integrations", "system_health"].includes(name)).map((name) => <option key={name} value={name}>{name}</option>)}</select><textarea aria-label="Dokument JSON" className={`${inputClass} font-mono text-xs`} onChange={(event) => setMongoDocument(event.target.value)} rows={5} value={mongoDocument} /><button className={`${primaryButtonClass} mt-2`} disabled={busy} type="submit">Utwórz dokument</button></form>
                <form className="rounded border border-blue-500/30 bg-[#111827] p-4" onSubmit={(event) => void addMongoField(event)}><h2 className="mb-2 text-xs font-semibold text-white">Dodaj pole do dokumentów</h2><select aria-label="Kolekcja nowego pola" className={`${inputClass} mb-2`} onChange={(event) => setActiveCollection(event.target.value)} value={activeCollection}>{snapshot.database.collections.filter((name) => !["users", "auth_sessions", "auth_attempts", "audit_logs", "owner_settings", "integrations", "system_health"].includes(name)).map((name) => <option key={name} value={name}>{name}</option>)}</select><div className="grid gap-2 sm:grid-cols-2"><input className={inputClass} onChange={(event) => setMongoField(event.target.value)} placeholder="nazwa_pola" value={mongoField} /><input className={inputClass} onChange={(event) => setMongoFieldValue(event.target.value)} placeholder="Wartość domyślna" value={mongoFieldValue} /></div><button className={`${buttonClass} mt-2`} disabled={busy || !mongoField.trim()} type="submit">Dodaj pole</button><p className="mt-2 text-[10px] text-[#9CA3AF]">Wartość trafia do dokumentów, w których to pole nie występuje.</p></form>
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
            <p className="mb-5 rounded border border-amber-400/30 bg-amber-500/10 p-3 text-[11px] leading-5 text-amber-100">Zmiany plików zapisują się w katalogu procesu aplikacji. Na hostingu z efemerycznym systemem plików mogą nie przetrwać restartu; Git Center wymaga lokalnego checkoutu repozytorium.</p>
            <section className="mb-6 rounded-lg border border-[#374151] bg-[#1F2937] p-4">
              <div className="mb-3 flex items-center gap-2"><span className="rounded border border-[#4B5563] px-2 py-1 font-mono text-[9px] uppercase text-[#D1D5DB]">Znajdź i zamień</span><span className="text-[10px] text-[#9CA3AF]">Podgląd przed zapisem · dopasowanie dokładne</span></div>
              <form className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]" onSubmit={(event) => void previewReplace(event)}>
                <Field label="Szukaj" onChange={setFindText} value={findText} />
                <Field label="Zamień na" onChange={setReplaceText} value={replaceText} />
                <button className={`${buttonClass} self-end`} disabled={busy || !findText} type="submit">Podgląd zmian</button>
              </form>
              {replaceChanges.length > 0 && <div className="mt-4 rounded-md border border-blue-500/30 bg-[#111827] p-3">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><p className="text-xs text-[#D1D5DB]">{replaceTotal} wystąpień · {replaceChanges.length} plików{replaceChanges.length === 100 ? "+" : ""}</p><button className={primaryButtonClass} disabled={busy} onClick={() => void applyReplace()} type="button">Zastosuj</button></div>
                <div className="max-h-60 space-y-2 overflow-auto">{replaceChanges.map((change) => <details className="rounded border border-[#374151] p-2" key={change.path}><summary className="cursor-pointer font-mono text-[10px] text-blue-200">{change.path} · {change.count} zmian</summary><pre className="mt-2 overflow-auto whitespace-pre-wrap text-[10px] leading-4 text-[#D1D5DB]">{change.preview}</pre></details>)}</div>
              </div>}
            </section>
            <section className="mb-6 rounded-lg border border-blue-500/30 bg-[#111827] p-4">
              <div className="mb-3 flex items-center gap-2"><span className="rounded border border-blue-400/30 bg-blue-500/10 px-2 py-1 font-mono text-[9px] uppercase text-blue-200">AI File Editor</span><span className="text-[10px] text-[#9CA3AF]">Propozycja jest tylko podglądem do zatwierdzenia</span></div>
              <form className="flex flex-col gap-3 sm:flex-row sm:items-end" onSubmit={(event) => void requestAiProposal(event)}>
                <label className="block min-w-0 flex-1"><span className="mb-1.5 block text-xs font-semibold text-[#D1D5DB]">Co chcesz zmienić?</span><input className={inputClass} onChange={(event) => setAiInstruction(event.target.value)} placeholder="Np. zmień kolor głównego przycisku na niebieski" value={aiInstruction} /></label>
                <button className={buttonClass} disabled={busy || !selectedFile || !aiInstruction.trim()} type="submit">Utwórz propozycję</button>
              </form>
              {aiProposal && <div className="mt-3 rounded border border-blue-500/30 p-3"><p className="mb-2 text-[10px] text-blue-200">Podgląd propozycji dla {selectedFile}</p><pre className="max-h-60 overflow-auto whitespace-pre-wrap text-[10px] leading-4 text-[#D1D5DB]">{aiProposal}</pre><button className={`${primaryButtonClass} mt-3`} onClick={() => void acceptAiProposal()} type="button">Wczytaj do edytora</button></div>}
            </section>
            <div className="grid min-h-[65vh] border border-white/8 lg:grid-cols-[280px_minmax(0,1fr)]">
              <div className="border-b border-white/8 lg:border-b-0 lg:border-r"><form className="flex gap-2 border-b border-white/8 p-3" onSubmit={(event) => void runFileSearch(event)}><input aria-label="Szukaj w plikach" className={`${inputClass} min-w-0 py-2 text-[11px]`} onChange={(event) => setFileQuery(event.target.value)} placeholder="Szukaj folderów, plików i treści" value={fileQuery} /><button aria-label="Uruchom wyszukiwanie" className={buttonClass} type="submit">⌕</button></form><div className="max-h-[65vh] overflow-y-auto p-2">{uniqueTreeEntries.map((entry) => entry.isFolder ? <button className="block w-full truncate rounded px-2 py-2 text-left font-mono text-[10px] text-[#D1D5DB] hover:bg-[#293548]" key={`folder:${entry.path}`} onClick={() => setExpandedFolders((previous) => { const next = new Set(previous); if (next.has(entry.path)) next.delete(entry.path); else next.add(entry.path); return next; })} style={{ paddingLeft: `${8 + entry.depth * 12}px` }} type="button">{expandedFolders.has(entry.path) ? "▾" : "▸"} {entry.label}/</button> : <button className={`block w-full truncate rounded px-2 py-2 text-left font-mono text-[10px] ${selectedFile === entry.path ? "bg-blue-500/15 text-blue-200" : "text-[#D1D5DB] hover:bg-[#293548]"}`} key={`file:${entry.path}`} onClick={() => void perform(() => openFile(entry.path), "Plik otwarty.")} style={{ paddingLeft: `${16 + entry.depth * 12}px` }} type="button">{entry.label}</button>)}{files.length === 0 && <p className="px-2 py-6 text-[10px] text-slate-600">Brak wyników.</p>}</div></div>
              <div className="flex min-w-0 flex-col"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/8 px-4 py-3"><span className="truncate font-mono text-[10px] text-slate-400">{selectedFile || "Wybierz plik z listy"}</span><button className={primaryButtonClass} disabled={!selectedFile || busy} onClick={() => void saveFile()} type="button">Zapisz plik</button></div><textarea aria-label="Treść pliku" className="min-h-[55vh] flex-1 resize-none bg-[#090e14] p-4 font-mono text-[11px] leading-5 text-slate-300 outline-none" onChange={(event) => setFileContent(event.target.value)} spellCheck={false} value={fileContent} /></div>
            </div>
          </section>}

          {section === "command" && <section className="rounded-xl border border-blue-500/30 bg-[#111827] p-4 sm:p-6">
            <SectionHeading detail="Opisz zmianę zwykłym językiem. AI wybierze bezpieczny plik tekstowy i pokaże propozycję; zapis wymaga Twojej akceptacji." eyebrow="Owner Studio / AI Operator" mode="edit" title="Owner Command Center" />
            <form className="max-w-3xl" onSubmit={(event) => void executeOwnerCommand(event)}>
              <label className="block"><span className="mb-2 block text-sm font-semibold text-[#D1D5DB]">Co chcesz zmienić?</span><textarea className={`${inputClass} min-h-32 resize-y`} onChange={(event) => setAiInstruction(event.target.value)} placeholder="Np. zmień nazwę „Henryk Command Center” na „Qualitet OS” albo zmień tło panelu na ciemniejsze." value={aiInstruction} /></label>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3"><p className="max-w-lg text-[10px] leading-4 text-[#9CA3AF]">Model AI działa tylko po skonfigurowaniu Ollama. Nie uruchamia poleceń powłoki ani nie zapisuje zmian bez Twojego potwierdzenia.</p><button className={primaryButtonClass} disabled={busy || aiInstruction.trim().length < 3} type="submit">Znajdź plik i pokaż zmianę</button></div>
            </form>
            {aiProposal && <div className="mt-6 max-w-4xl rounded border border-blue-500/30 bg-[#0B0F19] p-4"><div className="mb-3 flex flex-wrap items-center justify-between gap-2"><p className="text-xs font-semibold text-white">Propozycja dla <code className="font-mono text-blue-200">{selectedFile}</code></p><button className={primaryButtonClass} onClick={() => void acceptAiProposal()} type="button">Otwórz w edytorze</button></div><pre className="max-h-[50vh] overflow-auto whitespace-pre-wrap text-[10px] leading-5 text-[#D1D5DB]">{aiProposal}</pre></div>}
            <div className="mt-6 grid gap-3 sm:grid-cols-3">{[["CRM / Marketplace", "Otwórz tabele i edytuj dane bez plików.", "crm"], ["Agenci AI", "Dodaj lub edytuj agentów, modele i role.", "agents"], ["MongoDB", "Kolekcje, dokumenty, pola i eksport.", "mongodb"]].map(([title, detail, target]) => <button className="rounded border border-[#374151] bg-[#1F2937] p-3 text-left hover:border-[#4B5563]" key={target} onClick={() => void changeSection(target as SectionId)} type="button"><span className="block text-xs font-semibold text-white">{title}</span><span className="mt-1 block text-[10px] text-[#9CA3AF]">{detail}</span></button>)}</div>
          </section>}

          {section === "git" && <section className="rounded-xl border border-[#374151] bg-[#1F2937] p-4 sm:p-6">
            <SectionHeading detail="Podgląd repozytorium i jawne operacje. Commit obejmuje wyłącznie wybrane pliki; pull działa tylko fast-forward." eyebrow="Source Control / Git" mode="mixed" title="Git Center" />
            {!gitSnapshot ? <button className={buttonClass} onClick={() => void perform(loadGit, "Status Git odświeżony.")} type="button">Odczytaj status Git</button> : !gitSnapshot.available ? <p className="rounded border border-amber-400/30 bg-amber-500/10 p-4 text-sm text-amber-200">{gitSnapshot.error || "Repozytorium Git niedostępne w tym środowisku."}</p> : <>
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded border border-[#374151] bg-[#111827] p-4"><div><p className="font-mono text-[9px] uppercase text-[#9CA3AF]">Gałąź</p><p className="mt-1 font-mono text-sm text-white">{gitSnapshot.branch}</p><p className="mt-1 text-[10px] text-[#9CA3AF]">{gitSnapshot.files?.length ?? 0} zmienionych plików</p></div><div className="flex flex-wrap gap-2"><button className={buttonClass} disabled={busy} onClick={() => void perform(() => loadGit(), "Status odświeżony.")} type="button">Odśwież</button><button className={buttonClass} disabled={busy || gitSnapshot.branch !== "main"} onClick={() => { if (window.confirm("Pobrać zmiany z origin/main? Operacja zadziała tylko dla czystego worktree.")) void performGitAction("pull"); }} type="button">Pull main</button><button className={primaryButtonClass} disabled={busy || gitSnapshot.branch !== "main"} onClick={() => { if (window.confirm("Wysłać istniejące commity gałęzi main do origin?")) void performGitAction("push"); }} type="button">Push main</button></div></div>
              <form className="mb-7 rounded border border-blue-500/30 bg-[#111827] p-4" onSubmit={(event) => void commitSelectedFiles(event)}>
                <h2 className="mb-3 text-xs font-semibold text-white">Zmiany lokalne · wybierz pliki do commita</h2>
                <div className="mb-3 max-h-56 space-y-1 overflow-auto">{gitSnapshot.files?.map((file) => <label className="flex items-center gap-2 rounded px-2 py-2 text-[11px] text-[#D1D5DB] hover:bg-[#293548]" key={file.path}><input checked={gitSelection.has(file.path)} onChange={(event) => setGitSelection((previous) => { const next = new Set(previous); if (event.target.checked) next.add(file.path); else next.delete(file.path); return next; })} type="checkbox" /><span className="w-8 font-mono text-blue-200">{file.status}</span><span className="truncate font-mono">{file.path}</span></label>)}{gitSnapshot.files?.length === 0 && <p className="py-3 text-xs text-[#9CA3AF]">Brak lokalnych zmian.</p>}</div>
                <div className="flex flex-col gap-2 sm:flex-row"><input className={inputClass} maxLength={120} onChange={(event) => setGitMessage(event.target.value)} placeholder="Opis commita" value={gitMessage} /><button className={primaryButtonClass} disabled={busy || !gitMessage.trim() || gitSelection.size === 0} type="submit">Commit wybranych</button></div>
              </form>
              <div className="rounded border border-[#374151] bg-[#111827]"><div className="border-b border-[#374151] px-4 py-3"><h2 className="text-xs font-semibold text-white">Historia · rollback tworzy commit odwracający</h2></div><div className="divide-y divide-[#374151]">{gitSnapshot.commits?.map((commit) => <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3" key={commit.hash}><div className="min-w-0"><p className="truncate text-xs text-[#D1D5DB]">{commit.subject}</p><p className="mt-1 font-mono text-[9px] text-[#9CA3AF]">{commit.hash.slice(0, 10)} · {commit.age}</p></div><button className={buttonClass} disabled={busy || gitSnapshot.branch !== "main"} onClick={() => { if (window.confirm(`Utworzyć commit odwracający ${commit.hash.slice(0, 10)}? Wymagany jest czysty worktree.`)) void performGitAction("revert", { hash: commit.hash }); }} type="button">Rollback</button></div>)}</div></div>
            </>}
          </section>}

          {section === "deploy" && <section className="rounded-xl border border-[#374151] bg-[#1F2937] p-4 sm:p-6">
            <SectionHeading detail="Status wdrożenia i gotowość integracji. Akcje wdrożeniowe pojawią się po skonfigurowaniu uprawnień API." eyebrow="Operations / Deploy" mode="read" title="Deploy Center" />
            <div className="mb-4 flex justify-end"><button className={buttonClass} disabled={busy} onClick={() => void perform(loadDeploy, "Status wdrożeń odświeżony.")} type="button">Odśwież status</button></div>
            {!deploySnapshot ? <p className="text-xs text-[#9CA3AF]">Ładowanie statusu wdrożeń…</p> : <>
              <div className="grid gap-4 md:grid-cols-3">
                <article className="rounded border border-[#374151] bg-[#111827] p-4"><p className="font-mono text-[9px] uppercase text-[#9CA3AF]">Build / GitHub Actions</p><p className="mt-2 text-sm text-[#D1D5DB]">{deploySnapshot.github.latestRun?.name ?? (deploySnapshot.github.configured ? "Brak uruchomień" : "Nieskonfigurowane")}</p><p className="mt-1 text-[10px] text-[#9CA3AF]">{deploySnapshot.github.latestRun ? `${deploySnapshot.github.latestRun.status} · ${deploySnapshot.github.latestRun.conclusion ?? "w toku"}` : deploySnapshot.github.repository}</p>{deploySnapshot.github.latestRun?.htmlUrl && <a className="mt-2 inline-block text-[10px] text-blue-200 underline" href={deploySnapshot.github.latestRun.htmlUrl} rel="noreferrer" target="_blank">Otwórz workflow</a>}</article>
                <article className="rounded border border-[#374151] bg-[#111827] p-4"><p className="font-mono text-[9px] uppercase text-[#9CA3AF]">Render</p><p className="mt-2 text-sm text-[#D1D5DB]">{deploySnapshot.render.service?.name ?? (deploySnapshot.render.configured ? "Usługa skonfigurowana" : "Nieskonfigurowane")}</p><p className="mt-1 text-[10px] text-[#9CA3AF]">{deploySnapshot.render.service?.suspended ? "Usługa zawieszona" : deploySnapshot.render.service?.serviceType ?? "Wymagane RENDER_API_KEY i RENDER_SERVICE_ID"}</p></article>
                <article className="rounded border border-[#374151] bg-[#111827] p-4"><p className="font-mono text-[9px] uppercase text-[#9CA3AF]">Połączenie</p><p className="mt-2 text-sm text-[#D1D5DB]">GitHub: {deploySnapshot.github.configured ? "połączono" : "brak tokenu"}</p><p className="mt-1 text-sm text-[#D1D5DB]">Render: {deploySnapshot.render.configured ? "połączono" : "brak konfiguracji"}</p></article>
              </div>
              {deploySnapshot.errors.map((message) => <p className="mt-3 rounded border border-rose-400/30 bg-rose-500/10 p-3 text-xs text-rose-200" key={message}>{message}</p>)}
              <div className="mt-5 flex flex-wrap gap-2"><button className={buttonClass} disabled={busy || !deploySnapshot.render.configured} onClick={() => void triggerDeploy("render-deploy", "Uruchomić nowy deploy/restart usługi Render?")} type="button">Render Deploy / Restart</button><button className={buttonClass} disabled={busy || !deploySnapshot.github.configured || !deploySnapshot.github.workflowConfigured} onClick={() => void triggerDeploy("github-dispatch", "Uruchomić workflow GitHub Actions dla gałęzi main?")} type="button">GitHub Actions · Deploy main</button></div>
              <p className="mt-4 text-[10px] leading-4 text-[#9CA3AF]">Wymagane zmienne serwera: RENDER_API_KEY + RENDER_SERVICE_ID; GITHUB_PAT + GITHUB_DEPLOY_WORKFLOW (GITHUB_REPOSITORY opcjonalnie). Akcje wymagają jawnego potwierdzenia.</p>
            </>}
          </section>}

          {section === "ads" && <section className="rounded-xl border border-[#374151] bg-[#1F2937] p-4 sm:p-6">
            <SectionHeading detail="Panele kont, kampanii, wydatków, wyników i budżetów. Działania bazują na oficjalnych API i wyraźnie wskazują brak uprawnień." eyebrow="Advertising / Accounts" mode="mixed" title="Ads Center" />
            <div className="mb-5 flex flex-wrap gap-2">{[["facebook", "Meta Ads"], ["google_ads", "Google Ads"], ["allegro", "Allegro Ads"], ["olx", "OLX Ads"]].map(([provider, label]) => <button className={`${adsProvider === provider ? primaryButtonClass : buttonClass}`} key={provider} onClick={() => void perform(() => loadAds(provider), "Dane reklam odświeżone.")} type="button">{label}</button>)}</div>
            {!adsSnapshot ? <p className="text-xs text-[#9CA3AF]">Wybierz dostawcę, aby wczytać dane.</p> : <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded border border-[#374151] bg-[#111827] p-4"><div><p className="text-xs font-semibold text-white">{adsSnapshot.accounts.length} kont reklamowych</p><p className="mt-1 text-[10px] text-[#9CA3AF]">{adsSnapshot.message}</p></div><span className="rounded border border-[#4B5563] px-2 py-1 font-mono text-[9px] uppercase text-[#D1D5DB]">{adsSnapshot.status}</span></div>
              {adsSnapshot.accounts.length > 0 && <div className="overflow-x-auto rounded border border-[#374151]"><table className="w-full text-left text-[11px]"><thead className="bg-[#111827] text-[9px] uppercase text-[#9CA3AF]"><tr><th className="px-3 py-2">Konto reklamowe</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Wydatki</th><th className="px-3 py-2">Saldo</th></tr></thead><tbody>{adsSnapshot.accounts.map((account) => <tr className="border-t border-[#374151]" key={account.id}><td className="px-3 py-2 text-[#D1D5DB]">{account.name || account.id} <span className="font-mono text-[9px] text-[#9CA3AF]">{account.id}</span></td><td className="px-3 py-2 text-[#D1D5DB]">{account.status || "—"}</td><td className="px-3 py-2 text-[#D1D5DB]">{account.spend === null ? "—" : `${account.spend.toFixed(2)} ${account.currency}`}</td><td className="px-3 py-2 text-[#D1D5DB]">{account.balance === null ? "—" : `${account.balance.toFixed(2)} ${account.currency}`}</td></tr>)}</tbody></table></div>}
              {adsSnapshot.accounts.length > 0 && <div className="flex flex-wrap gap-2"><select className={`${inputClass} max-w-xl`} onChange={(event) => setSelectedAdAccount(event.target.value)} value={selectedAdAccount || snapshot?.integrations.find((item) => item.provider === adsProvider)?.accountName || ""}><option value="">Wybierz konto do raportowania kampanii</option>{adsSnapshot.accounts.map((account) => <option key={account.id} value={account.id}>{account.name || account.id} · {account.id}</option>)}</select><button className={buttonClass} disabled={busy || !selectedAdAccount} onClick={() => void saveAdsAccount()} type="button">Ustaw konto</button></div>}
              {adsSnapshot.campaigns.length > 0 && <div className="overflow-x-auto rounded border border-[#374151]"><table className="w-full min-w-[760px] text-left text-[11px]"><thead className="bg-[#111827] text-[9px] uppercase text-[#9CA3AF]"><tr>{["Kampania", "Status", "Budżet", "Wydatki (30 dni)", "Wyświetlenia", "Kliknięcia", "Konwersje"].map((title) => <th className="px-3 py-2" key={title}>{title}</th>)}</tr></thead><tbody>{adsSnapshot.campaigns.map((campaign) => <tr className="border-t border-[#374151]" key={campaign.id}><td className="px-3 py-2 text-[#D1D5DB]">{campaign.name || campaign.id}</td><td className="px-3 py-2 text-[#D1D5DB]">{campaign.status}</td><td className="px-3 py-2 text-[#D1D5DB]">{campaign.budget === null ? "—" : `${campaign.budget.toFixed(2)} ${campaign.currency} / ${campaign.budgetType}`}</td><td className="px-3 py-2 text-[#D1D5DB]">{campaign.spend.toFixed(2)} {campaign.currency}</td><td className="px-3 py-2 text-[#D1D5DB]">{campaign.impressions.toLocaleString("pl-PL")}</td><td className="px-3 py-2 text-[#D1D5DB]">{campaign.clicks.toLocaleString("pl-PL")}</td><td className="px-3 py-2 text-[#D1D5DB]">{campaign.conversions?.toLocaleString("pl-PL") ?? "—"}</td></tr>)}</tbody></table></div>}
              {adsSnapshot.status === "connected" && ["facebook", "google_ads"].includes(adsSnapshot.provider) && snapshot?.integrations.find((item) => item.provider === adsProvider)?.accountName && <form className="rounded border border-blue-500/30 bg-[#111827] p-4" onSubmit={(event) => void createAdCampaign(event)}><h2 className="mb-3 text-xs font-semibold text-white">Nowa kampania {adsSnapshot.provider === "facebook" ? "Meta" : "Google"} · domyślnie wstrzymana</h2><div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]"><input className={inputClass} onChange={(event) => setCampaignName(event.target.value)} placeholder="Nazwa kampanii" value={campaignName} />{adsSnapshot.provider === "facebook" ? <select className={inputClass} onChange={(event) => setCampaignObjective(event.target.value)} value={campaignObjective}><option value="OUTCOME_TRAFFIC">Ruch</option><option value="OUTCOME_AWARENESS">Rozpoznawalność</option><option value="OUTCOME_ENGAGEMENT">Aktywność</option><option value="OUTCOME_LEADS">Leady</option><option value="OUTCOME_SALES">Sprzedaż</option><option value="OUTCOME_APP_PROMOTION">Promocja aplikacji</option></select> : <input className={inputClass} min="1" onChange={(event) => setCampaignBudget(event.target.value)} placeholder="Budżet dzienny" step="0.01" type="number" value={campaignBudget} />}<button className={primaryButtonClass} disabled={busy || !campaignName.trim()} type="submit">Utwórz PAUSED</button></div><p className="mt-2 text-[10px] text-[#9CA3AF]">Utworzona kampania pozostaje PAUSED i nie emituje reklam. Google Ads wymaga budżetu; kampania Search jest tworzona z ręcznym CPC.</p></form>}
            </div>}
            <div className="mt-5 rounded border border-[#374151] bg-[#111827] p-4"><h2 className="text-xs font-semibold text-white">Konfiguracja API</h2><p className="mt-1 text-[10px] leading-4 text-[#9CA3AF]">Meta: ustaw access token i ID konta w Integrations. Google Ads: zapisz JSON danych OAuth/developer token jako sekret oraz Customer ID w polu Konto. OLX public API nie udostępnia kampanii i wydatków reklamowych. Allegro Ads wymaga osobnego dostępu do oficjalnego API Ads.</p><Link className="mt-3 inline-flex text-xs font-semibold text-blue-200 underline" href="#integrations" onClick={() => void changeSection("integrations")}>Otwórz Integrations</Link></div>
          </section>}

          {section === "integrations" && <section className="rounded-xl border border-blue-500/30 bg-[#111827] p-4 sm:p-6">
            <SectionHeading detail="Edytuj dane połączeń. Klucze są szyfrowane po stronie serwera i nie są odczytywane z powrotem do przeglądarki." eyebrow="Connections / Providers" mode="edit" title="Integrations" />
            {!snapshot ? <p className="text-sm text-slate-500">Ładowanie integracji…</p> : <div className="divide-y divide-white/8">{snapshot.integrations.map((integration) => <form className="grid gap-5 py-5 lg:grid-cols-[190px_minmax(0,1fr)]" key={integration.provider} onSubmit={(event) => void saveIntegration(event, integration)}><div><h2 className="text-sm font-semibold capitalize text-white">{integration.provider === "google_ads" ? "Google Ads" : integration.provider === "facebook" ? "Meta Ads" : integration.provider}</h2><p className="mt-1 font-mono text-[9px] uppercase tracking-wider text-slate-500">{integration.status}</p><p className="mt-2 text-[10px] text-slate-600">{integration.hasSecret ? "Sekret zapisany" : "Sekret nieustawiony"}</p></div><div className="grid gap-3 sm:grid-cols-2"><Field label="Nazwa" onChange={(value) => updateIntegration(integration.provider, "displayName", value)} value={integration.displayName} /><Field hint={integration.provider === "facebook" ? "ID konta Meta Ads, np. 123456789" : integration.provider === "google_ads" ? "Customer ID Google Ads (cyfry, bez myślników)" : undefined} label="Konto / workspace" onChange={(value) => updateIntegration(integration.provider, "accountName", value)} value={integration.accountName} /><Field label="Endpoint" onChange={(value) => updateIntegration(integration.provider, "endpoint", value)} value={integration.endpoint} /><Field label="Webhook URL" onChange={(value) => updateIntegration(integration.provider, "webhookUrl", value)} value={integration.webhookUrl} /><Field label="Klucz publiczny" onChange={(value) => updateIntegration(integration.provider, "publicKey", value)} value={integration.publicKey} /><Field hint={integration.provider === "google_ads" ? "JSON: developerToken, clientId, clientSecret, refreshToken, opcjonalnie loginCustomerId" : undefined} label={integration.provider === "google_ads" ? "Google Ads API credentials JSON" : "Token / secret"} onChange={(value) => setIntegrationSecrets((previous) => ({ ...previous, [integration.provider]: value }))} placeholder={integration.hasSecret ? "Zapisany · wpisz, aby zastąpić" : integration.provider === "google_ads" ? "{\"developerToken\":\"…\",\"clientId\":\"…\",\"clientSecret\":\"…\",\"refreshToken\":\"…\"}" : "Wartość sekretna"} value={integrationSecrets[integration.provider] ?? ""} /><div className="flex justify-end sm:col-span-2"><button className={primaryButtonClass} disabled={busy} type="submit">Zapisz integrację</button></div></div></form>)}</div>}
          </section>}

          <footer className="mt-12 flex flex-wrap items-center justify-between gap-2 border-t border-white/8 py-4 font-mono text-[9px] text-slate-600"><span>OWNER STUDIO · QUALITET ECOSYSTEM</span><span>Changes are recorded in the audit log</span></footer>
        </main>
      </div>
    </div>
  );
}