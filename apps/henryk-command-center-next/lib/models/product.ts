import type { Document, ObjectId } from "mongodb";

export const productStatuses = ["active", "draft", "archived"] as const;
export type ProductStatus = (typeof productStatuses)[number];

export const productPublicationStatuses = ["published", "unpublished"] as const;
export type ProductPublicationStatus = (typeof productPublicationStatuses)[number];

export const marketplaceCategories = [
  { slug: "motoryzacja", label: "Motoryzacja" },
  { slug: "czesci-samochodowe", label: "Części samochodowe" },
  { slug: "elektronika", label: "Elektronika" },
  { slug: "dom-i-ogrod", label: "Dom i ogród" },
  { slug: "rolnictwo", label: "Rolnictwo" },
  { slug: "budownictwo", label: "Budownictwo" },
  { slug: "przemysl", label: "Przemysł" },
  { slug: "moda", label: "Moda" },
  { slug: "zdrowie", label: "Zdrowie" },
  { slug: "uslugi", label: "Usługi" },
  { slug: "firmy", label: "Firmy" },
  { slug: "hurtownie", label: "Hurtownie" },
  { slug: "inne", label: "Pozostałe" },
] as const;

export type MarketplaceCategory = (typeof marketplaceCategories)[number]["slug"];
export const marketplaceListingKinds = ["product", "service", "listing"] as const;
export type MarketplaceListingKind = (typeof marketplaceListingKinds)[number];

export interface ProductModel extends Document {
  _id?: ObjectId;
  kind?: MarketplaceListingKind;
  category?: MarketplaceCategory;
  name: string;
  description?: string;
  sku?: string;
  imageUrl?: string;
  price?: number;
  wholesalePrice?: number;
  currency?: string;
  partnerCommission?: number;
  supplierCompanyId?: string;
  storeId?: string;
  status: ProductStatus;
  publication?: {
    marketplace: ProductPublicationStatus;
    partnerProgram: ProductPublicationStatus;
    aiQualitet: ProductPublicationStatus;
  };
  distributionChannels?: string[];
  createdBy?: string;
  createdAt: Date;
  updatedAt?: Date;
  archivedAt?: Date;
}
