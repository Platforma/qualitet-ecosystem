import type { Document, ObjectId } from "mongodb";

export const storeStatuses = ["draft", "active", "suspended"] as const;
export type StoreStatus = (typeof storeStatuses)[number];

export interface StoreSettings {
  locale: string;
  currency: string;
  timeZone: string;
  description?: string;
  logoUrl?: string;
  faviconUrl?: string;
  contactEmail?: string;
  contactPhone?: string;
  website?: string;
  socialMedia?: StoreSocialMedia;
}

export interface StoreSocialMedia {
  instagram?: string;
  facebook?: string;
  tiktok?: string;
  youtube?: string;
  linkedin?: string;
}

export interface StoreDesign {
  primaryColor: string;
  accentColor: string;
  backgroundColor: string;
  theme?: string;
  logoUrl?: string;
  banners?: string[];
}

export interface StoreBusinessProfile {
  businessType: "retail" | "wholesale" | "services";
  industry: string;
  offerings: string;
  targetAudience: string;
  style: "modern" | "premium" | "business" | "luxury" | "minimal";
  country: string;
}

export interface StoreGeneratedContent {
  heroHeadline: string;
  heroDescription: string;
  about: string;
  categorySuggestions: Array<{ name: string; description: string }>;
  socialPost: string;
  facebookAd: string;
  googleAd: string;
  seoArticle: string;
  newsletterSubject: string;
}

export interface StoreSeo {
  title: string;
  description: string;
}

export interface Store extends Document {
  _id?: ObjectId;
  ownerUserId: string;
  name: string;
  slug: string;
  domain?: string;
  status: StoreStatus;
  settings: StoreSettings;
  design?: StoreDesign;
  businessProfile?: StoreBusinessProfile;
  generatedContent?: StoreGeneratedContent;
  seo?: StoreSeo;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateStoreInput {
  ownerUserId: string;
  name: string;
  slug: string;
  domain?: string;
  settings: StoreSettings;
  businessProfile?: StoreBusinessProfile;
  generatedContent?: StoreGeneratedContent;
  seo?: StoreSeo;
  design?: StoreDesign;
}

const domainLabel = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

function requiredText(value: unknown, field: string, maximumLength: number) {
  if (typeof value !== "string") {
    throw new TypeError(`${field} must be a string.`);
  }

  const normalized = value.trim();
  if (normalized.length === 0 || normalized.length > maximumLength) {
    throw new RangeError(`${field} must contain 1-${maximumLength} characters.`);
  }

  return normalized;
}

export function normalizeStoreName(value: unknown) {
  return requiredText(value, "name", 200);
}

export function normalizeStoreSettings(value: unknown): StoreSettings {
  if (typeof value !== "object" || value === null) {
    throw new TypeError("settings must be an object.");
  }

  const settings = value as Record<string, unknown>;
  const locale = requiredText(settings.locale, "settings.locale", 35);
  if (!/^[a-zA-Z]{2,3}(?:-[a-zA-Z0-9]{2,8})*$/.test(locale)) {
    throw new TypeError("settings.locale must be a valid language tag.");
  }

  const currency = requiredText(
    settings.currency,
    "settings.currency",
    3,
  ).toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) {
    throw new TypeError(
      "settings.currency must be a three-letter ISO currency code.",
    );
  }

  const timeZone = requiredText(settings.timeZone, "settings.timeZone", 64);
  try {
    new Intl.DateTimeFormat("en", { timeZone });
  } catch {
    throw new TypeError("settings.timeZone must be a valid IANA time zone.");
  }

  const optionalText = (key: string, maximumLength: number) => {
    const candidate = settings[key];
    if (candidate === undefined || candidate === null || candidate === "") {
      return "";
    }
    if (typeof candidate !== "string" || candidate.trim().length > maximumLength) {
      throw new RangeError(`settings.${key} must contain at most ${maximumLength} characters.`);
    }
    return candidate.trim();
  };
  const optionalUrl = (key: string) => {
    const candidate = optionalText(key, 2_000);
    if (!candidate) {
      return "";
    }
    try {
      const url = new URL(candidate);
      if (url.protocol !== "https:" && url.protocol !== "http:") {
        throw new Error();
      }
    } catch {
      throw new TypeError(`settings.${key} must be an HTTP or HTTPS URL.`);
    }
    return candidate;
  };
  const email = optionalText("contactEmail", 254);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new TypeError("settings.contactEmail must be a valid email address.");
  }
  const socialInput =
    typeof settings.socialMedia === "object" && settings.socialMedia !== null
      ? (settings.socialMedia as Record<string, unknown>)
      : {};
  const socialMedia = Object.fromEntries(
    ["instagram", "facebook", "tiktok", "youtube", "linkedin"].map((key) => {
      const candidate = socialInput[key];
      if (candidate === undefined || candidate === null || candidate === "") {
        return [key, ""];
      }
      if (typeof candidate !== "string" || candidate.trim().length > 2_000) {
        throw new RangeError(`settings.socialMedia.${key} must be a URL.`);
      }
      const normalized = candidate.trim();
      try {
        const url = new URL(normalized);
        if (url.protocol !== "https:" && url.protocol !== "http:") {
          throw new Error();
        }
      } catch {
        throw new TypeError(`settings.socialMedia.${key} must be an HTTP or HTTPS URL.`);
      }
      return [key, normalized];
    }),
  ) as StoreSocialMedia;

  return {
    locale,
    currency,
    timeZone,
    description: optionalText("description", 5_000),
    logoUrl: optionalUrl("logoUrl"),
    faviconUrl: optionalUrl("faviconUrl"),
    contactEmail: email,
    contactPhone: optionalText("contactPhone", 50),
    website: optionalUrl("website"),
    socialMedia,
  };
}

export function normalizeStoreDesign(value: unknown): StoreDesign {
  if (typeof value !== "object" || value === null) {
    throw new TypeError("design must be an object.");
  }

  const design = value as Record<string, unknown>;
  const primaryColor = requiredText(
    design.primaryColor,
    "design.primaryColor",
    7,
  );
  const accentColor = requiredText(
    design.accentColor,
    "design.accentColor",
    7,
  );
  const backgroundColor = requiredText(
    design.backgroundColor,
    "design.backgroundColor",
    7,
  );
  const colorPattern = /^#[0-9a-f]{6}$/i;
  if (
    !colorPattern.test(primaryColor) ||
    !colorPattern.test(accentColor) ||
    !colorPattern.test(backgroundColor)
  ) {
    throw new TypeError("Design colors must be six-digit hexadecimal colors.");
  }

  const theme =
    design.theme === undefined ? "classic" : requiredText(design.theme, "design.theme", 32);
  if (!["classic", "minimal", "editorial"].includes(theme)) {
    throw new TypeError("design.theme must be a supported theme.");
  }
  const normalizeAsset = (value: unknown, field: string) => {
    if (value === undefined || value === "") {
      return "";
    }
    const asset = requiredText(value, field, 100_000);
    if (/^data:image\/svg\+xml;base64,[A-Za-z0-9+/]+=*$/.test(asset)) {
      return asset;
    }
    try {
      const url = new URL(asset);
      if (url.protocol !== "https:" && url.protocol !== "http:") {
        throw new Error();
      }
    } catch {
      throw new TypeError(`${field} must be an HTTP(S) URL or a generated SVG.`);
    }
    return asset;
  };
  const logoUrl = normalizeAsset(design.logoUrl, "design.logoUrl");
  const bannersValue = design.banners ?? [];
  if (!Array.isArray(bannersValue) || bannersValue.length > 10) {
    throw new TypeError("design.banners must contain no more than 10 URLs.");
  }
  const banners = bannersValue.map((banner, index) => {
    return normalizeAsset(banner, `design.banners[${index}]`);
  });

  return {
    primaryColor: primaryColor.toLowerCase(),
    accentColor: accentColor.toLowerCase(),
    backgroundColor: backgroundColor.toLowerCase(),
    theme,
    logoUrl,
    banners,
  };
}

export function normalizeStoreBusinessProfile(
  value: unknown,
): StoreBusinessProfile {
  if (typeof value !== "object" || value === null) {
    throw new TypeError("businessProfile must be an object.");
  }
  const profile = value as Record<string, unknown>;
  const businessType = profile.businessType;
  const style = profile.style;
  if (
    businessType !== "retail" &&
    businessType !== "wholesale" &&
    businessType !== "services"
  ) {
    throw new TypeError("businessProfile.businessType is invalid.");
  }
  if (
    style !== "modern" &&
    style !== "premium" &&
    style !== "business" &&
    style !== "luxury" &&
    style !== "minimal"
  ) {
    throw new TypeError("businessProfile.style is invalid.");
  }
  return {
    businessType,
    industry: requiredText(profile.industry, "businessProfile.industry", 120),
    offerings: requiredText(profile.offerings, "businessProfile.offerings", 2_000),
    targetAudience: requiredText(
      profile.targetAudience,
      "businessProfile.targetAudience",
      1_000,
    ),
    style,
    country: requiredText(profile.country, "businessProfile.country", 100),
  };
}

export function normalizeStoreGeneratedContent(
  value: unknown,
): StoreGeneratedContent {
  if (typeof value !== "object" || value === null) {
    throw new TypeError("generatedContent must be an object.");
  }
  const content = value as Record<string, unknown>;
  if (!Array.isArray(content.categorySuggestions) || content.categorySuggestions.length > 20) {
    throw new TypeError("generatedContent.categorySuggestions is invalid.");
  }
  const categorySuggestions = content.categorySuggestions.map((candidate) => {
    if (typeof candidate !== "object" || candidate === null) {
      throw new TypeError("generated category must be an object.");
    }
    const category = candidate as Record<string, unknown>;
    return {
      name: requiredText(category.name, "generated category name", 100),
      description: requiredText(
        category.description,
        "generated category description",
        500,
      ),
    };
  });
  return {
    heroHeadline: requiredText(content.heroHeadline, "heroHeadline", 180),
    heroDescription: requiredText(content.heroDescription, "heroDescription", 1_000),
    about: requiredText(content.about, "about", 2_000),
    categorySuggestions,
    socialPost: requiredText(content.socialPost, "socialPost", 2_000),
    facebookAd: requiredText(content.facebookAd, "facebookAd", 2_000),
    googleAd: requiredText(content.googleAd, "googleAd", 2_000),
    seoArticle: requiredText(content.seoArticle, "seoArticle", 5_000),
    newsletterSubject: requiredText(
      content.newsletterSubject,
      "newsletterSubject",
      200,
    ),
  };
}

export function normalizeStoreSeo(value: unknown): StoreSeo {
  if (typeof value !== "object" || value === null) {
    throw new TypeError("seo must be an object.");
  }
  const seo = value as Record<string, unknown>;
  return {
    title: requiredText(seo.title, "seo.title", 70),
    description: requiredText(seo.description, "seo.description", 170),
  };
}

function validateDomain(value: unknown) {
  const domain = requiredText(value, "domain", 253).toLowerCase();
  const labels = domain.split(".");
  if (
    labels.length < 2 ||
    labels.some((label) => label.length > 63 || !domainLabel.test(label))
  ) {
    throw new TypeError("domain must be a valid hostname without a URL path.");
  }

  return domain;
}

export function normalizeCreateStoreInput(
  input: CreateStoreInput,
): CreateStoreInput {
  if (typeof input !== "object" || input === null) {
    throw new TypeError("Store input must be an object.");
  }

  const ownerUserId = requiredText(input.ownerUserId, "ownerUserId", 128);
  const name = normalizeStoreName(input.name);
  const slug = requiredText(input.slug, "slug", 63).toLowerCase();
  if (!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(slug) || slug.length < 2) {
    throw new TypeError("slug must contain 2-63 lowercase letters, numbers, or hyphens.");
  }
  if (
    [
      "api",
      "dashboard",
      "login",
      "shop",
      "products",
      "categories",
      "settings",
      "design",
      "orders",
      "customers",
      "analytics",
    ].includes(slug)
  ) {
    throw new TypeError("slug is reserved by the Shop application.");
  }

  const settings = normalizeStoreSettings(input.settings);
  const domain =
    input.domain === undefined ? undefined : validateDomain(input.domain);
  const businessProfile =
    input.businessProfile === undefined
      ? undefined
      : normalizeStoreBusinessProfile(input.businessProfile);
  const generatedContent =
    input.generatedContent === undefined
      ? undefined
      : normalizeStoreGeneratedContent(input.generatedContent);
  const seo = input.seo === undefined ? undefined : normalizeStoreSeo(input.seo);
  const design =
    input.design === undefined ? undefined : normalizeStoreDesign(input.design);

  return {
    ownerUserId,
    name,
    slug,
    ...(domain ? { domain } : {}),
    settings,
    ...(businessProfile ? { businessProfile } : {}),
    ...(generatedContent ? { generatedContent } : {}),
    ...(seo ? { seo } : {}),
    ...(design ? { design } : {}),
  };
}
