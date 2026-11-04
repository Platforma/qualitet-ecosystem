import Link from "next/link";
import type { ReactNode } from "react";

const navigation = [
  { label: "Dashboard", href: "/dashboard", key: "dashboard" },
  { label: "Ustawienia", href: "/settings", key: "settings" },
  { label: "Design", href: "/design", key: "design" },
  { label: "Produkty", href: "/products", key: "products" },
  { label: "Kategorie", href: "/categories", key: "categories" },
] as const;

export default function ShopLayout({
  active,
  store,
  stores,
  children,
}: {
  active: (typeof navigation)[number]["key"];
  store: { id: string; name: string } | null;
  stores: { id: string; name: string }[];
  children: ReactNode;
}) {
  const suffix = store ? `?store=${encodeURIComponent(store.id)}` : "";

  return (
    <main className="shop-page">
      <header className="shop-header">
        <Link aria-label="Shop Qualitet — dashboard" className="shop-brand" href="/dashboard">
          <span aria-hidden="true" className="shop-brand-mark">Q</span>
          <span>
            <strong>QUALITET</strong>
            <small>SHOP BUILDER</small>
          </span>
        </Link>
        <form action="/api/auth/logout" className="shop-logout" method="post">
          <button className="button button-secondary" type="submit">Wyloguj</button>
        </form>
      </header>

      <div className="shop-workspace">
        <nav aria-label="Nawigacja sklepu" className="shop-nav">
          {navigation.map((item) => (
            <Link
              aria-current={active === item.key ? "page" : undefined}
              className={`shop-nav-link${active === item.key ? " is-active" : ""}`}
              href={`${item.href}${suffix}`}
              key={item.key}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <section className="shop-content">
          {store ? (
            <p className="shop-current-store">
              Wybrany sklep: <strong>{store.name}</strong>
              {stores.length > 1 && (
                <details className="shop-store-menu">
                  <summary>Zmień sklep</summary>
                  {stores
                    .filter((item) => item.id !== store.id)
                    .map((item) => (
                      <Link
                        href={`${active === "dashboard" ? "/dashboard" : `/${active}`}?store=${encodeURIComponent(item.id)}`}
                        key={item.id}
                      >
                        {item.name}
                      </Link>
                    ))}
                </details>
              )}
            </p>
          ) : stores.length > 1 ? (
            <div className="shop-store-picker">
              <span>Wybierz sklep:</span>
              {stores.map((item) => (
                <Link href={`/dashboard?store=${encodeURIComponent(item.id)}`} key={item.id}>
                  {item.name}
                </Link>
              ))}
            </div>
          ) : null}
          {children}
        </section>
      </div>
    </main>
  );
}
