import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getRequestUser } from "../../../../lib/server/auth";
import { getCollection } from "../../../../lib/server/database";

export const metadata = { title: "Panel reklamodawcy | Qualitet Market" };
export const instant = false;

export default async function AdvertiserDashboardPage() {
  await connection();
  const user = await getRequestUser();
  if (!user) redirect("/login?next=%2Fportal%2Fadvertiser%2Fdashboard");

  const campaigns = getCollection("campaigns");
  const [totalCampaigns, activeCampaigns] = await Promise.all([
    campaigns.then((collection) =>
      collection.countDocuments({ advertiserId: user._id }),
    ),
    campaigns.then((collection) =>
      collection.countDocuments({
        advertiserId: user._id,
        status: "active",
      }),
    ),
  ]);

  return (
    <section className="portal-container portal-section">
      <p className="portal-eyebrow">Panel reklamodawcy</p>
      <h1 className="portal-section-heading">Witaj, {user.name}</h1>
      <p className="portal-section-copy">
        Zarządzaj kampaniami reklamowymi i sprawdzaj ich bieżący status.
      </p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <article className="portal-card">
          <p className="portal-eyebrow">Wszystkie kampanie</p>
          <p className="mt-3 text-3xl font-semibold">{totalCampaigns}</p>
        </article>
        <article className="portal-card">
          <p className="portal-eyebrow">Aktywne kampanie</p>
          <p className="mt-3 text-3xl font-semibold">{activeCampaigns}</p>
        </article>
      </div>
      <Link
        className="portal-button portal-button-primary mt-8"
        href="/portal/advertiser/campaigns"
      >
        Przejdź do kampanii
      </Link>
    </section>
  );
}