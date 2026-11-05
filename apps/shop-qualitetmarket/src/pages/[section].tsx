import type { GetServerSideProps } from "next";
import Head from "next/head";
import ShopLayout from "../components/shop-layout";
import type { ShopPageContext, StorePageData } from "../server/shop-page-data";
import {
  countCatalogForStore,
  listCategoriesForStore,
  listProductsForStore,
  type ShopCategoryListItem,
  type ShopProductListItem,
} from "../server/shop-catalog";
import { getShopPageContext } from "../server/shop-page-data";
import { findStoreBySlug } from "../server/store-repository";

const sections = ["customers", "orders", "analytics"] as const;
type ShopSection = (typeof sections)[number];
type ShopSectionProps = {
  section: ShopSection | null;
  store: StorePageData | null;
  stores: StorePageData[];
  stats: {
    products: number;
    categories: number;
    customers: number;
    orders: number;
  } | null;
  publicStore: StorePageData | null;
  publicProducts: ShopProductListItem[];
  publicCategories: ShopCategoryListItem[];
};

export const getServerSideProps: GetServerSideProps<ShopSectionProps> = async (
  context,
) => {
  const section = context.params?.section;
  if (typeof section !== "string") {
    return { notFound: true };
  }
  if (!sections.includes(section as ShopSection)) {
    const store = await findStoreBySlug(section);
    if (!store || store.status !== "active") {
      return { notFound: true };
    }
    context.res.setHeader(
      "Cache-Control",
      "public, s-maxage=60, stale-while-revalidate=300",
    );
    const publicStore: StorePageData = {
      id: String(store._id),
      name: store.name,
      slug: store.slug,
      domain: store.domain ?? null,
      status: store.status,
      settings: store.settings,
      design: store.design ?? null,
      businessProfile: store.businessProfile ?? null,
      generatedContent: store.generatedContent ?? null,
      seo: store.seo ?? null,
      createdAt: store.createdAt.toISOString(),
      updatedAt: store.updatedAt.toISOString(),
    };
    const [publicProducts, publicCategories] = await Promise.all([
      listProductsForStore(String(store._id), true),
      listCategoriesForStore(String(store._id)),
    ]);
    return {
      props: {
        section: null,
        store: null,
        stores: [],
        stats: null,
        publicStore,
        publicProducts,
        publicCategories,
      },
    };
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
      publicStore: null,
      publicProducts: [],
      publicCategories: [],
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
  publicStore,
  publicProducts,
  publicCategories,
}: ShopSectionProps) {
  if (publicStore) {
    const { generatedContent, design, seo, settings } = publicStore;
    return (
      <>
        <Head>
          <title>{seo?.title ?? publicStore.name}</title>
          {seo?.description && (
            <meta content={seo.description} name="description" />
          )}
        </Head>
        <main
          className="shop-public-store"
          style={{
            backgroundColor: design?.backgroundColor ?? "#ffffff",
            color: design?.primaryColor ?? "#172b4d",
          }}
        >
          <header className="shop-public-header">
            {design?.logoUrl && (
              <img alt={`${publicStore.name} — logo`} src={design.logoUrl} />
            )}
            <strong>{publicStore.name}</strong>
            <nav aria-label="Menu sklepu">
              <a href={`/${publicStore.slug}`}>Strona główna</a>
              <a href={`/${publicStore.slug}#categories`}>Kategorie</a>
              <a href={`/${publicStore.slug}#products`}>Oferta</a>
            </nav>
          </header>
          {design?.banners?.[0] && (
            <img
              alt={`${publicStore.name} — baner`}
              className="shop-public-banner"
              src={design.banners[0]}
            />
          )}
          <section className="shop-public-hero">
            <h1>{generatedContent?.heroHeadline ?? publicStore.name}</h1>
            {generatedContent?.heroDescription && (
              <p>{generatedContent.heroDescription}</p>
            )}
          </section>
          {generatedContent?.about && (
            <section className="shop-public-about">
              <h2>O firmie</h2>
              <p>{generatedContent.about}</p>
            </section>
          )}
          <section className="shop-public-section" id="categories">
            <h2>Kategorie</h2>
            {publicCategories.length === 0 ? (
              <p>Kategorie zostaną wyświetlone po ich dodaniu w panelu.</p>
            ) : (
              <ul>
                {publicCategories.map((category) => (
                  <li key={category.id}>
                    <strong>{category.name}</strong>
                    {category.description && <p>{category.description}</p>}
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="shop-public-section" id="products">
            <h2>Oferta</h2>
            {publicProducts.length === 0 ? (
              <p>Oferta nie zawiera jeszcze opublikowanych produktów.</p>
            ) : (
              <div className="shop-grid">
                {publicProducts.map((product) => (
                  <article className="shop-card" key={product.id}>
                    {product.images[0] && (
                      <img alt={product.name} src={product.images[0]} />
                    )}
                    <h3>{product.name}</h3>
                    {product.description && <p>{product.description}</p>}
                    {product.price !== null && (
                      <p>
                        {product.price.toLocaleString(settings.locale)}{" "}
                        {product.currency ?? settings.currency}
                      </p>
                    )}
                  </article>
                ))}
              </div>
            )}
          </section>
          {settings.contactEmail && (
            <footer className="shop-public-footer">
              Kontakt: <a href={`mailto:${settings.contactEmail}`}>{settings.contactEmail}</a>
            </footer>
          )}
        </main>
      </>
    );
  }

  if (!section) {
    return null;
  }
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
