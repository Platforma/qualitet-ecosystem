import type { GetServerSideProps } from "next";
import ShopLayout from "../components/shop-layout";
import type { ShopPageContext, StorePageData } from "../server/shop-page-data";
import { countCatalogForStore } from "../server/shop-catalog";
import { getShopPageContext } from "../server/shop-page-data";

const sections = ["customers", "orders", "analytics"] as const;
type ShopSection = (typeof sections)[number];
type ShopSectionProps = {
  section: ShopSection;
  store: StorePageData | null;
  stores: StorePageData[];
  stats: {
    products: number;
    categories: number;
    customers: number;
    orders: number;
  } | null;
};

export const getServerSideProps: GetServerSideProps<ShopSectionProps> = async (
  context,
) => {
  const section = context.params?.section;
  if (typeof section !== "string" || !sections.includes(section as ShopSection)) {
    return { notFound: true };
  }
  const result = await getShopPageContext(context);
  if ("redirect" in result.page) return result.page;

  const page = result.page.props as ShopPageContext;
  return {
    props: {
      section: section as ShopSection,
      store: page.store,
      stores: page.stores,
      stats: page.store ? await countCatalogForStore(page.store.id) : null,
    },
  };
};

const sectionContent: Record<
  ShopSection,
  { title: string; description: string; metric: keyof NonNullable<ShopSectionProps["stats"]> }
> = {
  customers: {
    title: "Klienci",
    description: "Podsumowanie klientów przypisanych do wybranego sklepu.",
    metric: "customers",
  },
  orders: {
    title: "Zamówienia",
    description: "Podsumowanie zamówień zapisanych dla wybranego sklepu.",
    metric: "orders",
  },
  analytics: {
    title: "Analityka",
    description: "Podstawowe wskaźniki sklepu. Kolejne raporty można dodać bez zmiany modelu sklepu.",
    metric: "products",
  },
};

export default function ShopFoundationSection({
  section,
  store,
  stores,
  stats,
}: ShopSectionProps) {
  const content = sectionContent[section];
  return (
    <ShopLayout active={section} store={store} stores={stores}>
      <header className="shop-heading">
        <h1>{content.title}</h1>
        <p>{content.description}</p>
      </header>
      {!store ? (
        <section className="shop-card shop-empty">
          Wybierz lub utwórz sklep, aby wyświetlić jego dane.
        </section>
      ) : stats ? (
        <section aria-label={`Dane: ${content.title}`} className="shop-grid">
          {section === "analytics" ? (
            Object.entries(stats).map(([key, value]) => (
              <article className="shop-card shop-stat-card" key={key}>
                <span>{metricLabels[key as keyof typeof stats]}</span>
                <strong>{value}</strong>
              </article>
            ))
          ) : (
            <article className="shop-card shop-stat-card">
              <span>{content.title}</span>
              <strong>{stats[content.metric]}</strong>
            </article>
          )}
        </section>
      ) : null}
    </ShopLayout>
  );
}

const metricLabels = {
  products: "Produkty",
  categories: "Kategorie",
  customers: "Klienci",
  orders: "Zamówienia",
} as const;
