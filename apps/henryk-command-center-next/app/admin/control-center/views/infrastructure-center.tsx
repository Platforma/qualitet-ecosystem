"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";

type DatabaseStatus = {
  checkedAt: string;
  state: "connected" | "unavailable" | "unconfigured";
  databaseName: string | null;
  collections: { name: string; state: string }[];
  actualCollections: {
    name: string;
    count: number;
    indexes: { name: string; keys: Record<string, number | string>; unique: boolean; expireAfterSeconds: number | null }[];
  }[];
};

type RenderService = {
  id: string;
  name: string;
  serviceType?: string;
  suspended?: string;
  dashboardUrl?: string;
  deploy?: { id?: string; status?: string; createdAt?: string; finishedAt?: string; commit?: string | null } | null;
  env?: Record<string, boolean>;
  customDomains?: { name?: string; verificationStatus?: string | null }[];
  errors?: string[];
};

type IntegrationStatus = {
  id: string;
  configured: boolean;
  state: "connected" | "unavailable" | "unconfigured";
  checkMessage: string | null;
};

type InfrastructureData = {
  database: DatabaseStatus | null;
  integrations: IntegrationStatus[];
  env: Record<string, boolean>;
  ollama: {
    url: string;
    model: string;
    status: string | null;
    checkMessage: string | null;
    checkedAt: string | null;
    activeAgents: number | null;
    memory: string | null;
    aiBackendError: string | null;
  };
  cloudflare: {
    configured: boolean;
    zoneAvailable: boolean | null;
    sslMode: string | null;
    domains: { domain: string; service: string; dns: boolean | null; proxied: boolean | null }[];
    error: string | null;
  };
  render: {
    configured: boolean;
    services: RenderService[];
    expectedServices: string[];
    logs: string[] | null;
    errors?: string[];
  };
  setup: {
    integrations: {
      id: string;
      configured: boolean;
      fields: { key: string; value: string; configured: boolean }[];
    }[];
  } | null;
};

export type InfrastructureSection =
  | "overview"
  | "infrastructure"
  | "mongodb"
  | "render"
  | "cloudflare"
  | "ollama"
  | "deploy"
  | "domains"
  | "env";

const sectionLinks: { id: Exclude<InfrastructureSection, "overview">; label: string }[] = [
  { id: "infrastructure", label: "Infrastruktura" },
  { id: "mongodb", label: "MongoDB" },
  { id: "render", label: "Render" },
  { id: "cloudflare", label: "Cloudflare" },
  { id: "ollama", label: "Ollama" },
  { id: "deploy", label: "Deploy" },
  { id: "domains", label: "Domeny" },
  { id: "env", label: "ENV" },
];

const domains = [
  { domain: "qualitet-market.com", service: "qualitet-henryk-command-center" },
  { domain: "admin.qualitet-market.com", service: "qualitet-henryk-command-center" },
  { domain: "shop.qualitet-market.com", service: "qualitet-shop-builder" },
  { domain: "ai.qualitet-market.com", service: "qualitet-ai-backend" },
];

const requiredRenderEnv: Record<string, string[]> = {
  "qualitet-henryk-command-center": [
    "MONGODB_URI",
    "MONGODB_DATABASE",
    "SESSION_SECRET",
    "OWNER_EMAIL",
    "OWNER_PASSWORD_HASH",
    "AI_BACKEND_URL",
    "AI_API_TOKEN",
  ],
  "qualitet-shop-builder": [
    "MONGODB_URI",
    "MONGODB_DATABASE",
    "SHOP_SESSION_SECRET",
    "SHOP_OWNER_EMAIL",
    "SHOP_OWNER_PASSWORD_HASH",
  ],
  "qualitet-ai-backend": [
    "MONGODB_URI",
    "MONGODB_DATABASE",
    "AI_API_TOKEN",
    "AI_OWNER_ID",
    "OLLAMA_URL",
    "OLLAMA_MODEL",
  ],
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function Status({ ok, label }: { ok: boolean | null; label?: string }) {
  const text = label ?? (ok === null ? "NIEZNANY" : ok ? "GOTOWE" : "BRAK");
  const tone =
    ok === null
      ? "bg-slate-100 text-slate-700"
      : ok
        ? "bg-emerald-100 text-emerald-800"
        : "bg-rose-100 text-rose-800";
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${tone}`}>{text}</span>;
}

function getRenderService(data: InfrastructureData | null, name: string) {
  return data?.render.services.find((service) => service.name === name);
}

function getDomainStatus(data: InfrastructureData | null, domain: string) {
  return data?.cloudflare.domains.find((item) => item.domain === domain);
}

function readiness(data: InfrastructureData | null) {
  if (!data) return { mongo: 0, ollama: 0, render: 0, cloudflare: 0, production: 0 };
  const expectedCollections = data.database?.collections ?? [];
  const presentCollections = expectedCollections.filter((item) => item.state === "present").length;
  const mongo = data.database?.state === "connected" && expectedCollections.length
    ? Math.round((presentCollections / expectedCollections.length) * 100)
    : 0;
  const ollamaConfigured = Boolean(data.ollama.url && data.ollama.model);
  const ollama = (ollamaConfigured ? 50 : 0) + (data.ollama.status === "connected" ? 50 : 0);
  const services = data.render.expectedServices.length || 3;
  const serviceCount = data.render.services.length;
  const envCount = data.render.services.reduce((total, service) => {
    const required = requiredRenderEnv[service.name] ?? [];
    return total + required.filter((name) => service.env?.[name] === true).length;
  }, 0);
  const requiredCount = Object.values(requiredRenderEnv).reduce((total, values) => total + values.length, 0);
  const render = data.render.configured
    ? Math.round(
        ((Math.min(serviceCount, services) / services) * 50) +
        ((envCount / requiredCount) * 30) +
        ((data.render.services.filter((service) => service.deploy).length / services) * 20),
      )
    : 0;
  const cfDomains = data.cloudflare.domains;
  const domainScore = cfDomains.length
    ? cfDomains.filter((item) => {
        const service = getRenderService(data, item.service);
        const renderDomain = service?.customDomains?.find((domain) => domain.name === item.domain);
        return item.dns === true && renderDomain?.verificationStatus === "verified";
      }).length / cfDomains.length
    : 0;
  const sslScore = data.cloudflare.sslMode === "full" || data.cloudflare.sslMode === "strict" ? 1 : 0;
  const cloudflare = data.cloudflare.configured && data.cloudflare.zoneAvailable
    ? Math.round((domainScore * 60) + (sslScore * 40))
    : 0;
  return {
    mongo,
    ollama,
    render: Math.min(100, render),
    cloudflare,
    production: Math.round((mongo + ollama + render + cloudflare) / 4),
  };
}

export default function InfrastructureCenter({ section = "overview" }: { section?: InfrastructureSection }) {
  const [data, setData] = useState<InfrastructureData | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [logService, setLogService] = useState("");
  const [actionService, setActionService] = useState("");
  const score = readiness(data);

  const refresh = useCallback(async () => {
    setError("");
    try {
      const responses = await Promise.all([
        fetch("/api/database?refresh=1", { cache: "no-store" }),
        fetch("/api/integrations", { cache: "no-store" }),
        fetch("/api/owner/deploy", { cache: "no-store" }),
        fetch("/api/admin/setup", { cache: "no-store" }),
      ]);
      const [database, integrations, deploy, setup] = await Promise.all(
        responses.map((response) => response.json() as Promise<unknown>),
      );
      const failed = responses.findIndex((response) => !response.ok);
      if (failed >= 0) {
        const result = [database, integrations, deploy, setup][failed];
        throw new Error(
          isRecord(result) && typeof result.error === "string"
            ? result.error
            : "Nie udało się odczytać pełnego stanu infrastruktury.",
        );
      }
      if (!isRecord(database) || !isRecord(integrations) || !isRecord(deploy) || !isRecord(setup)) {
        throw new Error("Otrzymano nieprawidłową odpowiedź infrastruktury.");
      }
      setData({
        database: database as unknown as DatabaseStatus,
        integrations: Array.isArray(integrations.integrations)
          ? integrations.integrations as IntegrationStatus[]
          : [],
        env: isRecord(integrations.env) ? integrations.env as Record<string, boolean> : {},
        ollama: isRecord(integrations.ollama)
          ? integrations.ollama as InfrastructureData["ollama"]
          : { url: "", model: "", status: null, checkMessage: null, checkedAt: null, activeAgents: null, memory: null, aiBackendError: null },
        cloudflare: isRecord(integrations.cloudflare)
          ? integrations.cloudflare as InfrastructureData["cloudflare"]
          : { configured: false, zoneAvailable: null, sslMode: null, domains: [], error: null },
        render: isRecord(deploy.render)
          ? deploy.render as InfrastructureData["render"]
          : { configured: false, services: [], expectedServices: [], logs: null },
        setup: Array.isArray(setup.integrations)
          ? setup as InfrastructureData["setup"]
          : null,
      });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Błąd odczytu infrastruktury.");
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(refresh);
  }, [refresh]);

  async function checkReadiness() {
    setBusy(true);
    setNotice("");
    setError("");
    const configuredOllama = data?.setup?.integrations.find((item) => item.id === "ollama")?.configured;
    const checks = configuredOllama ? ["ollama"] : [];
    const results = await Promise.allSettled(
      checks.map(async (provider) => {
        const response = await fetch("/api/admin/setup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "test", provider }),
        });
        const result: unknown = await response.json();
        if (!response.ok) {
          throw new Error(
            isRecord(result) && typeof result.error === "string"
              ? result.error
              : `Test ${provider} nie powiódł się.`,
          );
        }
      }),
    );
    const failures = results.flatMap((result) =>
      result.status === "rejected"
        ? [result.reason instanceof Error ? result.reason.message : "Test integracji nie powiódł się."]
        : [],
    );
    await refresh();
    setBusy(false);
    if (failures.length) {
      setError(failures.join(" "));
    } else {
      setNotice("Statusy MongoDB, Render i Cloudflare zostały sprawdzone na żywo. Ollama przetestowano, jeśli jest skonfigurowana.");
    }
  }

  async function manageRender(service: RenderService, action: "render-service-restart" | "render-service-deploy") {
    if (!service.id) return;
    const label = action === "render-service-restart" ? "restart" : "redeploy";
    if (!globalThis.confirm(`Uruchomić ${label} usługi ${service.name}?`)) return;
    setActionService(service.id);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/owner/deploy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, serviceId: service.id }),
      });
      const result: unknown = await response.json();
      if (!response.ok) {
        throw new Error(isRecord(result) && typeof result.error === "string" ? result.error : "Akcja Render nie powiodła się.");
      }
      setNotice(isRecord(result) && typeof result.result === "string" ? result.result : "Akcja Render rozpoczęta.");
      await refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Akcja Render nie powiodła się.");
    } finally {
      setActionService("");
    }
  }

  async function loadLogs(service: RenderService) {
    if (!service.id) return;
    setLogService(service.id);
    setError("");
    try {
      const response = await fetch(`/api/owner/deploy?logs=1&serviceId=${encodeURIComponent(service.id)}`, { cache: "no-store" });
      const result: unknown = await response.json();
      if (!response.ok) {
        throw new Error(isRecord(result) && typeof result.error === "string" ? result.error : "Nie udało się pobrać logów.");
      }
      const render = isRecord(result) && isRecord(result.render) ? result.render : null;
      const logs = render && Array.isArray(render.logs) ? render.logs.filter((line): line is string => typeof line === "string") : [];
      setData((current) => current && ({
        ...current,
        render: { ...current.render, logs },
      }));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Nie udało się pobrać logów.");
    } finally {
      setLogService("");
    }
  }

  const selectedSections: InfrastructureSection[] = section === "overview" || section === "infrastructure"
    ? ["mongodb", "ollama", "render", "cloudflare", "env"]
    : [section];

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-800">QUALITET · Owner Control Center</p>
          <h2 className="mt-1 text-2xl font-bold sm:text-3xl">{section === "overview" ? "Stan całego ekosystemu" : sectionLinks.find((item) => item.id === section)?.label ?? "Infrastruktura"}</h2>
          <p className="mt-2 text-sm text-slate-600">Bieżący odczyt MongoDB, Ollama, Render i Cloudflare. Sekrety nie są wyświetlane.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="min-h-11 rounded-xl border border-slate-300 px-4 text-sm font-semibold" onClick={() => void refresh()} type="button">Odśwież</button>
          <button className="min-h-11 rounded-xl bg-emerald-800 px-4 text-sm font-semibold text-white disabled:opacity-50" disabled={busy} onClick={() => void checkReadiness()} type="button">{busy ? "Sprawdzam…" : "SPRAWDŹ GOTOWOŚĆ"}</button>
        </div>
      </header>

      <nav aria-label="Sekcje infrastruktury" className="flex gap-2 overflow-x-auto pb-1">
        {sectionLinks.map((item) => (
          <Link className={`shrink-0 rounded-xl border px-3 py-2 text-sm font-semibold ${section === item.id ? "border-emerald-700 bg-emerald-50 text-emerald-900" : "border-slate-200 bg-white text-slate-700"}`} href={`/admin/${item.id}`} key={item.id}>
            {item.label}
          </Link>
        ))}
      </nav>

      {error && <p className="wrap-break-word rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900" role="alert">{error}</p>}
      {notice && <p className="wrap-break-word rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900" role="status">{notice}</p>}

      {(section === "overview" || section === "infrastructure" || section === "deploy") && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <ReadinessCard label="MongoDB Ready" value={score.mongo} />
          <ReadinessCard label="Ollama Ready" value={score.ollama} />
          <ReadinessCard label="Render Ready" value={score.render} />
          <ReadinessCard label="Cloudflare Ready" value={score.cloudflare} />
          <ReadinessCard label="Production Ready" value={score.production} />
        </div>
      )}

      {selectedSections.includes("mongodb") && <MongoPanel data={data} />}
      {selectedSections.includes("ollama") && <OllamaPanel data={data} />}
      {selectedSections.includes("render") && <RenderPanel data={data} busyService={actionService} logService={logService} onAction={manageRender} onLogs={loadLogs} />}
      {selectedSections.includes("cloudflare") && <CloudflarePanel data={data} />}
      {selectedSections.includes("domains") && <DomainsPanel data={data} />}
      {selectedSections.includes("env") && <EnvPanel data={data} />}
      {selectedSections.includes("deploy") && <DeployPanel data={data} busyService={actionService} logService={logService} onAction={manageRender} onLogs={loadLogs} />}
    </section>
  );
}

function ReadinessCard({ label, value }: { label: string; value: number }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
      <p className="text-xs text-slate-600">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}%</p>
    </article>
  );
}

function Panel({ title, children, href }: { title: string; children: ReactNode; href?: string }) {
  return (
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-lg font-semibold">{title}</h3>
        {href && <Link className="text-sm font-semibold text-emerald-800 underline" href={href}>Otwórz szczegóły</Link>}
      </div>
      {children}
    </section>
  );
}

function MongoPanel({ data }: { data: InfrastructureData | null }) {
  const database = data?.database;
  const state = database?.state === "connected";
  return (
    <Panel title="MongoDB" href="/admin/mongodb">
      <div className="flex flex-wrap items-center gap-3">
        <Status ok={database ? state : null} label={!database ? "ŁADOWANIE" : state ? "POŁĄCZONO" : database.state === "unconfigured" ? "BRAK KONFIGURACJI" : "NIEDOSTĘPNA"} />
        <span className="text-sm text-slate-700">Baza: <strong>{database?.databaseName ?? "—"}</strong></span>
        <span className="text-sm text-slate-700">Kolekcje: <strong>{database?.actualCollections.length ?? "—"}</strong></span>
      </div>
      {database?.actualCollections.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-140 text-left text-sm">
            <thead><tr className="border-b text-xs uppercase text-slate-500"><th className="py-2">Kolekcja</th><th>Rekordy (est.)</th><th>Indeksy</th></tr></thead>
            <tbody>{database.actualCollections.map((collection) => (
              <tr className="border-b border-slate-100" key={collection.name}>
                <td className="py-2 font-mono">{collection.name}</td>
                <td>{collection.count.toLocaleString("pl-PL")}</td>
                <td>{collection.indexes.map((index) => `${index.name} ${JSON.stringify(index.keys)}${index.unique ? " · unique" : ""}${index.expireAfterSeconds !== null ? " · TTL" : ""}`).join(", ") || "—"}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      ) : <p className="text-sm text-slate-600">Nie odczytano jeszcze kolekcji MongoDB.</p>}
      {database?.collections.some((collection) => collection.state === "missing") && (
        <p className="wrap-break-word text-sm text-amber-800">
          Brakujące kolekcje z katalogu aplikacji: {database.collections.filter((collection) => collection.state === "missing").map((collection) => collection.name).join(", ")}
        </p>
      )}
    </Panel>
  );
}

function OllamaPanel({ data }: { data: InfrastructureData | null }) {
  const ollama = data?.ollama;
  return (
    <Panel title="Ollama i AI" href="/admin/ollama">
      <div className="grid gap-3 sm:grid-cols-2">
        <Info label="URL" value={ollama?.url || "Brak konfiguracji"} />
        <Info label="Model" value={ollama?.model || "Brak konfiguracji"} />
        <Info label="Status" value={ollama?.status ?? "Nie przetestowano"} />
        <Info label="Pamięć AI" value={ollama?.memory ?? (data?.database?.state === "connected" ? "MongoDB dostępne" : "Nieznany")} />
        <Info label="Aktywni agenci" value={ollama?.activeAgents?.toLocaleString("pl-PL") ?? "Nieznany"} />
      </div>
      {ollama?.checkMessage && <p className="text-sm text-slate-600">{ollama.checkMessage}</p>}
      {ollama?.checkedAt && <p className="text-xs text-slate-500">Test Ollama: {new Date(ollama.checkedAt).toLocaleString("pl-PL")}</p>}
      {ollama?.aiBackendError && <p className="text-sm text-amber-800">{ollama.aiBackendError}</p>}
    </Panel>
  );
}

function RenderPanel({
  data,
  busyService,
  logService,
  onAction,
  onLogs,
}: {
  data: InfrastructureData | null;
  busyService: string;
  logService: string;
  onAction: (service: RenderService, action: "render-service-restart" | "render-service-deploy") => void;
  onLogs: (service: RenderService) => void;
}) {
  return (
    <Panel title="Render — usługi i deploy" href="/admin/render">
      {!data?.render.configured && <p className="text-sm text-amber-800">Brak działającego połączenia API Render. Skonfiguruj integrację w <Link className="underline" href="/admin/control-center/setup">Setup</Link>.</p>}
      {data?.render.errors?.map((message) => <p className="wrap-break-word text-sm text-amber-800" key={message}>{message}</p>)}
      <div className="space-y-3">
        {(data?.render.services ?? []).map((service) => (
          <article className="space-y-3 rounded-xl border border-slate-200 p-3 sm:p-4" key={service.id}>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h4 className="font-semibold">{service.name}</h4>
                <p className="mt-1 text-xs text-slate-600">{service.serviceType ?? "Usługa"} · Build/Deploy: {service.deploy?.status ?? "brak danych"} · {service.suspended === "suspended" ? "wstrzymana" : "aktywna"}</p>
                {service.deploy?.createdAt && <p className="mt-1 text-xs text-slate-500">Ostatni deploy: {new Date(service.deploy.createdAt).toLocaleString("pl-PL")}</p>}
              </div>
              {service.dashboardUrl && <a className="text-sm font-semibold text-emerald-800 underline" href={service.dashboardUrl} rel="noreferrer" target="_blank">Render Dashboard</a>}
            </div>
            {service.errors?.map((message) => <p className="text-xs text-amber-800" key={message}>{message}</p>)}
            {requiredRenderEnv[service.name] && (
              <p className="wrap-break-word text-xs text-slate-600">
                Brakujące ENV: {requiredRenderEnv[service.name].filter((name) => service.env?.[name] !== true).join(", ") || "brak"}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <button className="min-h-10 rounded-lg border border-slate-300 px-3 text-xs font-semibold disabled:opacity-50" disabled={busyService === service.id} onClick={() => onAction(service, "render-service-restart")} type="button">Restart</button>
              <button className="min-h-10 rounded-lg border border-slate-300 px-3 text-xs font-semibold disabled:opacity-50" disabled={busyService === service.id} onClick={() => onAction(service, "render-service-deploy")} type="button">Redeploy</button>
              <button className="min-h-10 rounded-lg border border-slate-300 px-3 text-xs font-semibold disabled:opacity-50" disabled={logService === service.id} onClick={() => onLogs(service)} type="button">{logService === service.id ? "Pobieram logi…" : "Pokaż logi"}</button>
            </div>
            {service.env && <p className="wrap-break-word text-xs text-slate-600">ENV: {Object.entries(service.env).filter(([, configured]) => configured).map(([name]) => name).join(", ") || "Brak"} <span className="text-slate-400">(wartości ukryte)</span></p>}
          </article>
        ))}
        {data?.render.expectedServices.filter((name) => !data.render.services.some((service) => service.name === name)).length ? (
          <p className="wrap-break-word text-sm text-amber-800">Brakujące usługi Render: {data.render.expectedServices.filter((name) => !data.render.services.some((service) => service.name === name)).join(", ")}</p>
        ) : null}
        {data?.render.services.length === 0 && !data.render.expectedServices.length && <p className="text-sm text-slate-600">Nie znaleziono usług QUALITET w połączonym koncie Render.</p>}
      </div>
      {data?.render.logs && <pre className="max-h-96 overflow-auto rounded-xl bg-slate-950 p-3 text-xs text-slate-100">{data.render.logs.length ? data.render.logs.join("\n") : "Brak logów w wybranym zakresie."}</pre>}
    </Panel>
  );
}

function CloudflarePanel({ data }: { data: InfrastructureData | null }) {
  return (
    <Panel title="Cloudflare" href="/admin/cloudflare">
      <div className="flex flex-wrap items-center gap-3">
        <Status ok={data?.cloudflare.zoneAvailable ?? null} label={!data?.cloudflare.configured ? "BRAK KONFIGURACJI" : data.cloudflare.zoneAvailable ? "POŁĄCZONO" : data.cloudflare.zoneAvailable === false ? "NIEDOSTĘPNA" : "NIEZNANY"} />
        <span className="text-sm text-slate-700">SSL: <strong>{data?.cloudflare.sslMode ?? "—"}</strong></span>
      </div>
      {data?.cloudflare.error && <p className="text-sm text-amber-800">{data.cloudflare.error}</p>}
      <DomainTable data={data} />
    </Panel>
  );
}

function DomainsPanel({ data }: { data: InfrastructureData | null }) {
  return <Panel title="Domeny" href="/admin/domains"><DomainTable data={data} /></Panel>;
}

function DomainTable({ data }: { data: InfrastructureData | null }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-150t-left text-sm">
        <thead><tr className="border-b text-xs uppercase text-slate-500"><th className="py-2">Domena</th><th>DNS</th><th>SSL</th><th>Cloudflare</th><th>Render</th></tr></thead>
        <tbody>{domains.map(({ domain, service }) => {
          const cf = getDomainStatus(data, domain);
          const render = getRenderService(data, service);
          const renderDomain = render?.customDomains?.find((item) => item.name === domain);
          const renderConfigured = renderDomain?.verificationStatus === "verified";
          return (
            <tr className="border-b border-slate-100" key={domain}>
              <td className="py-2 font-mono">{domain}</td>
              <td><Status ok={cf?.dns ?? null} /></td>
              <td><Status ok={data?.cloudflare.sslMode ? data.cloudflare.sslMode === "full" || data.cloudflare.sslMode === "strict" : null} label={data?.cloudflare.sslMode ?? undefined} /></td>
              <td><Status ok={data?.cloudflare.zoneAvailable ?? null} label={cf?.proxied === true ? "PROXY" : data?.cloudflare.zoneAvailable ? "AKTYWNY" : undefined} /></td>
              <td><Status ok={renderDomain ? renderConfigured : render ? false : null} label={renderDomain?.verificationStatus ?? undefined} /></td>
            </tr>
          );
        })}</tbody>
      </table>
    </div>
  );
}

function EnvPanel({ data }: { data: InfrastructureData | null }) {
  const expected: { key: string; service: string; env: string }[] = [
    { key: "MONGODB_URI", service: "qualitet-henryk-command-center", env: "MONGODB_URI" },
    { key: "OLLAMA_URL", service: "qualitet-ai-backend", env: "OLLAMA_URL" },
    { key: "OLLAMA_MODEL", service: "qualitet-ai-backend", env: "OLLAMA_MODEL" },
    { key: "AI_API_TOKEN", service: "qualitet-ai-backend", env: "AI_API_TOKEN" },
    { key: "OWNER_EMAIL", service: "qualitet-henryk-command-center", env: "OWNER_EMAIL" },
    { key: "SHOP_OWNER_EMAIL", service: "qualitet-shop-builder", env: "SHOP_OWNER_EMAIL" },
  ];
  return (
    <Panel title="ENV — status bez wartości" href="/admin/env">
      <ul className="divide-y divide-slate-100">
        <li className="grid grid-cols-[minmax(8rem,1fr)_auto_auto] gap-3 border-b py-2 text-xs font-semibold text-slate-500"><span>Zmienna</span><span>Panel runtime</span><span>Render</span></li>
        {expected.map(({ key, service, env }) => {
          const renderService = getRenderService(data, service);
          const configured = renderService?.env?.[env] ?? false;
          const localConfigured = data?.env[key] ?? false;
          return <li className="grid grid-cols-[minmax(8rem,1fr)_auto_auto] items-center gap-3 py-2" key={key}><span className="font-mono text-xs sm:text-sm">{key}</span><Status ok={data ? localConfigured : null} label={data ? localConfigured ? "SKONFIGUROWANE ✅" : "BRAK ❌" : "…"} /><Status ok={data ? configured : null} label={data ? configured ? "SKONFIGUROWANE ✅" : "BRAK ❌" : "…"} /></li>;
        })}
      </ul>
      <p className="text-xs text-slate-500">Odczytywane są wyłącznie nazwy kluczy i informacja o ustawieniu. Wartości sekretów nie opuszczają backendu.</p>
    </Panel>
  );
}

function DeployPanel({
  data,
  busyService,
  logService,
  onAction,
  onLogs,
}: {
  data: InfrastructureData | null;
  busyService: string;
  logService: string;
  onAction: (service: RenderService, action: "render-service-restart" | "render-service-deploy") => void;
  onLogs: (service: RenderService) => void;
}) {
  return <RenderPanel data={data} busyService={busyService} logService={logService} onAction={onAction} onLogs={onLogs} />;
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 break-all text-sm font-semibold text-slate-900">{value}</p></div>;
}
