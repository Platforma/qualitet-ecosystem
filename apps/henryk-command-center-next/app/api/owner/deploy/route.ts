import { NextResponse } from "next/server";
import { hasRole, requireUser } from "../../../../lib/server/auth";
import { writeAuditLog } from "../../../../lib/server/database";
import { getOwnerIntegrationValues } from "../../../../lib/server/owner-config";
import { readJsonBody } from "../../../../lib/server/request";

const githubApi = "https://api.github.com";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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
  let latestRun: Record<string, unknown> | null = null;
  let render: Record<string, unknown> | null = null;
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

  return NextResponse.json({
    github: {
      configured: Boolean(github.token && github.valid),
      repository: github.repository,
      workflowConfigured: Boolean(github.workflow),
      latestRun,
    },
    render: {
      configured: Boolean(renderKey && renderService),
      service: render,
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
