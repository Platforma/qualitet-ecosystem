import type { GetServerSideProps } from "next";
import CategoryForm from "../../components/category-form";
import ShopLayout from "../../components/shop-layout";
import type { ShopCategoryListItem } from "../../server/shop-catalog";
import { listCategoriesForStore } from "../../server/shop-catalog";
import type { ShopPageContext, StorePageData } from "../../server/shop-page-data";
import { getShopPageContext } from "../../server/shop-page-data";

type CategoriesProps = {
  store: StorePageData | null;
  stores: StorePageData[];
  categories: ShopCategoryListItem[];
};

export const getServerSideProps: GetServerSideProps<CategoriesProps> = async (
  context,
) => {
  const result = await getShopPageContext(context);
  if ("redirect" in result.page) {
    return result.page;
  }

  const page = result.page.props as ShopPageContext;
  const categories = page.store
    ? await listCategoriesForStore(page.store.id)
    : [];
  return { props: { store: page.store, stores: page.stores, categories } };
};

export default function ShopCategoriesPage({
  store,
  stores,
  categories,
}: CategoriesProps) {
  return (
    <ShopLayout active="categories" store={store} stores={stores}>
      <header className="shop-heading">
        <h1>Kategorie</h1>
        <p>Kategorie zapisane w MongoDB i przypisane do wybranego sklepu.</p>
      </header>
      {!store ? (
        <section className="shop-card shop-empty">
          {stores.length === 0
            ? "Utwórz sklep, aby zarządzać jego kategoriami."
            : "Wybierz sklep z menu, aby zarządzać kategoriami."}
        </section>
      ) : (
        <>
          <section className="shop-card">
            <CategoryForm storeId={store.id} />
          </section>
          <section aria-label="Kategorie sklepu" className="shop-grid">
            {categories.length === 0 ? (
              <p className="shop-empty">Ten sklep nie ma jeszcze kategorii.</p>
            ) : (
              categories.map((category) => (
                <article className="shop-card" key={category.id}>
                  <CategoryForm category={category} storeId={store.id} />
                </article>
              ))
            )}
          </section>
        </>
      )}
    </ShopLayout>
  );
}
