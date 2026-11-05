import { NextResponse } from "next/server";
import { hasRole, requireUser } from "../../../../lib/server/auth";
import { getCollection, writeAuditLog } from "../../../../lib/server/database";
import {
  isOwnerIntegrationConfigured,
  ownerIntegrations,
  type OwnerIntegrationId,
} from "../../../../lib/owner-integrations";
import { getOwnerIntegrationSummaries } from "../../../../lib/server/owner-config";

const trackedCollections = [
  { collection: "users", label: "Użytkownicy" },
  { collection: "companies", label: "Firmy" },
  { collection: "leads", label: "Leady" },
  { collection: "products", label: "Produkty" },
  { collection: "outreach_campaigns", label: "Kampanie mailingowe" },
  { collection: "stores", label: "Sklepy" },
  { collection: "partners", label: "Partnerzy" },
  { collection: "advertisers", label: "Reklamodawcy" },
  { collection: "campaigns", label: "Kampanie reklamowe" },
  { collection: "orders", label: "Zamówienia" },
  { collection: "payments", label: "Płatności" },
  { collection: "subscriptions", label: "Subskrypcje" },
  { collection: "marketplace_ads", label: "Reklamy marketplace" },
  { collection: "analytics_events", label: "Zdarzenia analityczne" },
  { collection: "ai_tasks", label: "Zadania AI" },
] as const;

const automationModules = [
  {
    id: "companies",
    label: "Pozyskiwanie Firm",
    description: "Leady, firmy i kontakty z istniejącego panelu CRM.",
    providers: ["mongodb"] as OwnerIntegrationId[],
    manualRequirements: [],
    href: "/admin/companies",
  },
  {
    id: "mailing",
    label: "Mailing",
    description: "Kampanie outreach. Wysyłka wymaga skonfigurowanego dostawcy poczty i zgód.",
    providers: ["mongodb"] as OwnerIntegrationId[],
    manualRequirements: ["Dostawca poczty i potwierdzona zgoda odbiorców"],
    href: "/admin/outreach",
  },
  {
    id: "product-import",
    label: "Import Produktów",
    description: "Import katalogu CSV dostępny w panelu dostawcy.",
    providers: ["mongodb"] as OwnerIntegrationId[],
    manualRequirements: [],
    href: "/portal/supplier/dashboard",
  },
  {
    id: "ai-content",
    label: "AI Content",
    description: "Generowanie treści wymaga dostępnego runtime Ollama.",
    providers: ["ollama"] as OwnerIntegrationId[],
    manualRequirements: [],
    href: "/admin/setup",
  },
  {
    id: "ai-seo",
    label: "AI SEO",
    description: "Przepływ generowania i publikacji SEO wymaga integracji AI.",
    providers: ["ollama"] as OwnerIntegrationId[],
    manualRequirements: ["Przepływ publikacji SEO"],
  },
  {
    id: "ai-social",
    label: "AI Social Media",
    description: "Publikacja wymaga runtime AI oraz konta Meta.",
    providers: ["ollama", "facebook", "metaAds"] as OwnerIntegrationId[],
    manualRequirements: [],
    href: "/admin/setup",
  },
  {
    id: "deploy",
    label: "Deploy",
    description: "Test i ręczny deploy Render dostępny w Owner Setup.",
    providers: ["render"] as OwnerIntegrationId[],
    manualRequirements: [],
    href: "/admin/setup",
  },
  {
    id: "backup",
    label: "Backup",
    description: "Automatyczne kopie wymagają dostawcy magazynu i polityki retencji.",
    providers: [] as OwnerIntegrationId[],
    manualRequirements: ["Magazyn kopii zapasowych i polityka retencji"],
  },
  {
    id: "reports",
    label: "Raporty",
    description: "Raport dzienny jest generowany z bieżących kolekcji MongoDB.",
    providers: ["mongodb"] as OwnerIntegrationId[],
    manualRequirements: [],
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
    const [metrics, reports, runs, summaries] = await Promise.all([
      getMetrics(),
      getCollection("automation_reports").then((items) =>
        items.find({}).sort({ createdAt: -1 }).limit(5).toArray(),
      ),
      getCollection("automation_runs").then((items) =>
        items.find({}).sort({ createdAt: -1 }).limit(8).toArray(),
      ),
      getOwnerIntegrationSummaries(),
    ]);

    const modules = automationModules.map((module) => {
      const missingProviders = module.providers.filter((provider) => {
        const summary = summaries.get(provider);
        return !isOwnerIntegrationConfigured(provider, summary?.configuredFields ?? []);
      });
      const untestedProviders = module.providers.filter((provider) => {
        const summary = summaries.get(provider);
        return summary?.checkStatus !== "connected";
      });
      const requirements = [
        ...missingProviders.map((provider) =>
          ownerIntegrations.find((integration) => integration.id === provider)?.label ?? provider,
        ),
        ...module.manualRequirements,
      ];
      return {
        id: module.id,
        label: module.label,
        description: module.description,
        href: "href" in module ? module.href : undefined,
        requirements: requirements.length
          ? requirements
          : untestedProviders.length
            ? [`Testuj: ${untestedProviders.map((provider) => ownerIntegrations.find((integration) => integration.id === provider)?.label ?? provider).join(", ")}`]
            : [],
        state: requirements.length > 0
          ? ("needs-configuration" as const)
          : untestedProviders.length > 0
            ? ("unavailable" as const)
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
