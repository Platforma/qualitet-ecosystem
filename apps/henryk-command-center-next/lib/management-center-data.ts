import alertsData from "../../../data/alerts.json";
import aiStatusData from "../../../data/ai-status.json";
import aiTasksData from "../../../data/ai-center/tasks.json";
import aiMemoryData from "../../../data/ai-center/memory.json";
import businessData from "../../../data/business.json";
import systemStatusData from "../../../data/system-status.json";
import { databaseCollections } from "./database-collections";
import {
  managementCenters,
  type ManagementCenter,
  type ManagementCenterId,
} from "./management-centers";

export type CenterMetric = {
  label: string;
  value: string;
  source: string;
};

export type CenterLog = {
  label: string;
  detail: string;
};

export type CenterConfiguration = {
  key: string;
  configured: boolean;
};

export type ManagementCenterSnapshot = {
  id: ManagementCenterId;
  label: string;
  description: string;
  api: string;
  state: "configured" | "unconfigured" | "limited";
  stateLabel: string;
  checkedAt: string;
  metrics: CenterMetric[];
  logs: CenterLog[];
  configuration: CenterConfiguration[];
  availableActions: string[];
  limitations: string[];
};

const businessMetrics: CenterMetric[] = [
  {
    label: "Użytkownicy",
    value: String(businessData.users),
    source: "data/business.json",
  },
  {
    label: "Firmy",
    value: String(businessData.companies),
    source: "data/business.json",
  },
  {
    label: "Leady",
    value: String(businessData.leads),
    source: "data/business.json",
  },
  {
    label: "Subskrypcje",
    value: String(businessData.subscriptions),
    source: "data/business.json",
  },
];

const aiAgentCount = Object.keys(aiStatusData).length;
const configuredAiAgents = Object.values(aiStatusData).filter(
  (agent) => agent.status === "ONLINE",
).length;

function getMetrics(center: ManagementCenter): CenterMetric[] {
  switch (center.dataSource) {
    case "ai":
      if (center.id === "ai-tasks") {
        return [
          {
            label: "Zadania w lokalnym snapshot",
            value: String(aiTasksData.items.length),
            source: aiTasksData.source,
          },
        ];
      }

      if (center.id === "ai-memory") {
        return [
          {
            label: "Sekcje pamięci",
            value: String(aiMemoryData.sections.length),
            source: aiMemoryData.source,
          },
        ];
      }

      if (center.id === "ai-logs") {
        return [
          {
            label: "Logi w lokalnym snapshot",
            value: "0",
            source: "Runtime AI wymaga API i MongoDB",
          },
        ];
      }

      return [
        { label: "Zarejestrowani agenci", value: String(aiAgentCount), source: "data/ai-status.json" },
        { label: "Agenci ONLINE", value: String(configuredAiAgents), source: "Status runtime niezweryfikowany" },
      ];
    case "business":
      if (center.id === "users") {
        return businessMetrics.filter((metric) => metric.label === "Użytkownicy");
      }
      if (center.id === "subscriptions") {
        return businessMetrics.filter((metric) => metric.label === "Subskrypcje");
      }
      if (center.id === "crm") {
        return businessMetrics.filter((metric) =>
          ["Firmy", "Leady"].includes(metric.label),
        );
      }
      if (center.id === "marketplace" || center.id === "shops") {
        return [
          {
            label: "Użytkownicy",
            value: String(businessData.users),
            source: "data/business.json",
          },
          {
            label: "Produkty i sklepy",
            value: "Brak źródła danych",
            source: "Brak kolekcji zarejestrowanych jako źródło tych metryk",
          },
        ];
      }
      if (center.id === "payments") {
        return [
          {
            label: "Przychód dzisiaj",
            value: `${businessData.revenueToday} PLN`,
            source: "data/business.json",
          },
          {
            label: "Przychód w miesiącu",
            value: `${businessData.revenueMonth} PLN`,
            source: "data/business.json",
          },
        ];
      }
      return businessMetrics;
    case "integration":
      return [
        {
          label: "Połączenie",
          value: "Sprawdź na Dashboardzie",
          source: "Integracje wykonują bezpieczny test tylko dla obsługiwanych API",
        },
      ];
    case "database":
      return [
        {
          label: "Kolekcje specyfikacji",
          value: String(databaseCollections.length),
          source: "lib/database-collections.ts; status instancji w /api/database",
        },
      ];
    case "health":
      return [
        {
          label: "Ocena projektu",
          value: `${systemStatusData.projectScore}%`,
          source: "data/system-status.json; nie jest testem runtime",
        },
      ];
    case "overview":
      return [
        ...businessMetrics,
        { label: "Agenci AI", value: String(aiAgentCount), source: "data/ai-status.json" },
        { label: "Alerty w snapshot", value: String(alertsData.alerts.length), source: "data/alerts.json" },
      ];
    case "settings":
      return [
        {
          label: "Zmiennych do sprawdzenia",
          value: String(
            managementCenters.reduce(
              (total, item) => total + item.requiredEnv.length,
              0,
            ),
          ),
          source: "Tylko obecność zmiennych; wartości sekretów nigdy nie są zwracane",
        },
      ];
  }
}

function getLogs(center: ManagementCenter): CenterLog[] {
  if (center.id === "ai-logs" || center.id === "ai-tasks") {
    return [
      {
        label: "Runtime AI",
        detail:
          "Historia runtime wymaga połączenia z backendem AI i MongoDB; lokalny snapshot jest pusty.",
      },
    ];
  }

  if (center.dataSource === "overview" || center.id === "system-health") {
    return alertsData.alerts.map((alert) => ({
      label: alert.severity,
      detail: alert.message,
    }));
  }

  return [
    {
      label: "Brak źródła logów",
      detail: "Ten moduł nie ma jeszcze podłączonego źródła logów runtime.",
    },
  ];
}

export function getManagementCenter(
  id: string,
): ManagementCenterSnapshot | null {
  const center = managementCenters.find((item) => item.id === id);
  if (!center) {
    return null;
  }

  const configuration = center.requiredEnv.map((key) => ({
    key,
    configured: Boolean(process.env[key]?.trim()),
  }));
  const configured =
    configuration.length > 0 &&
    configuration.every((item) => item.configured);
  const state =
    center.dataSource === "business" ||
    center.dataSource === "ai" ||
    center.dataSource === "health" ||
    center.dataSource === "overview"
      ? "limited"
      : configured
        ? "configured"
        : "unconfigured";

  const limitations: string[] = [];
  if (center.dataSource === "integration") {
    limitations.push(
      "Widoczność konfiguracji nie potwierdza połączenia. Szczegółowy test jest dostępny tylko dla integracji obsługiwanych przez Dashboard.",
      "Operacje modyfikujące są wyłączone do czasu wdrożenia uwierzytelniania właściciela.",
    );
  } else if (center.dataSource === "database") {
    limitations.push(
      "Lista kolekcji i status live są w istniejącym module MongoDB. Odczyt dokumentów, indeksów i rozmiaru bazy wymaga autoryzacji właściciela.",
    );
  } else if (center.dataSource === "ai") {
    limitations.push(
      "Status runtime, zadania i pamięć wymagają skonfigurowanego adresu backendu AI i tokenu po stronie serwera.",
      "Uruchamianie, zatrzymywanie i restart agentów są wyłączone do czasu wdrożenia uwierzytelniania właściciela.",
    );
  } else if (center.dataSource === "business") {
    limitations.push(
      "Liczby pochodzą z lokalnego snapshotu JSON i nie są odczytem dokumentów MongoDB.",
      "Edycja danych wymaga uwierzytelniania właściciela i potwierdzonych kolekcji.",
    );
  } else {
    limitations.push(
      "Akcje administracyjne są wyłączone do czasu wdrożenia uwierzytelniania właściciela.",
    );
  }

  return {
    id: center.id,
    label: center.label,
    description: center.description,
    api: `/api/centers/${center.id}`,
    state,
    stateLabel:
      state === "configured"
        ? "Konfiguracja obecna · połączenie niezweryfikowane"
        : state === "unconfigured"
          ? "Nie skonfigurowano"
          : "Dane częściowe · runtime niezweryfikowany",
    checkedAt: new Date().toISOString(),
    metrics: getMetrics(center),
    logs: getLogs(center),
    configuration,
    availableActions: ["Odśwież status"],
    limitations,
  };
}

export function getAllManagementCenters(): ManagementCenterSnapshot[] {
  return managementCenters.flatMap((center) => {
    const snapshot = getManagementCenter(center.id);
    return snapshot ? [snapshot] : [];
  });
}

export function isManagementCenterId(
  id: string,
): id is ManagementCenterId {
  return managementCenters.some((center) => center.id === id);
}
