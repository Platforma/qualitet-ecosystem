import { connection } from "next/server";
import Image from "next/image";
import type { Document } from "mongodb";
import type { Metadata } from "next";
import { getCollection } from "../../../lib/server/database";
import {
  CallToAction,
  PageIntro,
} from "../components/portal-shell";
import {
  marketplaceCategories,
  type MarketplaceCategory,
} from "../../../lib/models/product";

export const metadata: Metadata = {
  title: "Marketplace",
  description:
    "Przeglądaj produkty opublikowane w Qualitet Market i odkrywaj ofertę firm z ekosystemu.",
  alternates: { canonical: "/market" },
};

export const instant = false;

type PublicProduct = {
  id: string;
  kind: "product" | "service" | "listing";
  category: MarketplaceCategory;
  name: string;
  description: string;
  price: number | null;
  currency: string;
  imageUrl: string | null;
  seller: string;
};

type CatalogResult =
  | { state: "ready"; products: PublicProduct[] }
  | { state: "unconfigured" | "unavailable"; products: [] };

function toPublicProduct(
  document: Document,
  sellers: Map<string, string>,
): PublicProduct | null {
  if (typeof document.name !== "string" || !document.name.trim()) return null;
  const category = marketplaceCategories.find(
    (item) => item.slug === document.category,
  );
  const kind =
    document.kind === "service" || document.kind === "listing"
      ? document.kind
      : "product";
  const imageUrl =
    typeof document.imageUrl === "string" &&
    document.imageUrl.startsWith("https://")
      ? document.imageUrl
      : null;
  return {
    id: String(document._id),
    kind,
    category: category?.slug ?? "inne",
    name: document.name,
    description:
      typeof document.description === "string" ? document.description : "",
    price:
      typeof document.price === "number" && Number.isFinite(document.price)
        ? document.price
        : null,
    currency:
      typeof document.currency === "string" && /^[A-Z]{3}$/.test(document.currency)
        ? document.currency
        : "PLN",
    imageUrl,
    seller:
      typeof document.supplierCompanyId === "string"
        ? sellers.get(document.supplierCompanyId) ?? "Firma Qualitet Market"
        : "Firma Qualitet Market",
  };
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function loadPublishedProducts(
  query: string,
  category: MarketplaceCategory | null,
): Promise<CatalogResult> {
  await connection();
  if (!process.env.MONGODB_URI?.trim()) {
    return { state: "unconfigured", products: [] };
  }

  try {
    const activeCompanies = await getCollection("companies").then((companies) =>
      companies
        .find({ status: "active" }, { projection: { name: 1 } })
        .toArray(),
    );
    const sellers = new Map(
      activeCompanies.map((company) => [
        String(company._id),
        typeof company.name === "string" ? company.name : "Firma Qualitet Market",
      ]),
    );
    if (sellers.size === 0) return { state: "ready", products: [] };

    const searchRegex = query ? new RegExp(escapeRegex(query), "i") : null;
    const filters = {
      status: "active",
      archivedAt: { $exists: false },
      supplierCompanyId: { $in: [...sellers.keys()] },
      "publication.marketplace": { $ne: "unpublished" },
      ...(category ? { category } : {}),
      ...(searchRegex
        ? { $or: [{ name: searchRegex }, { description: searchRegex }] }
        : {}),
    };
    const documents = await getCollection("products").then((collection) =>
      collection
        .find(filters, {
          projection: {
            kind: 1,
            category: 1,
            name: 1,
            description: 1,
            price: 1,
            currency: 1,
            imageUrl: 1,
            supplierCompanyId: 1,
          },
        })
        .sort({ createdAt: -1 })
        .limit(60)
        .toArray(),
    );
    return {
      state: "ready",
      products: documents
        .map((document) => toPublicProduct(document, sellers))
        .filter((product): product is PublicProduct => product !== null),
    };
  } catch (error) {
    console.error(
      "Public marketplace catalog unavailable:",
      error instanceof Error ? error.name : "UnknownError",
    );
    return { state: "unavailable", products: [] };
  }
}

function formatPrice(product: PublicProduct) {
  if (product.price === null) return null;
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: product.currency,
  }).format(product.price);
}

export default async function MarketplacePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string }>;
}) {
  const params = await searchParams;
  const requestedQuery =
    typeof params.q === "string" ? params.q.trim().slice(0, 80) : "";
  const requestedCategory =
    typeof params.category === "string"
      ? marketplaceCategories.find((item) => item.slug === params.category)?.slug ?? null
      : null;
  const catalog = await loadPublishedProducts(requestedQuery, requestedCategory);

  return (
    <>
      <section className="portal-container portal-section">
        <PageIntro
          description="Przeglądaj opublikowane oferty aktywnych firm. Katalog pokazuje rzeczywiste wpisy z platformy — bez produktów demonstracyjnych."
          eyebrow="Qualitet Market"
          title="Odkrywaj ofertę marketplace."
        />
      </section>

      <section className="portal-container pb-16">
        <form action="/market" className="portal-market-filters mb-6" method="get">
          <label>
            <span>Szukaj ofert</span>
            <input
              maxLength={80}
              name="q"
              placeholder="Nazwa lub opis"
              type="search"
              defaultValue={requestedQuery}
            />
          </label>
          <label>
            <span>Kategoria</span>
            <select name="category" defaultValue={requestedCategory ?? ""}>
              <option value="">Wszystkie kategorie</option>
              {marketplaceCategories.map((item) => (
                <option key={item.slug} value={item.slug}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <button className="portal-button portal-button-primary" type="submit">
            Szukaj
          </button>
        </form>
        {catalog.state === "unconfigured" && (
          <p className="portal-notice" role="status">
            Katalog jest chwilowo niedostępny, ponieważ usługa bazy danych nie
            została skonfigurowana.
          </p>
        )}
        {catalog.state === "unavailable" && (
          <p className="portal-notice" role="alert">
            Nie udało się teraz pobrać katalogu. Spróbuj ponownie później.
          </p>
        )}
        {catalog.state === "ready" && catalog.products.length === 0 && (
          <div className="portal-card">
            <h2 className="portal-card-title mt-0">Brak opublikowanych ofert</h2>
            <p className="portal-card-copy">
              {requestedQuery || requestedCategory
                ? "Nie znaleziono ofert dla wybranych kryteriów."
                : "Oferta pojawi się tutaj, gdy aktywne firmy opublikują swoje produkty, usługi lub ogłoszenia."}
            </p>
            <a className="portal-button portal-button-secondary mt-5" href="/partner">
              Informacje dla partnerów
            </a>
          </div>
        )}
        {catalog.state === "ready" && catalog.products.length > 0 && (
          <ul className="grid list-none gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3">
            {catalog.products.map((product) => (
              <li className="portal-card" key={product.id}>
                {product.imageUrl && (
                  <Image
                    alt=""
                    className="portal-market-image"
                    height={450}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    unoptimized
                    src={product.imageUrl}
                    width={800}
                  />
                )}
                <p className="portal-eyebrow">
                  {marketplaceCategories.find((item) => item.slug === product.category)?.label}
                  {" · "}
                  {product.kind === "service"
                    ? "Usługa"
                    : product.kind === "listing"
                      ? "Ogłoszenie"
                      : "Produkt"}
                </p>
                <h2 className="portal-card-title">{product.name}</h2>
                <p className="portal-market-seller">{product.seller}</p>
                {product.description && (
                  <p className="portal-card-copy">{product.description}</p>
                )}
                {formatPrice(product) && (
                  <p className="portal-product-price">{formatPrice(product)}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="portal-container pb-16">
        <CallToAction
          description="Zarejestruj konto, zgłoś firmę do weryfikacji, a po aktywacji dodawaj własne produkty, usługi i ogłoszenia."
          eyebrow="Dla firm"
          primaryHref="/partner"
          primaryLabel="Współpracuj z nami"
          secondaryHref="/supplier"
          secondaryLabel="Informacje dla dostawców"
          title="Prowadzisz firmę lub dostarczasz produkty?"
        />
      </section>
    </>
  );
}
