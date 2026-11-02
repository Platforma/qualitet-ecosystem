import Link from "next/link";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getRequestUser } from "../../lib/server/auth";

const links = [
  ["Start", "/admin/checklist"],
  ["Setup", "/admin/setup"],
  ["Integracje", "/admin/integrations"],
  ["System", "/admin/system"],
  ["Automatyzacje", "/admin/automation"],
  ["Firmy", "/admin/companies"],
  ["Leady", "/admin/leads"],
  ["Statystyki", "/admin/companies/stats"],
  ["Outreach", "/admin/outreach"],
  ["Kampanie", "/admin/campaigns"],
  ["Import", "/admin/outreach/import"],
];

export default async function SupplierAdminLayout({ children }: { children: ReactNode }) {
  await connection();
  const user = await getRequestUser();
  if (!user) redirect("/login?next=%2Fadmin%2Fcompanies");
  if (user.role !== "owner") redirect("/");
  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-5 sm:py-5">
          <div className="flex items-center justify-between gap-3">
          <Link className="text-lg font-semibold" href="/admin/checklist">QUALITET Owner Studio</Link>
            <span className="text-xs font-medium text-slate-500">Owner Studio</span>
          </div>
          <nav aria-label="Nawigacja Owner Studio" className="-mx-4 mt-3 flex gap-1 overflow-x-auto px-4 pb-1 text-sm sm:mx-0 sm:flex-wrap sm:gap-2 sm:px-0">
            {links.map(([label, href]) => <Link className="inline-flex min-h-10 shrink-0 items-center rounded-lg px-3 text-slate-700 hover:bg-emerald-50 hover:text-emerald-900" href={href} key={href}>{label}</Link>)}
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-5 sm:py-10">{children}</main>
    </div>
  );
}
