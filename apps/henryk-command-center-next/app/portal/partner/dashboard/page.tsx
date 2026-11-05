import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getRequestUser } from "../../../../lib/server/auth";
import { getCollection } from "../../../../lib/server/database";

export const metadata = { title: "Panel partnera | Qualitet Market" };
export const instant = false;

export default async function PartnerDashboardPage() {
  await connection();
  const user = await getRequestUser();
  if (!user) redirect("/login?next=%2Fportal%2Fpartner%2Fdashboard");

  const company = await getCollection("companies").then((companies) =>
    companies.findOne({ ownerUserId: user._id }),
  );
  return (
    <section className="portal-container portal-section">
      <p className="portal-eyebrow">Panel partnera</p>
      <h1 className="portal-section-heading">
        {company ? `Witaj, ${company.name}` : "Witaj w panelu partnera"}
      </h1>
      {company ? (
        <p className="portal-notice mt-6">
          Status firmy: {company.status ?? "pending"}. Dostępne funkcje zależą od
          weryfikacji firmy i przypisanych uprawnień.
        </p>
      ) : (
        <div className="portal-card mt-8">
          <h2 className="portal-card-title">Brak przypisanej firmy</h2>
          <p className="portal-card-copy">
            Uzupełnij profil firmy lub skontaktuj się z administratorem platformy.
          </p>
          <Link className="portal-button portal-button-secondary mt-5" href="/portal/partner">
            Informacje dla partnerów
          </Link>
        </div>
      )}
    </section>
  );
}
