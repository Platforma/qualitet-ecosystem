import type { GetServerSideProps } from "next";

export const getServerSideProps: GetServerSideProps = async (context) => {
  const storeId =
    typeof context.query.store === "string"
      ? `?store=${encodeURIComponent(context.query.store)}`
      : "";
  return {
    redirect: {
      destination: `/dashboard${storeId}`,
      permanent: false,
    },
  };
};

export default function ShopPanelRoute() {
  return null;
}
