import { NextResponse } from "next/server";
import { hasRole, requireUser } from "../../../../lib/server/auth";
import { getCollection, writeAuditLog } from "../../../../lib/server/database";

const trackedCollections = [
  { collection: "companies", label: "Firmy" },
  { collection: "leads", label: "Leady" },
  { collection: "products", label: "Produkty" },
  { collection: "outreach_campaigns", label: "Kampanie mailingowe" },
  { collection: "stores", label: "Sklepy" },
  { collection: "ai_tasks", label: "Zadania AI" },
] as const;

const automationModules = [
  {
    id: "companies",
    label: "Pozyskiwanie firm",
    description: "Leady, firmy i kontakty z istniejącego panelu CRM.",
    requirements: ["MONGODB_URI"],
    href: "/admin/companies",
  },
  {
    id: "mailing",
    label: "Mailing",
    description: "Kampanie outreach i historia aktywności odbiorców.",
    requirements: ["MONGODB_URI", "EMAIL_PROVIDER_API_KEY"],
    href: "/admin/outreach",
  },
  {
    id: "product-import",
    label: "Import produktów",
    description: "Import CSV dostępny w panelu dostawcy; inne formaty wymagają adapterów.",
    requirements: ["MONGODB_URI"],
    href: "/portal/supplier/dashboard",
  },
  {
    id: "ai-content",
    label: "AI Content",
    description: "Generowanie treści wymaga skonfigurowanego backendu AI.",
    requirements: ["AI_BACKEND_URL", "AI_API_TOKEN"],
    href: "/portal/ai",
  },
  {
    id: "ai-seo",
    label: "AI SEO",
    description: "Przepływ generowania i publikacji SEO wymaga integracji AI.",
    requirements: ["AI_BACKEND_URL", "AI_API_TOKEN"],
  },
  {
    id: "ai-social",
    label: "AI Social Media",
    description: "Publikacja społecznościowa wymaga integracji AI i API kanału.",
    requirements: ["AI_BACKEND_URL", "FACEBOOK_ACCESS_TOKEN"],
    href: "/api/owner/ads",
  },
  {
    id: "reports",
    label: "Raporty",
    description: "Raporty dzienne z bieżących kolekcji MongoDB.",
    requirements: ["MONGODB_URI"],
  },
  {
    id: "monitoring",
    label: "Monitoring",
    description: "Podstawowy status aplikacji i połączenia z bazą.",
    requirements: [],
    href: "/api/health",
  },
  {
    id: "deploy",
    label: "Deploy",
    description: "Status GitHub Actions i wdrożeń dostępny w istniejącym API.",
    requirements: ["GITHUB_PAT"],
    href: "/api/owner/deploy",
  },
  {
    id: "backup",
    label: "Backup",
    description: "Wymaga skonfigurowanego zewnętrznego miejsca przechowywania kopii.",
    requirements: ["BACKUP_STORAGE_URL"],
  },
  {
    id: "store-builder",
    label: "AI Store Builder",
    description: "Kreator sklepów AI nie jest jeszcze podłączony do aplikacji.",
    requirements: ["AI_BACKEND_URL", "AI_API_TOKEN"],
  },
] as const;

async function getMetrics() {
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);

  return Promise.all(
    trackedCollections.map(async ({ collection, label }) => {
      const documents = await getCollection(collection);
      const [total, today] = await Promise.all([
        documents.countDocuments({}),
        documents.countDocuments({ createdAt: { $gte: startOfDay } }),
      ]);
      return { label, total, today };
    }),
  );
}

export async function GET(request: Request) {
  const auth = await requireUser(request);
  if ("response" in auth) return auth.response;
  if (!hasRole(auth.user, ["owner"])) {
    return NextResponse.json({ error: "Wymagane są uprawnienia właściciela." }, { status: 403 });
  }

  try {
    const [metrics, reports, runs] = await Promise.all([
      getMetrics(),
      getCollection("automation_reports").then((items) =>
        items.find({}).sort({ createdAt: -1 }).limit(5).toArray(),
      ),
      getCollection("automation_runs").then((items) =>
        items.find({}).sort({ createdAt: -1 }).limit(8).toArray(),
      ),
    ]);

    const modules = automationModules.map((module) => {
      const missing = module.requirements.filter((name) => !process.env[name]?.trim());
      const unavailable = module.id === "store-builder";
      return {
        ...module,
        state: unavailable
          ? ("unavailable" as const)
          : missing.length > 0
            ? ("needs-configuration" as const)
            : ("ready" as const),
      };
    });

    return NextResponse.json(
      {
        modules,
        metrics,
        reports: reports.map((report) => ({
          id: String(report._id),
          title: String(report.title),
          createdAt: new Date(report.createdAt).toISOString(),
          metrics: report.metrics,
        })),
        activity: runs.map((run) => ({
          action: String(run.action),
          status: String(run.status),
          createdAt: new Date(run.createdAt).toISOString(),
          summary: String(run.summary),
        })),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Automation Center data load failed:", error instanceof Error ? error.name : "UnknownError");
    return NextResponse.json(
      { error: "Nie udało się pobrać danych Automation Center. Sprawdź połączenie z MongoDB." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireUser(request);
  if ("response" in auth) return auth.response;
  if (!hasRole(auth.user, ["owner"])) {
    return NextResponse.json({ error: "Wymagane są uprawnienia właściciela." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Nieprawidłowy format żądania." }, { status: 400 });
  }
  if (
    typeof body !== "object" ||
    body === null ||
    !("action" in body) ||
    body.action !== "generate-daily-report"
  ) {
    return NextResponse.json({ error: "Nieobsługiwana akcja automatyzacji." }, { status: 400 });
  }

  try {
    const now = new Date();
    const metrics = await getMetrics();
    const date = now.toISOString().slice(0, 10);
    const title = `Raport dzienny ${date}`;
    const summary = metrics.map((metric) => `${metric.label}: ${metric.today} dzisiaj`).join(" · ");
    const report = {
      title,
      date,
      metrics,
      generatedBy: auth.user._id,
      createdAt: now,
    };
    const saved = await getCollection("automation_reports").then((items) =>
      items.insertOne(report),
    );

    await Promise.all([
      getCollection("memory_entries").then((memory) =>
        memory.updateOne(
          { key: `automation/daily-report/${date}` },
          {
            $set: { type: "daily_report", content: JSON.stringify(report), updatedAt: now },
            $setOnInsert: { key: `automation/daily-report/${date}`, createdAt: now },
          },
          { upsert: true },
        ),
      ),
      getCollection("history_events").then((history) =>
        history.insertOne({
          actorId: auth.user._id,
          type: "automation.report.generated",
          entity: "automation_reports",
          entityId: String(saved.insertedId),
          summary,
          createdAt: now,
        }),
      ),
      getCollection("alerts").then((alerts) =>
        alerts.insertOne({
          type: "automation.report.generated",
          severity: "info",
          message: `${title} został wygenerowany.`,
          read: false,
          createdAt: now,
        }),
      ),
      getCollection("analytics_events").then((events) =>
        events.insertOne({
          name: "automation.report.generated",
          actorId: auth.user._id,
          entityId: String(saved.insertedId),
          createdAt: now,
        }),
      ),
      getCollection("automation_runs").then((runs) =>
        runs.insertOne({
          action: "generate-daily-report",
          status: "completed",
          summary: title,
          actorId: auth.user._id,
          reportId: String(saved.insertedId),
          createdAt: now,
        }),
      ),
      writeAuditLog({
        actorId: auth.user._id,
        action: "automation.report.generate",
        entity: "automation_reports",
        entityId: String(saved.insertedId),
      }),
    ]);

    return NextResponse.json(
      { success: true, id: String(saved.insertedId), title },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Automation report generation failed:", error instanceof Error ? error.name : "UnknownError");
    return NextResponse.json(
      { error: "Nie udało się wygenerować i zapisać raportu. Sprawdź połączenie z MongoDB." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
