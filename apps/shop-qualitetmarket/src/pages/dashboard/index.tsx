import { useState } from "react";
import type { GetServerSideProps } from "next";
import StoreCreateForm from "../../components/store-create-form";
import ShopLayout from "../../components/shop-layout";
import type { ShopPageContext, StorePageData } from "../../server/shop-page-data";
import {
  countCatalogForStore,
  countProductsForStores,
} from "../../server/shop-catalog";
import { getShopPageContext } from "../../server/shop-page-data";

type DashboardStore = StorePageData & { productCount: number };
type DashboardStats = {
  products: number;
  categories: number;
  customers: number;
  orders: number;
};
type DashboardProps = {
  stores: DashboardStore[];
  selectedStoreId: string | null;
  stats: DashboardStats | null;
};

export const getServerSideProps: GetServerSideProps<DashboardProps> = async (
  context,
) => {
  const result = await getShopPageContext(context);
  if ("redirect" in result.page) {
    return result.page;
  }

  const page = result.page.props as ShopPageContext;
  const counts = await countProductsForStores(page.stores.map((store) => store.id));
  const stats = page.store ? await countCatalogForStore(page.store.id) : null;
  return {
    props: {
      stores: page.stores.map((store) => ({
        ...store,
        productCount: counts.get(store.id) ?? 0,
      })),
      selectedStoreId: page.store?.id ?? null,
      stats,
    },
  };
};

export default function ShopDashboard({
  stores,
  selectedStoreId,
  stats,
}: DashboardProps) {
  const selectedStore = stores.find((store) => store.id === selectedStoreId) ?? null;

  return (
    <ShopLayout active="dashboard" store={selectedStore} stores={stores}>
      <header className="shop-heading">
        <h1>Dashboard sklepu</h1>
        <p>Sklepy i dane odczytane z przypisanych kolekcji MongoDB.</p>
      </header>

      {stores.length === 0 ? (
        <section className="shop-card">
          <h2>Utwórz pierwszy sklep</h2>
          <p className="shop-description">
            Podaj rzeczywiste dane firmy i ustawienia sklepu. Rekord zostanie
            zapisany w kolekcji <code>stores</code>.
          </p>
          <StoreCreateForm />
        </section>
      ) : (
        <div className="shop-grid">
          {stores.map((store) => (
            <article className="shop-card" key={store.id}>
              <div className="shop-stat">
                <span>Status: {store.status}</span>
                <strong>{store.productCount}</strong>
              </div>
              <h2>{store.name}</h2>
              <p className="shop-meta">
                Slug: <code>{store.slug}</code> · {store.settings.locale} ·{" "}
                {store.settings.currency}
              </p>
              {store.domain && (
                <p className="shop-meta">Domena: {store.domain}</p>
              )}
              <div className="shop-actions">
                <LinkButton store={store} />
                <PublishButton store={store} />
              </div>
              {store.status === "active" && (
                <p className="shop-meta">
                  Publiczny sklep: <a href={`/${store.slug}`}>/{store.slug}</a>
                </p>
              )}
            </article>
          ))}
        </div>
      )}
      {selectedStore && stats && (
        <section
          aria-label="Statystyki wybranego sklepu"
          className="shop-grid shop-grid-four shop-dashboard-stats"
        >
          {([
            ["Produkty", stats.products],
            ["Kategorie", stats.categories],
            ["Klienci", stats.customers],
            ["Zamówienia", stats.orders],
          ] as const).map(([label, count]) => (
            <article className="shop-card shop-stat-card" key={label}>
              <span>{label}</span>
              <strong>{count}</strong>
            </article>
          ))}
        </section>
      )}
      {selectedStore?.generatedContent && (
        <section className="shop-card shop-ai-content">
          <h2>Treści wygenerowane dla firmy</h2>
          <h3>{selectedStore.generatedContent.heroHeadline}</h3>
          <p>{selectedStore.generatedContent.heroDescription}</p>
          <h3>Proponowane kategorie</h3>
          <ul>
            {selectedStore.generatedContent.categorySuggestions.map((category) => (
              <li key={category.name}>
                <strong>{category.name}</strong> — {category.description}
              </li>
            ))}
          </ul>
          <details>
            <summary>Treści marketingowe</summary>
            <h4>Post społecznościowy</h4>
            <p>{selectedStore.generatedContent.socialPost}</p>
            <h4>Reklama Facebook</h4>
            <p>{selectedStore.generatedContent.facebookAd}</p>
            <h4>Reklama Google</h4>
            <p>{selectedStore.generatedContent.googleAd}</p>
            <h4>Temat newslettera</h4>
            <p>{selectedStore.generatedContent.newsletterSubject}</p>
            <h4>Artykuł SEO</h4>
            <p>{selectedStore.generatedContent.seoArticle}</p>
          </details>
        </section>
      )}
    </ShopLayout>
  );
}

function LinkButton({ store }: { store: DashboardStore }) {
  return (
    <a
      className="button button-secondary"
      href={`/settings?store=${encodeURIComponent(store.id)}`}
    >
      Zarządzaj sklepem
    </a>
  );
}

function PublishButton({ store }: { store: DashboardStore }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function toggleStatus() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/stores/${encodeURIComponent(store.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section: "status",
          status: store.status === "active" ? "draft" : "active",
        }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(result.error ?? "Nie udało się zmienić statusu sklepu.");
      }
      window.location.reload();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Nie udało się zmienić statusu sklepu.",
      );
      setBusy(false);
    }
  }

  return (
    <span>
      <button
        className="button button-primary"
        disabled={busy}
        onClick={toggleStatus}
        type="button"
      >
        {busy
          ? "Zapisywanie…"
          : store.status === "active"
            ? "Wstrzymaj publikację"
            : "Opublikuj sklep"}
      </button>
      {error && <small className="notice-error" role="alert">{error}</small>}
    </span>
  );
}
