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
  const partner = await getCollection("partners").then((partners) =>
    partners.findOne({ userId: user._id, status: "active" }),
  );
  const [referrals, referralRankings] = partner
    ? await Promise.all([
        getCollection("users").then((users) =>
          users.countDocuments({ referredByPartnerId: String(partner._id) }),
        ),
        getCollection("users")
          .then((users) =>
            users
              .aggregate<{ _id: string; referrals: number }>([
                { $match: { referredByPartnerId: { $type: "string" } } },
                {
                  $group: {
                    _id: "$referredByPartnerId",
                    referrals: { $sum: 1 },
                  },
                },
              ])
              .toArray(),
          )
          .then((items) => items.sort((a, b) => b.referrals - a.referrals)),
      ])
    : [0, []];
  const rank =
    partner && referrals > 0
      ? referralRankings.filter((item) => item.referrals > referrals).length + 1
      : null;
  return (
    <section className="portal-container portal-section">
      <p className="portal-eyebrow">Panel partnera</p>
      <h1 className="portal-section-heading">
        {company ? `Witaj, ${company.name}` : "Witaj w panelu partnera"}
      </h1>
      {partner && (
        <>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <article className="portal-card">
              <p className="portal-eyebrow">Kliknięcia linku</p>
              <p className="mt-3 text-3xl font-semibold">
                {typeof partner.clickCount === "number" ? partner.clickCount : 0}
              </p>
            </article>
            <article className="portal-card">
              <p className="portal-eyebrow">Rejestracje z polecenia</p>
              <p className="mt-3 text-3xl font-semibold">{referrals}</p>
            </article>
            <article className="portal-card">
              <p className="portal-eyebrow">Ranking partnerski</p>
              <p className="mt-3 text-3xl font-semibold">
                {rank === null ? "—" : `#${rank}`}
              </p>
            </article>
          </div>
          <div className="portal-card mt-5">
            <h2 className="portal-card-title mt-0">Twój link afiliacyjny</h2>
            <p className="portal-card-copy">
              Zliczane są wizyty i rejestracje przypisane do Twojego kodu.
            </p>
            <p className="mt-4 break-all rounded-lg border border-slate-700 bg-slate-900 p-3 font-mono text-sm">
              https://qualitet-market.com/r/{partner.referralCode}
            </p>
            <p className="portal-notice mt-5">
              Prowizje i wypłaty nie są jeszcze naliczane: platforma nie ma
              aktywnego przepływu opłaconych zamówień ani rozliczeń partnerów.
              W panelu nie pokazujemy fikcyjnych kwot.
            </p>
          </div>
        </>
      )}
      {company ? (
        <p className="portal-notice mt-6">
          Status firmy: {company.status ?? "pending"}. Dostępne funkcje zależą od
          weryfikacji firmy i przypisanych uprawnień.
        </p>
      ) : !partner ? (
        <div className="portal-card mt-8">
          <h2 className="portal-card-title">Program partnerski nie jest włączony</h2>
          <p className="portal-card-copy">
            Podczas rejestracji wybierz typ konta Partner, aby utworzyć link
            polecający i zobaczyć przypisane rejestracje.
          </p>
          <Link className="portal-button portal-button-secondary mt-5" href="/register?intent=partner">
            Utwórz konto partnera
          </Link>
        </div>
      ) : company ? null : (
        <p className="portal-notice mt-6">
          Konto partnerskie działa niezależnie od profilu firmy.
        </p>
      )}
    </section>
  );
}
