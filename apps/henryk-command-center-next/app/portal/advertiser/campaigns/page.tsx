import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getRequestUser } from "../../../../lib/server/auth";
import { getCollection } from "../../../../lib/server/database";
import CampaignManager, { type CampaignSummary } from "./campaign-manager";

export const metadata = { title: "Kampanie reklamowe | Qualitet Market" };
export const instant = false;

export default async function AdvertiserCampaignsPage() {
  await connection();
  const user = await getRequestUser();
  if (!user) redirect("/login?next=%2Fportal%2Fadvertiser%2Fcampaigns");
  const campaigns = await getCollection("campaigns").then((collection) =>
    collection
      .find({ advertiserId: user._id })
      .sort({ createdAt: -1 })
      .limit(100)
      .toArray(),
  );
  const campaignSummaries: CampaignSummary[] = campaigns.map((campaign) => ({
    id: String(campaign._id),
    name: typeof campaign.name === "string" ? campaign.name : "Kampania",
    status: typeof campaign.status === "string" ? campaign.status : "draft",
    budget: typeof campaign.budget === "number" ? campaign.budget : null,
    currency: typeof campaign.currency === "string" ? campaign.currency : "PLN",
  }));

  return (
    <section className="portal-container portal-section">
      <p className="portal-eyebrow">Panel reklamodawcy</p>
      <h1 className="portal-section-heading">Kampanie</h1>
      <CampaignManager initialCampaigns={campaignSummaries} />
      <div className="mt-8 grid gap-4">
        {campaignSummaries.map((campaign) => (
          <article className="portal-card" key={campaign.id}>
            <p className="portal-eyebrow">
              {campaign.status}
            </p>
            <h2 className="portal-card-title">{campaign.name}</h2>
            {campaign.budget !== null && (
              <p className="portal-card-copy">
                Budżet: {campaign.budget} {campaign.currency}
              </p>
            )}
          </article>
        ))}
        {campaigns.length === 0 && (
          <p className="portal-notice">Nie masz jeszcze kampanii reklamowych.</p>
        )}
      </div>
      <Link
        className="portal-button portal-button-secondary mt-8"
        href="/portal/advertiser/analytics"
      >
        Przejdź do analityki
      </Link>
    </section>
  );
}