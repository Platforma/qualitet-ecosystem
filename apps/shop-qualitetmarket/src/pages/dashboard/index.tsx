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
              <LinkButton store={store} />
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
