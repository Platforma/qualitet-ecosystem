import { getCollection } from "../../../lib/server/database";
import { connection } from "next/server";

export const metadata = { title: "Leady | Supplier Acquisition Center" };
export const instant = false;

export default async function LeadsPage() {
  await connection();
  const leads = await getCollection("leads").then((items) =>
    items.find({}).sort({ createdAt: -1 }).limit(300).toArray(),
  );
  return (
    <section>
      <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">Supplier Acquisition Center</p>
      <h1 className="mt-2 text-3xl font-semibold">Leady</h1>
      <p className="mt-2 text-slate-600">Zaimportowane rekordy nie otrzymują wiadomości bez zapisanej, jawnej zgody.</p>
      <div className="mt-8 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full min-w-[750px] text-left text-sm">
          <thead className="bg-slate-100 text-slate-600"><tr>
            <th className="px-4 py-3">Firma</th><th className="px-4 py-3">E-mail / telefon</th><th className="px-4 py-3">Źródło</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Zgoda marketingowa</th>
          </tr></thead>
          <tbody className="divide-y divide-slate-100">
            {leads.map((lead) => (
              <tr key={String(lead._id)}>
                <td className="px-4 py-4"><strong>{String(lead.companyName ?? lead.name ?? "")}</strong><br /><span className="text-xs text-slate-500">{String(lead.website ?? "")}</span></td>
                <td className="px-4 py-4">{String(lead.email ?? "—")}<br />{String(lead.phone ?? "")}</td>
                <td className="px-4 py-4">{String(lead.source ?? "—")}</td>
                <td className="px-4 py-4">{String(lead.status ?? "NEW")}</td>
                <td className="px-4 py-4">{lead.marketingConsent === true ? "Tak" : "Nie"}</td>
              </tr>
            ))}
            {leads.length === 0 && <tr><td className="px-4 py-8 text-slate-500" colSpan={5}>Brak leadów.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}
