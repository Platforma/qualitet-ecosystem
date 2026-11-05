import { connection } from "next/server";
import type { Metadata } from "next";
import { getCollection } from "../../../lib/server/database";
import { marketplaceCategories } from "../../../lib/models/product";
import { PageIntro } from "../components/portal-shell";

export const metadata: Metadata = {
  title: "Trendy marketplace",
  description: "Zmiany w liczbie nowych ofert marketplace na podstawie rzeczywistych danych.",
  alternates: { canonical: "/trends" },
};

export const instant = false;

type TrendCategory = {
  slug: string;
  label: string;
  recent: number;
  previous: number;
};

type TrendResult =
  | { state: "ready"; categories: TrendCategory[] }
  | { state: "unconfigured" | "unavailable"; categories: [] };

async function loadCategoryTrends(): Promise<TrendResult> {
  await connection();
  if (!process.env.MONGODB_URI?.trim()) {
    return { state: "unconfigured", categories: [] };
  }

  const now = new Date();
  const recentStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1_000);
  const previousStart = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1_000);

  try {
    const activeCompanies = await getCollection("companies").then((companies) =>
      companies
        .find({ status: "active" }, { projection: { _id: 1 } })
        .toArray(),
    );
    const companyIds = activeCompanies.map((company) => String(company._id));
    if (companyIds.length === 0) return { state: "ready", categories: [] };

    const counts = await getCollection("products")
      .then((products) =>
        products
          .aggregate<{
            _id: { category: string; period: "recent" | "previous" };
            count: number;
          }>([
            {
              $match: {
                status: "active",
                archivedAt: { $exists: false },
                supplierCompanyId: { $in: companyIds },
                "publication.marketplace": { $ne: "unpublished" },
                createdAt: { $gte: previousStart, $lte: now },
              },
            },
            {
              $project: {
                category: { $ifNull: ["$category", "inne"] },
                period: {
                  $cond: [
                    { $gte: ["$createdAt", recentStart] },
                    "recent",
                    "previous",
                  ],
                },
              },
            },
            {
              $group: {
                _id: { category: "$category", period: "$period" },
                count: { $sum: 1 },
              },
            },
          ])
          .toArray(),
      );

    const byCategory = new Map<string, TrendCategory>();
    for (const category of marketplaceCategories) {
      byCategory.set(category.slug, {
        slug: category.slug,
        label: category.label,
        recent: 0,
        previous: 0,
      });
    }
    for (const item of counts) {
      const category = byCategory.get(item._id.category) ?? byCategory.get("inne");
      if (!category) continue;
      category[item._id.period] += item.count;
    }

    return {
      state: "ready",
      categories: [...byCategory.values()]
        .filter((category) => category.recent > 0 || category.previous > 0)
        .sort(
          (left, right) =>
            right.recent - left.recent || right.previous - left.previous,
        ),
    };
  } catch (error) {
    console.error(
      "Marketplace trends unavailable:",
      error instanceof Error ? error.name : "UnknownError",
    );
    return { state: "unavailable", categories: [] };
  }
}

export default async function TrendsPage() {
  const trends = await loadCategoryTrends();
  const maxCount =
    trends.state === "ready"
      ? Math.max(...trends.categories.map((category) => category.recent), 1)
      : 1;

  return (
    <>
      <section className="portal-container portal-section">
        <PageIntro
          description="Porównanie liczby nowych, opublikowanych ofert z ostatnich 30 dni z poprzednimi 30 dniami. Zestawienie obejmuje wyłącznie aktywne firmy."
          eyebrow="Trend Center"
          title="Rynek oparty na rzeczywistych danych."
        />
      </section>
      <section className="portal-container pb-16">
        {trends.state === "unconfigured" && (
          <p className="portal-notice" role="status">
            Trendy są niedostępne, ponieważ MongoDB nie jest skonfigurowane.
          </p>
        )}
        {trends.state === "unavailable" && (
          <p className="portal-notice" role="alert">
            Nie udało się pobrać danych trendów. Spróbuj ponownie później.
          </p>
        )}
        {trends.state === "ready" && trends.categories.length === 0 && (
          <div className="portal-card">
            <h2 className="portal-card-title mt-0">Brak danych trendów</h2>
            <p className="portal-card-copy">
              Zestawienie pojawi się, gdy aktywne firmy opublikują oferty. Nie
              wyświetlamy danych przykładowych.
            </p>
          </div>
        )}
        {trends.state === "ready" && trends.categories.length > 0 && (
          <div className="grid gap-4">
            {trends.categories.map((category) => {
              const change =
                category.previous === 0
                  ? category.recent > 0
                    ? "Nowe oferty"
                    : "Bez zmian"
                  : `${Math.round(
                      ((category.recent - category.previous) /
                        category.previous) *
                        100,
                    )}%`;
              return (
                <article className="portal-card" key={category.slug}>
                  <div className="flex flex-wrap items-baseline justify-between gap-3">
                    <h2 className="portal-card-title mt-0">{category.label}</h2>
                    <p className="portal-eyebrow">{change}</p>
                  </div>
                  <p className="portal-card-copy">
                    {category.recent} nowych ofert · poprzednie 30 dni:{" "}
                    {category.previous}
                  </p>
                  <div
                    aria-label={`${category.recent} nowych ofert`}
                    className="portal-trend-bar-track mt-4"
                    role="img"
                  >
                    <span
                      className="portal-trend-bar"
                      style={{
                        width: `${Math.max(
                          (category.recent / maxCount) * 100,
                          category.recent > 0 ? 2 : 0,
                        )}%`,
                      }}
                    />
                  </div>
                </article>
              );
            })}
          </div>
        )}
        <p className="portal-notice mt-6">
          Trendy wyszukiwań, odsłon, regionów i dynamiki sprzedaży wymagają
          dodatkowego, zgodnego z polityką prywatności zbierania zdarzeń.
          Obecnie te dane nie są mierzone.
        </p>
      </section>
    </>
  );
}
