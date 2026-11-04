import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getRequestUser } from "../../../../lib/server/auth";
import { getCollection } from "../../../../lib/server/database";
import ProductsPanel from "./products-panel";

export const metadata = { title: "Panel dostawcy | Qualitet Market" };
export const instant = false;

export default async function SupplierDashboardPage() {
  await connection();
  const user = await getRequestUser();
  if (!user) redirect("/login?next=%2Fsupplier%2Fdashboard");
  const company = await getCollection("companies").then((companies) =>
    companies.findOne({ ownerUserId: user._id }),
  );
  return (
    <section className="portal-container portal-section">
      <p className="portal-eyebrow">Panel dostawcy</p>
      <h1 className="portal-section-heading">
        {company ? `Witaj, ${company.name}` : "Dostęp do panelu firmy"}
      </h1>
      {!company && (
        <div className="portal-card mt-8">
          <h2 className="portal-card-title">Brak przypisanej firmy</h2>
          <p className="portal-card-copy">
            Zgłoszenie firmy musi zostać sprawdzone i przypisane do konta przez administratora.
          </p>
          <Link className="portal-button portal-button-secondary mt-5" href="/supplier/register">
            Zgłoś firmę
          </Link>
        </div>
      )}
      {company && company.status !== "active" && (
        <p className="portal-notice mt-8">
          Status firmy: {company.status}. Panel produktów zostanie włączony po aktywacji.
        </p>
      )}
      {company?.status === "active" && (
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {[
            ["Produkty", company.productsCount ?? 0],
            ["Sprzedaż", company.salesCount ?? 0],
            ["Budżet reklamowy", `${company.adBudget ?? 0} PLN`],
          ].map(([label, value]) => (
            <article className="portal-card" key={label}>
              <p className="portal-eyebrow">{label}</p>
              <p className="mt-3 text-3xl font-semibold">{value}</p>
            </article>
          ))}
          <div className="portal-card md:col-span-3">
            <h2 className="portal-card-title">Produkty i publikacja</h2>
            <p className="portal-card-copy">
              Dodany produkt jest publikowany w katalogu Marketplace, programie partnerskim i bazie AI Qualitet.
              Ceny i prowizje możesz ustawić podczas dodawania.
            </p>
            <ProductsPanel />
          </div>
        </div>
      )}
    </section>
  );
}
