import Link from "next/link";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getRequestUser } from "../../lib/server/auth";

const links = [
  ["Automation", "/admin/automation"],
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
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-5">
          <Link className="text-lg font-semibold" href="/admin/companies">Supplier Acquisition Center</Link>
          <nav aria-label="Nawigacja Supplier Acquisition" className="flex flex-wrap gap-4 text-sm">
            {links.map(([label, href]) => <Link className="text-slate-600 hover:text-slate-950" href={href} key={href}>{label}</Link>)}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-5 py-10">{children}</main>
    </div>
  );
}
