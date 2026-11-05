import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getRequestUser } from "../../../../lib/server/auth";
import { getCollection } from "../../../../lib/server/database";

export const metadata = { title: "Analityka reklam | Qualitet Market" };
export const instant = false;

export default async function AdvertiserAnalyticsPage() {
  await connection();
  const user = await getRequestUser();
  if (!user) redirect("/login?next=%2Fportal%2Fadvertiser%2Fanalytics");
  const campaigns = await getCollection("campaigns");
  const [total, active, completed] = await Promise.all([
    campaigns.countDocuments({ advertiserId: user._id }),
    campaigns.countDocuments({ advertiserId: user._id, status: "active" }),
    campaigns.countDocuments({ advertiserId: user._id, status: "completed" }),
  ]);

  return (
    <section className="portal-container portal-section">
      <p className="portal-eyebrow">Analityka reklam</p>
      <h1 className="portal-section-heading">Wyniki kampanii</h1>
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {[
          ["Wszystkie", total],
          ["Aktywne", active],
          ["Zakończone", completed],
        ].map(([label, count]) => (
          <article className="portal-card" key={label}>
            <p className="portal-eyebrow">{label}</p>
            <p className="mt-3 text-3xl font-semibold">{count}</p>
          </article>
        ))}
      </div>
      <Link
        className="portal-button portal-button-secondary mt-8"
        href="/portal/advertiser/campaigns"
      >
        Zobacz kampanie
      </Link>
    </section>
  );
}