import Link from "next/link";
import type { ReactNode } from "react";

const navigation = [
  { href: "/", label: "Start" },
  { href: "/market", label: "Marketplace" },
  { href: "/partner", label: "Partnerzy" },
  { href: "/supplier", label: "Dostawcy" },
  { href: "/ai", label: "AI" },
  { href: "/live", label: "Na żywo" },
];

export function PortalButton({
  href,
  children,
  variant = "primary",
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary";
}) {
  return (
    <Link
      className={`portal-button ${
        variant === "primary" ? "portal-button-primary" : "portal-button-secondary"
      }`}
      href={href}
    >
      {children}
    </Link>
  );
}

export function PageIntro({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <header className="max-w-3xl">
      <p className="portal-eyebrow">{eyebrow}</p>
      <h1 className="portal-section-heading">{title}</h1>
      <p className="portal-section-copy text-base">{description}</p>
    </header>
  );
}

export function FeatureCard({
  icon,
  title,
  children,
}: {
  icon: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <article className="portal-card">
      <span aria-hidden="true" className="portal-card-icon">
        {icon}
      </span>
      <h3 className="portal-card-title">{title}</h3>
      <p className="portal-card-copy">{children}</p>
    </article>
  );
}

export function CallToAction({
  eyebrow,
  title,
  description,
  primaryHref = "/register",
  primaryLabel = "Utwórz konto",
  secondaryHref = "/market",
  secondaryLabel = "Poznaj marketplace",
}: {
  eyebrow: string;
  title: string;
  description: string;
  primaryHref?: string;
  primaryLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
}) {
  return (
    <section className="portal-cta">
      <p className="portal-eyebrow">{eyebrow}</p>
      <div className="mt-4 grid gap-6 md:grid-cols-[1fr_auto] md:items-end">
        <div>
          <h2 className="portal-section-heading">{title}</h2>
          <p className="portal-section-copy">{description}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <PortalButton href={primaryHref}>{primaryLabel}</PortalButton>
          <PortalButton href={secondaryHref} variant="secondary">
            {secondaryLabel}
          </PortalButton>
        </div>
      </div>
    </section>
  );
}

export default function PortalShell({ children }: { children: ReactNode }) {
  return (
    <div className="portal-shell">
      <header className="portal-header">
        <div className="portal-container portal-header-inner">
          <Link aria-label="Qualitet Market — strona główna" className="portal-brand" href="/">
            <span aria-hidden="true" className="portal-brand-mark">
              Q
            </span>
            <span>Qualitet Market</span>
          </Link>
          <nav aria-label="Nawigacja główna" className="portal-nav">
            {navigation.map((item) => (
              <Link className="portal-nav-link" href={item.href} key={item.href}>
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="portal-header-actions">
            <PortalButton href="/login" variant="secondary">
              Zaloguj
            </PortalButton>
            <PortalButton href="/register">Dołącz</PortalButton>
          </div>
        </div>
      </header>
      <main className="portal-main">{children}</main>
      <footer className="portal-footer">
        <div className="portal-container flex flex-col gap-5 py-7 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link className="portal-brand" href="/">
              <span aria-hidden="true" className="portal-brand-mark">
                Q
              </span>
              <span>Qualitet Market</span>
            </Link>
            <p className="mt-2 text-xs text-[#59665e]">
              Marketplace i narzędzia dla rozwijających się firm.
            </p>
          </div>
          <nav aria-label="Linki dodatkowe" className="flex flex-wrap gap-x-5 gap-y-3">
            <Link className="portal-footer-link" href="/market">
              Marketplace
            </Link>
            <Link className="portal-footer-link" href="/partner">
              Współpraca
            </Link>
            <Link className="portal-footer-link" href="/supplier">
              Dostawcy
            </Link>
            <a
              className="portal-footer-link"
              href="https://admin.qualitet-market.com"
              rel="noreferrer"
            >
              Strefa administracyjna
            </a>
          </nav>
          <p className="text-xs text-[#59665e]">Qualitet Market</p>
        </div>
      </footer>
    </div>
  );
}
