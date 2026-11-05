import type { GetServerSideProps } from "next";
import ProductForm from "../../components/product-form";
import ShopLayout from "../../components/shop-layout";
import type {
  ShopPageContext,
  StorePageData,
} from "../../server/shop-page-data";
import {
  listProductsForStore,
  type ShopProductListItem,
} from "../../server/shop-catalog";
import { getShopPageContext } from "../../server/shop-page-data";

type ProductsProps = {
  store: StorePageData | null;
  stores: StorePageData[];
  products: ShopProductListItem[];
};

export const getServerSideProps: GetServerSideProps<ProductsProps> = async (
  context,
) => {
  const result = await getShopPageContext(context);
  if ("redirect" in result.page) {
    return result.page;
  }

  const page = result.page.props as ShopPageContext;
  const products = page.store
    ? await listProductsForStore(page.store.id)
    : [];
  return { props: { store: page.store, stores: page.stores, products } };
};

export default function ShopProductsPage({
  store,
  stores,
  products,
}: ProductsProps) {
  return (
    <ShopLayout active="products" store={store} stores={stores}>
      <header className="shop-heading">
        <h1>Produkty</h1>
        <p>Produkty powiązane z wybranym sklepem w kolekcji MongoDB.</p>
      </header>
      {!store ? (
        <section className="shop-card shop-empty">
          {stores.length === 0
            ? "Utwórz sklep, aby wyświetlić przypisane produkty."
            : "Wybierz sklep z menu, aby wyświetlić jego produkty."}
        </section>
      ) : (
        <>
          <section className="shop-card">
            <h2>Dodaj produkt</h2>
            <ProductForm currency={store.settings.currency} storeId={store.id} />
          </section>
          <section aria-label="Produkty sklepu" className="shop-grid shop-products">
            {products.length === 0 ? (
              <p className="shop-empty">Ten sklep nie ma jeszcze produktów.</p>
            ) : (
              products.map((product) => (
                <article className="shop-card" key={product.id}>
                  <h2>{product.name}</h2>
                  <p className="shop-meta">
                    SKU: {product.sku ?? "—"} · {product.status} ·{" "}
                    {product.price === null
                      ? "—"
                      : `${product.price.toLocaleString(store.settings.locale)} ${product.currency ?? store.settings.currency}`}
                  </p>
                  {product.description && <p>{product.description}</p>}
                  <ProductForm
                    currency={store.settings.currency}
                    product={product}
                    storeId={store.id}
                  />
                </article>
              ))
            )}
          </section>
        </>
      )}
    </ShopLayout>
  );
}
