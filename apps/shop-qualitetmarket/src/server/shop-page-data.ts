import type { GetServerSidePropsContext } from "next";
import type {
  Store,
  StoreBusinessProfile,
  StoreDesign,
  StoreGeneratedContent,
  StoreSeo,
  StoreSettings,
} from "../models/store";
import { getShopOwner } from "./shop-auth";
import { listStoresForOwner } from "./store-repository";

export interface StorePageData {
  id: string;
  name: string;
  slug: string;
  domain: string | null;
  status: string;
  settings: StoreSettings;
  design: StoreDesign | null;
  businessProfile: StoreBusinessProfile | null;
  generatedContent: StoreGeneratedContent | null;
  seo: StoreSeo | null;
  createdAt: string;
  updatedAt: string;
}

export interface ShopPageContext {
  ownerId: string;
  stores: StorePageData[];
  store: StorePageData | null;
}

function serializeStore(store: Store): StorePageData {
  return {
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
}

function loginRedirect(destination: string) {
  const next = destination.startsWith("/") && !destination.startsWith("//")
    ? destination
    : "/dashboard";
  return {
    redirect: {
      destination: `/login?next=${encodeURIComponent(next)}`,
      permanent: false as const,
    },
  };
}

export async function getShopPageContext(
  context: GetServerSidePropsContext,
) {
  context.res.setHeader("Cache-Control", "private, no-store, max-age=0");
  const owner = await getShopOwner(context.req);
  if (!owner) {
    return { page: loginRedirect(context.resolvedUrl) } as const;
  }

  const stores = (await listStoresForOwner(owner.id)).map(serializeStore);
  const selectedId =
    typeof context.query.store === "string" ? context.query.store : "";
  const store =
    (selectedId
      ? stores.find((item) => item.id === selectedId)
      : stores.length === 1
        ? stores[0]
        : undefined) ?? null;

  return {
    page: {
      props: {
        ownerId: owner.id,
        stores,
        store,
      },
    },
  } as const;
}
