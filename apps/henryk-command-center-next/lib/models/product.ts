import type { Document, ObjectId } from "mongodb";

export const productStatuses = ["active", "draft", "archived"] as const;
export type ProductStatus = (typeof productStatuses)[number];

export const productPublicationStatuses = ["published", "unpublished"] as const;
export type ProductPublicationStatus = (typeof productPublicationStatuses)[number];

export interface ProductModel extends Document {
  _id?: ObjectId;
  name: string;
  description?: string;
  sku?: string;
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
