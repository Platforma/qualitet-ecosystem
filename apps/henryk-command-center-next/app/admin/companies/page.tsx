import { getCollection } from "../../../lib/server/database";
import { connection } from "next/server";
import CompanyReviewActions from "./company-review-actions";

export const metadata = { title: "Firmy | Supplier Acquisition Center" };
export const instant = false;

export default async function CompaniesPage() {
  await connection();
  const companies = await getCollection("companies").then((items) =>
    items.find({}).sort({ createdAt: -1 }).limit(200).toArray(),
  );
  return (
    <section>
      <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">Supplier Acquisition Center</p>
      <h1 className="mt-2 text-3xl font-semibold">Firmy</h1>
      <p className="mt-2 text-slate-600">Zgłoszenia dostawców i przypisywanie kont właścicieli.</p>
      <div className="mt-8 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full min-w-[850px] text-left text-sm">
          <thead className="bg-slate-100 text-slate-600"><tr>
            <th className="px-4 py-3">Firma</th><th className="px-4 py-3">Typ / kraj</th><th className="px-4 py-3">Kontakt</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Konto właściciela (ID)</th><th className="px-4 py-3">Akcje</th>
          </tr></thead>
          <tbody className="divide-y divide-slate-100">
            {companies.map((company) => (
              <tr key={String(company._id)}>
                <td className="px-4 py-4"><strong>{String(company.name ?? "")}</strong><br /><span className="text-xs text-slate-500">{String(company.website ?? "")}</span></td>
                <td className="px-4 py-4">{String(company.type ?? "—")} / {String(company.country ?? "—")}</td>
                <td className="px-4 py-4">{String(company.email ?? "")}<br />{String(company.phone ?? "")}</td>
                <td className="px-4 py-4">{String(company.status ?? "pending")}</td>
                <td className="px-4 py-4 font-mono text-xs">{String(company.ownerUserId ?? "nieprzypisane")}</td>
                <td className="px-4 py-4"><CompanyReviewActions id={String(company._id)} status={String(company.status ?? "pending")} /></td>
              </tr>
            ))}
            {companies.length === 0 && <tr><td className="px-4 py-8 text-slate-500" colSpan={6}>Brak zgłoszeń firm.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}
