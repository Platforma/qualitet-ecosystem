import { NextResponse } from "next/server";
import { hasRole, requireUser } from "../../../../../lib/server/auth";
import { getCollection } from "../../../../../lib/server/database";

export async function GET(request: Request) {
  const auth = await requireUser(request);
  if ("response" in auth) return auth.response;
  if (!hasRole(auth.user, ["owner"])) {
    return NextResponse.json({ error: "Wymagane są uprawnienia właściciela." }, { status: 403 });
  }

  const [companies, products, memberships] = await Promise.all([
    getCollection("companies"),
    getCollection("products"),
    getCollection("company_memberships"),
  ]);
  const since = new Date();
  since.setDate(1);
  since.setHours(0, 0, 0, 0);
  const [total, manufacturers, wholesalers, active, newCompanies, productCount, monthlyProducts, partnerCount] =
    await Promise.all([
      companies.countDocuments(),
      companies.countDocuments({ type: "manufacturer" }),
      companies.countDocuments({ type: "wholesaler" }),
      companies.countDocuments({ status: "active" }),
      companies.countDocuments({ createdAt: { $gte: since } }),
      products.countDocuments({ archivedAt: { $exists: false } }),
      products.countDocuments({ createdAt: { $gte: since }, archivedAt: { $exists: false } }),
      memberships.countDocuments({ role: "partner", status: "active", createdAt: { $gte: since } }),
    ]);

  const leads = await getCollection("leads");
  const [registered, converted] = await Promise.all([
    leads.countDocuments({ createdAt: { $gte: since } }),
    leads.countDocuments({ status: { $in: ["REGISTERED", "ACTIVE"] }, createdAt: { $gte: since } }),
  ]);
  return NextResponse.json(
    {
      companies: total,
      manufacturers,
      wholesalers,
      active,
      products: productCount,
      newCompanies,
      conversionRate: registered ? Math.round((converted / registered) * 100) : 0,
      monthlyTargets: {
        companies: { target: 100, current: newCompanies },
        products: { target: 1000, current: monthlyProducts },
        partners: { target: 100, current: partnerCount },
      },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
