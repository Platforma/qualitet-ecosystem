import type { ObjectId } from "mongodb";

export const companyTypes = [
  "manufacturer",
  "wholesaler",
  "importer",
  "distributor",
  "brand",
] as const;

export type CompanyType = (typeof companyTypes)[number];
export type CompanyStatus = "pending" | "active" | "rejected" | "suspended";

export const leadStatuses = [
  "NEW",
  "CONTACTED",
  "OPENED",
  "CLICKED",
  "REGISTERED",
  "ACTIVE",
  "REJECTED",
] as const;

export type LeadStatus = (typeof leadStatuses)[number];

export interface CompanyModel {
  _id?: ObjectId;
  name: string;
  slug: string;
  email: string;
  phone: string;
  website: string;
  country: string;
  type: CompanyType;
  categories: string[];
  status: CompanyStatus;
  commissionDefault: number;
  adBudget: number;
  productsCount: number;
  salesCount: number;
  ownerUserId?: string;
  marketingConsent: boolean;
  logoUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface LeadModel {
  _id?: ObjectId;
  name: string;
  companyName: string;
  website: string;
  email: string;
  phone: string;
  source: string;
  status: LeadStatus;
  notes: string;
  categories: string[];
  suggestedDescription?: string;
  suggestedTags?: string[];
  suggestedSeoTitle?: string;
  suggestedCommission?: number;
  marketingConsent: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface OutreachCampaignModel {
  _id?: ObjectId;
  name: string;
  subject: string;
  message: string;
  followUps: { subject: string; message: string }[];
  status: "draft" | "approved" | "sending" | "sent" | "paused";
  sent: number;
  opened: number;
  clicked: number;
  registered: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SupplierProductModel {
  _id?: ObjectId;
  companyId: string;
  name: string;
  description: string;
  sku: string;
  wholesalePrice: number;
  retailPrice: number;
  currency: string;
  partnerCommission: number;
  status: "active" | "draft" | "archived";
  publication: {
    marketplace: "published";
    partnerProgram: "published";
    aiQualitet: "published";
  };
  createdAt: Date;
  updatedAt: Date;
}
