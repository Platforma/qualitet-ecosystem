import type { GetServerSideProps } from "next";
import ShopLayout from "../../components/shop-layout";
import StoreSettingsForm from "../../components/store-settings-form";
import type { ShopPageContext, StorePageData } from "../../server/shop-page-data";
import { getShopPageContext } from "../../server/shop-page-data";

type SettingsProps = {
  store: StorePageData | null;
  stores: StorePageData[];
};

export const getServerSideProps: GetServerSideProps<SettingsProps> = async (
  context,
) => {
  const result = await getShopPageContext(context);
  if ("redirect" in result.page) {
    return result.page;
  }

  const page = result.page.props as ShopPageContext;
  return { props: { store: page.store, stores: page.stores } };
};

export default function ShopSettingsPage({ store, stores }: SettingsProps) {
  return (
    <ShopLayout active="settings" store={store} stores={stores}>
      <header className="shop-heading">
        <h1>Ustawienia sklepu</h1>
        <p>Język, waluta i strefa czasowa są zapisywane dla wybranego sklepu.</p>
      </header>
      {store ? (
        <section className="shop-card">
          <StoreSettingsForm store={store} />
        </section>
      ) : (
        <section className="shop-card shop-empty">
          {stores.length === 0
            ? "Utwórz sklep z poziomu dashboardu, aby edytować jego ustawienia."
            : "Wybierz sklep z menu, aby edytować jego ustawienia."}
        </section>
      )}
    </ShopLayout>
  );
}
