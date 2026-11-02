import { getCollection } from "../../../../lib/server/database";
import { connection } from "next/server";

export const metadata = { title: "Statystyki firm | Supplier Acquisition Center" };
export const instant = false;

export default async function SupplierStatsPage() {
  await connection();
  const [companies, products, memberships, leads] = await Promise.all([
    getCollection("companies"), getCollection("products"), getCollection("company_memberships"), getCollection("leads"),
  ]);
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const [total, manufacturers, wholesalers, active, newCompanies, productCount, monthlyProducts, partnerCount, monthLeads, converted] =
    await Promise.all([
      companies.countDocuments(), companies.countDocuments({ type: "manufacturer" }),
      companies.countDocuments({ type: "wholesaler" }), companies.countDocuments({ status: "active" }),
      companies.countDocuments({ createdAt: { $gte: monthStart } }),
      products.countDocuments({ archivedAt: { $exists: false } }),
      products.countDocuments({ createdAt: { $gte: monthStart }, archivedAt: { $exists: false } }),
      memberships.countDocuments({ role: "partner", status: "active", createdAt: { $gte: monthStart } }),
      leads.countDocuments({ createdAt: { $gte: monthStart } }),
      leads.countDocuments({ createdAt: { $gte: monthStart }, status: { $in: ["REGISTERED", "ACTIVE"] } }),
    ]);
  const stats = [
    ["Liczba firm", total], ["Producenci", manufacturers], ["Hurtownie", wholesalers],
    ["Aktywne firmy", active], ["Produkty", productCount], ["Nowe firmy w tym miesiącu", newCompanies],
    ["Konwersja leadów", `${monthLeads ? Math.round(converted / monthLeads * 100) : 0}%`],
  ];
  const targets = [["Firmy", newCompanies, 100], ["Produkty", monthlyProducts, 1000], ["Partnerzy", partnerCount, 100]];
  return (
    <section>
      <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">Supplier Acquisition Center</p>
      <h1 className="mt-2 text-3xl font-semibold">Statystyki pozyskiwania</h1>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(([label, value]) => <article className="rounded-2xl border border-slate-200 bg-white p-5" key={String(label)}><p className="text-sm text-slate-500">{label}</p><p className="mt-3 text-3xl font-semibold">{value}</p></article>)}
      </div>
      <h2 className="mt-10 text-xl font-semibold">Cele miesięczne</h2>
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        {targets.map(([label, current, target]) => {
          const progress = Math.min(100, Math.round(Number(current) / Number(target) * 100));
          return <article className="rounded-2xl border border-slate-200 bg-white p-5" key={String(label)}>
            <div className="flex justify-between"><strong>{label}</strong><span>{current} / {target}</span></div>
            <div className="mt-4 h-2 rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-600" style={{ width: `${progress}%` }} /></div>
          </article>;
        })}
      </div>
    </section>
  );
}
