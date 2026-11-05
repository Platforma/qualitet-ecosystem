import Link from "next/link";
import type { ReactNode } from "react";

const links = [
  ["Dashboard", "/admin/control-center"],
  ["Infrastruktura", "/admin/infrastructure"],
  ["MongoDB", "/admin/mongodb"],
  ["Render", "/admin/render"],
  ["Cloudflare", "/admin/cloudflare"],
  ["Ollama", "/admin/ollama"],
  ["Deploy", "/admin/deploy"],
  ["Domeny", "/admin/domains"],
  ["ENV", "/admin/env"],
  ["Setup", "/admin/control-center/setup"],
  ["Integracje", "/admin/control-center/integrations"],
  ["Checklista", "/admin/control-center/checklist"],
  ["Automatyzacje", "/admin/control-center/automation"],
  ["Deploy", "/admin/control-center/deploy"],
  ["Raporty", "/admin/control-center/reports"],
  ["Roadmapa", "/admin/control-center/roadmap"],
  ["AI Memory", "/admin/control-center/ai-memory"],
  ["Prompty", "/admin/control-center/prompts"],
  ["System", "/admin/control-center/system"],
  ["Firmy", "/admin/control-center/companies"],
  ["Produkty", "/admin/control-center/products"],
  ["Partnerzy", "/admin/control-center/partners"],
];

export default function OwnerControlCenterLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">
          Prywatna strefa właściciela
        </p>
        <div className="mt-1 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <h1 className="text-2xl font-bold sm:text-3xl">Owner Control Center</h1>
          <p className="text-sm text-slate-600">Centrum dowodzenia QUALITET</p>
        </div>
        <nav
          aria-label="Owner Control Center"
          className="-mx-4 mt-4 flex gap-1 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0"
        >
          {links.map(([label, href]) => (
            <Link
              className="inline-flex min-h-11 shrink-0 items-center rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-800 hover:border-emerald-300 hover:bg-emerald-50"
              href={href}
              key={href}
            >
              {label}
            </Link>
          ))}
        </nav>
      </header>
      {children}
    </div>
  );
}
