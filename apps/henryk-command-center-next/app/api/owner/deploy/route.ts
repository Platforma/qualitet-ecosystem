import { NextResponse } from "next/server";
import { hasRole, requireUser } from "../../../../lib/server/auth";
import { writeAuditLog } from "../../../../lib/server/database";
import { getOwnerIntegrationValues } from "../../../../lib/server/owner-config";
import { readJsonBody } from "../../../../lib/server/request";

const githubApi = "https://api.github.com";
const renderApi = "https://api.render.com/v1";
const renderServiceNames = new Set([
  "qualitet-henryk-command-center",
  "qualitet-shop-builder",
  "qualitet-ai-backend",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function unwrapItems(value: unknown, key: string): Record<string, unknown>[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!isRecord(item)) return [];
    const record = isRecord(item[key]) ? item[key] : item;
    return [record as Record<string, unknown>];
  });
}

function safeLogLine(value: unknown) {
  return JSON.stringify(value)
    .replace(/mongodb(?:\+srv)?:\/\/[^\s"'\\]+/gi, "[REDACTED_MONGODB_URI]")
    .replace(/\bBearer\s+\S+/gi, "Bearer [REDACTED]")
    .replace(/"([^"]*(?:mongodb(?:\+srv)?_?uri|token|secret|password|authorization|api[_-]?key)[^"]*)"\s*:\s*"[^"]*"/gi, '"$1":"[REDACTED]"')
    .replace(/((?:mongodb(?:\+srv)?_?uri|token|secret|password|authorization|api[_-]?key)\s*[:=]\s*)["']?[^,\s"'}]+/gi, "$1[REDACTED]")
    .slice(0, 4_000);
}

async function getRenderProjectServices(apiKey: string) {
  const response = await fetch(`${renderApi}/services?limit=100`, {
    headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  const result: unknown = await response.json();
  if (!response.ok) throw new Error(`Render API zwróciło HTTP ${response.status}.`);
  return unwrapItems(result, "service").filter(
    (service) =>
      typeof service.name === "string" && renderServiceNames.has(service.name),
  );
}

async function renderGet(path: string, apiKey: string) {
  const response = await fetch(`${renderApi}${path}`, {
    headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(12_000),
  });
  const result: unknown = await response.json();
  if (!response.ok) throw new Error(`Render API zwróciło HTTP ${response.status}.`);
  return result;
}

function githubConfiguration() {
  const token = process.env.GITHUB_PAT?.trim() ?? "";
  const repository = process.env.GITHUB_REPOSITORY?.trim() || "Platforma/qualitet-ecosystem";
  const workflow = process.env.GITHUB_DEPLOY_WORKFLOW?.trim() ?? "";
  return {
    token,
    repository,
    workflow,
    valid: /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository) &&
      /^[A-Za-z0-9_.-]+$/.test(workflow),
  };
}

async function githubRequest(path: string, token: string, init?: RequestInit) {
  const response = await fetch(new URL(path, githubApi), {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null);
    const message = isRecord(body) && typeof body.message === "string"
      ? body.message
      : `GitHub API zwróciło HTTP ${response.status}.`;
    throw new Error(message);
  }
  if (response.status === 204) return null;
  return response.json() as Promise<unknown>;
}

export async function GET(request: Request) {
  const auth = await requireUser(request);
  if ("response" in auth) return auth.response;
  if (!hasRole(auth.user, ["owner"])) {
    return NextResponse.json({ error: "Wymagane są uprawnienia właściciela." }, { status: 403 });
  }

  const github = githubConfiguration();
  const renderConfig = await getOwnerIntegrationValues("render");
  const renderKey = renderConfig?.apiKey?.trim() ?? "";
  const renderService = renderConfig?.serviceId?.trim() ?? "";
  const search = new URL(request.url).searchParams;
  const requestedServiceId = search.get("serviceId");
  const includeLogs = search.get("logs") === "1";
  let latestRun: Record<string, unknown> | null = null;
  let render: Record<string, unknown> | null = null;
  const services: Record<string, unknown>[] = [];
  let logs: string[] | null = null;
  const errors: string[] = [];

  if (github.token && github.valid) {
    try {
      const [owner, repository] = github.repository.split("/");
      const path = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repository)}/actions/workflows/${encodeURIComponent(github.workflow)}/runs?per_page=1`;
      const result = await githubRequest(path, github.token);
      if (isRecord(result) && Array.isArray(result.workflow_runs) && isRecord(result.workflow_runs[0])) {
        const run = result.workflow_runs[0];
        latestRun = {
          name: run.name,
          status: run.status,
          conclusion: run.conclusion,
          htmlUrl: run.html_url,
          updatedAt: run.updated_at,
        };
      }
    } catch (error) {
      errors.push(error instanceof Error ? `GitHub: ${error.message}` : "GitHub Actions status niedostępny.");
    }
  }

  if (renderKey && renderService) {
    try {
      const response = await fetch(`https://api.render.com/v1/services/${encodeURIComponent(renderService)}`, {
        headers: { Authorization: `Bearer ${renderKey}`, Accept: "application/json" },
        cache: "no-store",
        signal: AbortSignal.timeout(15_000),
      });
      const result: unknown = await response.json();
      if (!response.ok || !isRecord(result)) {
        throw new Error(`Render API zwróciło HTTP ${response.status}.`);
      }
      render = {
        name: result.name,
        serviceType: result.type,
        suspended: result.suspended,
        dashboardUrl: result.dashboardUrl,
      };
    } catch (error) {
      errors.push(error instanceof Error ? `Render: ${error.message}` : "Render status niedostępny.");
    }
  }

  if (renderKey) {
    try {
      const renderServices = await getRenderProjectServices(renderKey);
      for (const service of renderServices) {
        if (typeof service.id !== "string") continue;
        const serviceId = service.id;
        const serviceErrors: string[] = [];
        const [deployResult, envResult, domainResult] = await Promise.allSettled([
          renderGet(`/services/${encodeURIComponent(serviceId)}/deploys?limit=1`, renderKey),
          renderGet(`/services/${encodeURIComponent(serviceId)}/env-vars?limit=100`, renderKey),
          renderGet(`/services/${encodeURIComponent(serviceId)}/custom-domains?limit=100`, renderKey),
        ]);
        if (deployResult.status === "rejected") serviceErrors.push("Deploy status niedostępny.");
        if (envResult.status === "rejected") serviceErrors.push("ENV status niedostępny.");
        if (domainResult.status === "rejected") serviceErrors.push("Domeny Render niedostępne.");
        const latestDeploy = deployResult.status === "fulfilled"
          ? unwrapItems(deployResult.value, "deploy")[0] ?? null
          : null;
        const envVars = envResult.status === "fulfilled"
          ? unwrapItems(envResult.value, "envVar")
          : [];
        const customDomains = domainResult.status === "fulfilled"
          ? unwrapItems(domainResult.value, "customDomain")
          : [];
        services.push({
          id: serviceId,
          name: service.name,
          serviceType: service.type,
          suspended: service.suspended,
          dashboardUrl: service.dashboardUrl,
          deploy: latestDeploy && {
            id: latestDeploy.id,
            status: latestDeploy.status,
            createdAt: latestDeploy.createdAt,
            finishedAt: latestDeploy.finishedAt,
            commit: isRecord(latestDeploy.commit) ? latestDeploy.commit.message : null,
          },
          env: Object.fromEntries(envVars.flatMap((item) =>
            typeof item.key === "string" ? [[item.key, Boolean(item.value)]] : [],
          )),
          customDomains: customDomains.map((domain) => ({
            name: domain.name,
            verificationStatus: domain.verificationStatus ?? domain.status ?? null,
          })),
          errors: serviceErrors,
        });
      }

      if (includeLogs && requestedServiceId) {
        const service = renderServices.find((item) => item.id === requestedServiceId);
        const ownerId = service?.ownerId;
        if (!service || typeof ownerId !== "string") {
          throw new Error("Nie znaleziono usługi Render w projekcie.");
        }
        const query = new URLSearchParams({
          ownerId,
          direction: "backward",
          limit: "50",
        });
        query.append("resource", requestedServiceId);
        query.append("type", "app");
        const logResult = await renderGet(`/logs?${query}`, renderKey);
        logs = isRecord(logResult) && Array.isArray(logResult.logs)
          ? logResult.logs.map(safeLogLine)
          : [];
      }
    } catch (error) {
      errors.push(error instanceof Error ? `Render: ${error.message}` : "Render status niedostępny.");
    }
  }

  return NextResponse.json({
    github: {
      configured: Boolean(github.token && github.valid),
      repository: github.repository,
      workflowConfigured: Boolean(github.workflow),
      latestRun,
    },
    render: {
      configured: Boolean(renderKey),
      service: render,
      services,
      expectedServices: [...renderServiceNames],
      logs,
      errors: errors.filter((error) => error.startsWith("Render:")),
    },
    errors,
  }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const auth = await requireUser(request);
  if ("response" in auth) return auth.response;
  if (!hasRole(auth.user, ["owner"])) {
    return NextResponse.json({ error: "Wymagane są uprawnienia właściciela." }, { status: 403 });
  }
  const parsed = await readJsonBody(request, 2 * 1024);
  if (!parsed.ok) return parsed.response;
  if (!isRecord(parsed.body) || typeof parsed.body.action !== "string") {
    return NextResponse.json({ error: "Nieprawidłowa akcja deploy." }, { status: 400 });
  }

  try {
    if (
      (parsed.body.action === "render-service-deploy" ||
        parsed.body.action === "render-service-restart") &&
      typeof parsed.body.serviceId === "string"
    ) {
      const renderConfig = await getOwnerIntegrationValues("render");
      const apiKey = renderConfig?.apiKey?.trim();
      if (!apiKey) {
        return NextResponse.json({ error: "Skonfiguruj Render API Key w panelu Setup." }, { status: 400 });
      }
      const serviceId = parsed.body.serviceId;
      const projectServices = await getRenderProjectServices(apiKey);
      const service = projectServices.find((item) => item.id === serviceId);
      if (!service || typeof service.name !== "string" || !renderServiceNames.has(service.name)) {
        return NextResponse.json({ error: "Usługa nie należy do QUALITET Ecosystem." }, { status: 400 });
      }
      const isRestart = parsed.body.action === "render-service-restart";
      const endpoint = isRestart
        ? `/services/${encodeURIComponent(serviceId)}/restart`
        : `/services/${encodeURIComponent(serviceId)}/deploys`;
      const response = await fetch(`${renderApi}${endpoint}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        ...(isRestart ? {} : { body: JSON.stringify({ clearCache: "do_not_clear" }) }),
        cache: "no-store",
        signal: AbortSignal.timeout(20_000),
      });
      const result: unknown = response.status === 204 ? null : await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(`Render API zwróciło HTTP ${response.status}.`);
      }
      const operationId = isRecord(result) && typeof result.id === "string" ? result.id : serviceId;
      await writeAuditLog({
        actorId: auth.user._id,
        action: isRestart ? "owner.deploy.render_restart" : "owner.deploy.render_service",
        entity: "render",
        entityId: operationId,
      });
      return NextResponse.json(
        { success: true, result: `${isRestart ? "Restart" : "Redeploy"} usługi ${service.name} uruchomiony.` },
        { status: 202 },
      );
    }

    if (parsed.body.action === "render-deploy") {
      const renderConfig = await getOwnerIntegrationValues("render");
      const apiKey = renderConfig?.apiKey?.trim();
      const serviceId = renderConfig?.serviceId?.trim();
      const deployHook = renderConfig?.deployHook?.trim();
      if ((!apiKey || !serviceId) && !deployHook) {
        return NextResponse.json({ error: "Skonfiguruj Render w /admin/setup." }, { status: 400 });
      }
      let deployId = "hook";
      if (apiKey && serviceId) {
        const response = await fetch(`https://api.render.com/v1/services/${encodeURIComponent(serviceId)}/deploys`, {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json", "Content-Type": "application/json" },
          body: JSON.stringify({ clearCache: "do_not_clear" }),
          cache: "no-store",
          signal: AbortSignal.timeout(20_000),
        });
        const result: unknown = await response.json();
        if (!response.ok) {
          throw new Error(`Render API zwróciło HTTP ${response.status}.`);
        }
        deployId = isRecord(result) && typeof result.id === "string" ? result.id : "started";
      } else if (deployHook) {
        const hook = new URL(deployHook);
        if (hook.protocol !== "https:" || hook.hostname !== "api.render.com" || !hook.pathname.startsWith("/deploy/")) {
          throw new Error("Zapisany Render Deploy Hook jest nieprawidłowy.");
        }
        const response = await fetch(hook, {
          method: "POST",
          cache: "no-store",
          redirect: "error",
          signal: AbortSignal.timeout(20_000),
        });
        if (!response.ok) {
          throw new Error(`Render Deploy Hook zwrócił HTTP ${response.status}.`);
        }
      }
      await writeAuditLog({ actorId: auth.user._id, action: "owner.deploy.render", entity: "render", entityId: deployId });
      return NextResponse.json({ success: true, result: `Wdrożenie Render uruchomione (${deployId}).` }, { status: 202 });
    }

    if (parsed.body.action === "github-dispatch") {
      const github = githubConfiguration();
      if (!github.token || !github.valid || !github.workflow) {
        return NextResponse.json({ error: "Skonfiguruj GITHUB_PAT, GITHUB_DEPLOY_WORKFLOW oraz poprawne GITHUB_REPOSITORY." }, { status: 400 });
      }
      const [owner, repository] = github.repository.split("/");
      const workflowPath = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repository)}/actions/workflows/${encodeURIComponent(github.workflow)}/dispatches`;
      await githubRequest(workflowPath, github.token, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ref: "main" }),
      });
      await writeAuditLog({ actorId: auth.user._id, action: "owner.deploy.github_dispatch", entity: "github_actions", entityId: github.workflow });
      return NextResponse.json({ success: true, result: `Workflow ${github.workflow} uruchomiony dla main.` }, { status: 202 });
    }

    return NextResponse.json({ error: "Nieznana akcja deploy." }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Operacja deploy nie powiodła się." },
      { status: 502 },
    );
  }
}
