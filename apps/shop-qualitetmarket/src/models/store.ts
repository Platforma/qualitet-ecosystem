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

export interface Store extends Document {
  _id?: ObjectId;
  ownerUserId: string;
  name: string;
  slug: string;
  domain?: string;
  status: StoreStatus;
  settings: StoreSettings;
  design?: StoreDesign;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateStoreInput {
  ownerUserId: string;
  name: string;
  slug: string;
  domain?: string;
  settings: StoreSettings;
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
  const logoUrl =
    design.logoUrl === undefined || design.logoUrl === ""
      ? ""
      : requiredText(design.logoUrl, "design.logoUrl", 2_000);
  if (logoUrl) {
    try {
      const url = new URL(logoUrl);
      if (url.protocol !== "https:" && url.protocol !== "http:") {
        throw new Error();
      }
    } catch {
      throw new TypeError("design.logoUrl must be an HTTP or HTTPS URL.");
    }
  }
  const bannersValue = design.banners ?? [];
  if (!Array.isArray(bannersValue) || bannersValue.length > 10) {
    throw new TypeError("design.banners must contain no more than 10 URLs.");
  }
  const banners = bannersValue.map((banner, index) => {
    const normalized = requiredText(banner, `design.banners[${index}]`, 2_000);
    try {
      const url = new URL(normalized);
      if (url.protocol !== "https:" && url.protocol !== "http:") {
        throw new Error();
      }
    } catch {
      throw new TypeError(`design.banners[${index}] must be an HTTP or HTTPS URL.`);
    }
    return normalized;
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

  const settings = normalizeStoreSettings(input.settings);
  const domain =
    input.domain === undefined ? undefined : validateDomain(input.domain);

  return {
    ownerUserId,
    name,
    slug,
    ...(domain ? { domain } : {}),
    settings,
  };
}
