import { connection } from "next/server";
import type { Document } from "mongodb";
import type { Metadata } from "next";
import { getCollection } from "../../../lib/server/database";
import {
  CallToAction,
  PageIntro,
} from "../components/portal-shell";

export const metadata: Metadata = {
  title: "Marketplace",
  description:
    "Przeglądaj produkty opublikowane w Qualitet Market i odkrywaj ofertę firm z ekosystemu.",
  alternates: { canonical: "/market" },
};

export const instant = false;

type PublicProduct = {
  id: string;
  name: string;
  description: string;
  price: number | null;
  currency: string;
};

type CatalogResult =
  | { state: "ready"; products: PublicProduct[] }
  | { state: "unconfigured" | "unavailable"; products: [] };

function toPublicProduct(document: Document): PublicProduct | null {
  if (typeof document.name !== "string" || !document.name.trim()) return null;
  return {
    id: String(document._id),
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
  };
}

async function loadPublishedProducts(): Promise<CatalogResult> {
  await connection();
  if (!process.env.MONGODB_URI?.trim()) {
    return { state: "unconfigured", products: [] };
  }

  try {
    const documents = await getCollection("products")
      .then((collection) =>
        collection
          .find(
            { status: "active", archivedAt: { $exists: false } },
            {
              projection: {
                name: 1,
                description: 1,
                price: 1,
                currency: 1,
              },
            },
          )
          .sort({ createdAt: -1 })
          .limit(24)
          .toArray(),
      );
    return {
      state: "ready",
      products: documents
        .map(toPublicProduct)
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

export default async function MarketplacePage() {
  const catalog = await loadPublishedProducts();

  return (
    <>
      <section className="portal-container portal-section">
        <PageIntro
          description="Oferta widoczna poniżej obejmuje wyłącznie produkty opublikowane przez platformę. Katalog aktualizuje się na podstawie bieżących danych marketplace."
          eyebrow="Qualitet Market"
          title="Odkrywaj ofertę marketplace."
        />
      </section>

      <section className="portal-container pb-16">
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
            <h2 className="portal-card-title mt-0">Brak opublikowanych produktów</h2>
            <p className="portal-card-copy">
              Oferta pojawi się tutaj, gdy produkty zostaną opublikowane w
              marketplace.
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
                <p className="portal-eyebrow">Oferta Qualitet Market</p>
                <h2 className="portal-card-title">{product.name}</h2>
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
          description="Chcesz przedstawić swoją ofertę w Qualitet Market? Załóż konto i poznaj możliwości współpracy."
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
