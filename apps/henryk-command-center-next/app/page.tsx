import type { ReactNode } from "react";
import alertsData from "../../../data/alerts.json";
import aiStatusData from "../../../data/ai-status.json";
import businessData from "../../../data/business.json";
import systemStatusData from "../../../data/system-status.json";
import IntegrationsStatus from "./integrations-status";

type IconName =
  | "activity"
  | "alert"
  | "arrow"
  | "brain"
  | "briefcase"
  | "cloud"
  | "globe"
  | "grid"
  | "link"
  | "server"
  | "settings"
  | "shop"
  | "sparkles"
  | "users";

function Icon({
  name,
  className = "size-5",
}: {
  name: IconName;
  className?: string;
}) {
  const paths: Record<IconName, ReactNode> = {
    activity: (
      <>
        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
      </>
    ),
    alert: (
      <>
        <path d="m10.29 3.86-8.3 14.37A2 2 0 0 0 3.72 21h16.56a2 2 0 0 0 1.73-2.77l-8.3-14.37a2 2 0 0 0-3.42 0Z" />
        <path d="M12 9v4m0 4h.01" />
      </>
    ),
    arrow: <path d="M7 17 17 7M7 7h10v10" />,
    brain: (
      <>
        <path d="M12 18V5" />
        <path d="M15 13a4.17 4.17 0 0 1-3-4 4.17 4.17 0 0 1-3 4" />
        <path d="M17.6 6.5a3 3 0 0 0-5.6-1.5 3 3 0 0 0-5.6 1.5A3 3 0 0 0 5 12a3 3 0 0 0 3 5.5 3 3 0 0 0 4 2.5 3 3 0 0 0 4-2.5 3 3 0 0 0 3-5.5 3 3 0 0 0-1.4-5.5Z" />
      </>
    ),
    briefcase: (
      <>
        <rect x="3" y="7" width="18" height="14" rx="2" />
        <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m-13 5h18m-11 0v2h4v-2" />
      </>
    ),
    cloud: (
      <>
        <path d="M20 16.2A4.5 4.5 0 0 0 18.5 7.5h-1.1A7 7 0 1 0 4 15.3" />
        <path d="M12 12v9m-4-4 4-4 4 4" />
      </>
    ),
    globe: (
      <>
        <circle cx="12" cy="12" r="10" />
        <path d="M2 12h20m-10-10a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10Z" />
      </>
    ),
    grid: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
      </>
    ),
    link: (
      <>
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
      </>
    ),
    server: (
      <>
        <rect x="3" y="3" width="18" height="8" rx="2" />
        <rect x="3" y="13" width="18" height="8" rx="2" />
        <path d="M7 7h.01M7 17h.01" />
      </>
    ),
    settings: (
      <>
        <path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z" />
        <path d="m19.4 15 .1.1a2 2 0 1 1-2.8 2.8l-.1-.1a2 2 0 0 0-3.4 1.4v.3a2 2 0 1 1-4 0v-.2A2 2 0 0 0 5.8 17l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a2 2 0 0 0-1.4-3.4h-.3a2 2 0 1 1 0-4h.2A2 2 0 0 0 3 4.2l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a2 2 0 0 0 3.4-1.4v-.3a2 2 0 1 1 4 0v.2a2 2 0 0 0 3.4 1.4l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a2 2 0 0 0 1.4 3.4h.3a2 2 0 1 1 0 4h-.2a2 2 0 0 0-1.4 3.4Z" />
      </>
    ),
    shop: (
      <>
        <path d="m3 9 2-6h14l2 6" />
        <path d="M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0M5 12v9h14v-9M9 21v-6h6v6" />
      </>
    ),
    sparkles: (
      <>
        <path d="m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2L12 3Z" />
        <path d="m19 14 1.2 2.8L23 18l-2.8 1.2L19 22l-1.2-2.8L15 18l2.8-1.2L19 14ZM5 2l1 2 2 1-2 1-1 2-1-2-2-1 2-1 1-2Z" />
      </>
    ),
    users: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2m6-10a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm10 10v-2a4 4 0 0 0-3-3.87m-1-11.13a4 4 0 0 1 0 7.75" />
      </>
    ),
  };

  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.7"
      viewBox="0 0 24 24"
    >
      {paths[name]}
    </svg>
  );
}

const navigation: { label: string; icon: IconName; href: string }[] = [
  { label: "Dashboard", icon: "grid", href: "#dashboard" },
  { label: "AI Center", icon: "sparkles", href: "#ai-center" },
  { label: "Alert Center", icon: "alert", href: "#alert-center" },
  { label: "Memory Center", icon: "brain", href: "#memory-center" },
  { label: "Business Center", icon: "briefcase", href: "#business-center" },
  { label: "World Intelligence", icon: "globe", href: "#world-intelligence" },
  { label: "Integracje", icon: "link", href: "#integracje" },
  { label: "CRM", icon: "users", href: "#crm" },
  { label: "Marketplace", icon: "shop", href: "#marketplace" },
];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: "PLN",
    maximumFractionDigits: 0,
  }).format(value);

export default function Home() {
  const aiAgents = Object.values(aiStatusData).filter(
    (agent) => agent.status === "ONLINE",
  ).length;
  const alertCount = alertsData.alerts.length;
  const projectScore = systemStatusData.projectScore ?? 0;

  const metrics = [
    {
      label: "Przychód dzisiaj",
      value: formatCurrency(businessData.revenueToday),
      icon: "briefcase" as const,
      detail: "Dane z warstwy JSON",
    },
    {
      label: "Aktywni agenci AI",
      value: `${aiAgents}`,
      icon: "sparkles" as const,
      detail: "Według statusu agentów",
    },
    {
      label: "Aktywne alerty",
      value: `${alertCount}`,
      icon: "alert" as const,
      detail: "Zarejestrowane w systemie",
    },
    {
      label: "Gotowość projektu",
      value: `${projectScore}%`,
      icon: "activity" as const,
      detail: "Ocena z danych projektu",
    },
  ];

  return (
    <div
      className="min-h-screen bg-[#f7f8fc] text-slate-900"
      id="dashboard"
    >
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col border-r border-slate-200/80 bg-white lg:flex">
        <a
          className="flex h-[76px] items-center gap-3 border-b border-slate-100 px-6"
          href="#dashboard"
        >
          <span className="flex size-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm shadow-indigo-200">
            <Icon name="sparkles" />
          </span>
          <span>
            <span className="block text-sm font-bold tracking-tight">
              HENRYK
            </span>
            <span className="block text-[11px] font-medium tracking-[0.16em] text-slate-400">
              COMMAND CENTER
            </span>
          </span>
        </a>

        <nav aria-label="Nawigacja główna" className="flex-1 px-3 py-6">
          <p className="px-3 pb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
            Workspace
          </p>
          <ul className="space-y-1">
            {navigation.map((item, index) => (
              <li key={item.label}>
                <a
                  aria-current={index === 0 ? "page" : undefined}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition ${
                    index === 0
                      ? "bg-indigo-50 text-indigo-700"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                  href={item.href}
                >
                  <Icon className="size-[18px]" name={item.icon} />
                  {item.label}
                  {item.label === "Alert Center" && alertCount > 0 && (
                    <span className="ml-auto rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                      {alertCount}
                    </span>
                  )}
                </a>
              </li>
            ))}
          </ul>

          <p className="px-3 pb-3 pt-8 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
            Ustawienia
          </p>
          <a
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
            href="#ustawienia"
          >
            <Icon className="size-[18px]" name="settings" />
            Ustawienia
          </a>
        </nav>

        <div className="border-t border-slate-100 p-4">
          <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
            <div className="flex size-9 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
              AQ
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold">AI_QUALITET</p>
              <p className="mt-0.5 text-[10px] text-slate-400">Owner</p>
            </div>
            <span
              aria-label="Status online"
              className="ml-auto size-2 rounded-full bg-emerald-500"
            />
          </div>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-10 flex h-[76px] items-center justify-between border-b border-slate-200/80 bg-white/90 px-5 backdrop-blur-md sm:px-8">
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-lg bg-indigo-600 text-white lg:hidden">
              <Icon name="sparkles" className="size-[18px]" />
            </span>
            <div>
              <p className="text-sm font-semibold">Dashboard</p>
              <p className="hidden text-[11px] text-slate-400 sm:block">
                Centrum dowodzenia Qualitet
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-[11px] font-medium text-slate-500 sm:flex">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              Widok danych JSON
            </span>
            <a
              aria-label="Przejdź do alertów"
              className="relative flex size-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50"
              href="#alert-center"
            >
              <Icon name="alert" className="size-[17px]" />
              {alertCount > 0 && (
                <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-amber-500" />
              )}
            </a>
            <a
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-700"
              href="#integracje"
            >
              <Icon name="link" className="size-4" />
              <span className="hidden sm:inline">Integracje</span>
            </a>
          </div>
        </header>

        <main className="mx-auto max-w-[1440px] px-5 py-8 sm:px-8 sm:py-10">
          <section className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-indigo-600">
                Panel operacyjny
              </p>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-[30px]">
                Witaj w Henryk Command Center
              </h1>
              <p className="mt-2 text-sm text-slate-500">
                Najważniejsze informacje o projekcie w jednym miejscu.
              </p>
            </div>
            <a
              className="inline-flex w-fit items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-600 shadow-sm transition hover:border-indigo-200 hover:text-indigo-700"
              href="#integracje"
            >
              <Icon name="activity" className="size-4" />
              Przegląd systemu
              <Icon name="arrow" className="size-3.5" />
            </a>
          </section>

          <section
            aria-label="Kluczowe wskaźniki"
            className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
          >
            {metrics.map((metric) => (
              <article
                className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-200/40"
                key={metric.label}
              >
                <div className="flex items-start justify-between">
                  <p className="text-xs font-medium text-slate-500">
                    {metric.label}
                  </p>
                  <span className="flex size-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                    <Icon className="size-[18px]" name={metric.icon} />
                  </span>
                </div>
                <p className="mt-3 text-[26px] font-bold tracking-tight text-slate-900">
                  {metric.value}
                </p>
                <p className="mt-1 text-[11px] text-slate-400">
                  {metric.detail}
                </p>
              </article>
            ))}
          </section>

          <section className="mt-8 grid gap-5 xl:grid-cols-[1.55fr_1fr]">
            <IntegrationsStatus />

            <article
              className="rounded-xl border border-slate-200/80 bg-white shadow-sm shadow-slate-200/40"
              id="alert-center"
            >
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
                <div>
                  <h2 className="text-sm font-semibold text-slate-800">
                    Alert Center
                  </h2>
                  <p className="mt-1 text-[11px] text-slate-400">
                    Ostatnie zdarzenia systemowe
                  </p>
                </div>
                <span className="flex size-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                  <Icon name="alert" className="size-4" />
                </span>
              </div>
              <ul className="space-y-3 p-5 sm:p-6">
                {alertsData.alerts.length > 0 ? (
                  alertsData.alerts.map((alert) => (
                    <li
                      className="flex gap-3 rounded-lg border border-slate-100 bg-slate-50/70 p-3"
                      key={alert.id}
                    >
                      <span className="mt-0.5 size-2 shrink-0 rounded-full bg-indigo-500" />
                      <div>
                        <p className="text-xs font-medium leading-5 text-slate-700">
                          {alert.message}
                        </p>
                        <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                          {alert.severity}
                        </p>
                      </div>
                    </li>
                  ))
                ) : (
                  <li className="rounded-lg border border-dashed border-slate-200 px-4 py-8 text-center text-xs text-slate-400">
                    Brak zarejestrowanych alertów.
                  </li>
                )}
              </ul>
            </article>
          </section>

          <section aria-label="Moduły centrum" className="mt-8" id="moduly">
            <div className="mb-4">
              <h2 className="text-sm font-semibold text-slate-800">
                Moduły centrum
              </h2>
              <p className="mt-1 text-[11px] text-slate-400">
                Przejdź do obszaru, który chcesz rozwijać.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                {
                  id: "ai-center",
                  title: "AI Center",
                  description: `${aiAgents} agentów AI ze statusem ONLINE`,
                  icon: "sparkles" as const,
                },
                {
                  id: "memory-center",
                  title: "Memory Center",
                  description: "Baza wiedzy i pamięć projektu",
                  icon: "brain" as const,
                },
                {
                  id: "business-center",
                  title: "Business Center",
                  description: `${businessData.users} użytkowników · ${businessData.leads} leadów`,
                  icon: "briefcase" as const,
                },
                {
                  id: "world-intelligence",
                  title: "World Intelligence",
                  description: "Przegląd informacji i rynków",
                  icon: "globe" as const,
                },
                {
                  id: "crm",
                  title: "CRM",
                  description: `${businessData.companies} firm w danych projektu`,
                  icon: "users" as const,
                },
                {
                  id: "marketplace",
                  title: "Marketplace",
                  description: "Ekosystem Qualitet Market",
                  icon: "shop" as const,
                },
                {
                  id: "ustawienia",
                  title: "Ustawienia",
                  description: "Konfiguracja centrum dowodzenia",
                  icon: "settings" as const,
                },
                {
                  id: "integracje",
                  title: "Integracje",
                  description: "Test połączeń z usługami",
                  icon: "link" as const,
                },
              ].map((module) => (
                <a
                  className="group rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm shadow-slate-200/30 transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md hover:shadow-indigo-100/50"
                  href={`#${module.id}`}
                  key={module.id}
                >
                  <div className="flex items-center justify-between">
                    <span className="flex size-9 items-center justify-center rounded-lg bg-slate-50 text-slate-500 transition group-hover:bg-indigo-50 group-hover:text-indigo-600">
                      <Icon className="size-[17px]" name={module.icon} />
                    </span>
                    <Icon
                      className="size-4 text-slate-300 transition group-hover:text-indigo-500"
                      name="arrow"
                    />
                  </div>
                  <h3 className="mt-4 text-xs font-semibold text-slate-800">
                    {module.title}
                  </h3>
                  <p className="mt-1 text-[10px] leading-4 text-slate-400">
                    {module.description}
                  </p>
                </a>
              ))}
            </div>
          </section>

          <footer className="mt-10 flex flex-col justify-between gap-2 border-t border-slate-200/80 py-5 text-[10px] text-slate-400 sm:flex-row">
            <span>Henryk Command Center · Qualitet Ecosystem</span>
            <span>Wskaźniki pochodzą z lokalnej warstwy JSON.</span>
          </footer>
        </main>
      </div>
    </div>
  );
}
