import type { GetServerSideProps } from "next";
import ShopLayout from "../../components/shop-layout";
import StoreDesignForm from "../../components/store-design-form";
import type { ShopPageContext, StorePageData } from "../../server/shop-page-data";
import { getShopPageContext } from "../../server/shop-page-data";

type DesignProps = { store: StorePageData | null; stores: StorePageData[] };

export const getServerSideProps: GetServerSideProps<DesignProps> = async (
  context,
) => {
  const result = await getShopPageContext(context);
  if ("redirect" in result.page) {
    return result.page;
  }

  const page = result.page.props as ShopPageContext;
  return { props: { store: page.store, stores: page.stores } };
};

export default function ShopDesignPage({ store, stores }: DesignProps) {
  return (
    <ShopLayout active="design" store={store} stores={stores}>
      <header className="shop-heading">
        <h1>Design sklepu</h1>
        <p>Edytuj kolory zapisane w konfiguracji wybranego sklepu.</p>
      </header>
      {store ? (
        <section className="shop-card">
          <StoreDesignForm store={store} />
        </section>
      ) : (
        <section className="shop-card shop-empty">
          {stores.length === 0
            ? "Utwórz sklep z poziomu dashboardu, aby zapisać jego design."
            : "Wybierz sklep z menu, aby edytować jego design."}
        </section>
      )}
    </ShopLayout>
  );
}
