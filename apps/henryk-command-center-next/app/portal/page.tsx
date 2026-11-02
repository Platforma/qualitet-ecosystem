import type { Metadata } from "next";
import {
  CallToAction,
  FeatureCard,
  PortalButton,
} from "./components/portal-shell";

export const metadata: Metadata = {
  title: "Rozwijaj firmę z Qualitet",
  description:
    "Poznaj marketplace Qualitet Market, możliwości współpracy i narzędzia AI wspierające codzienną pracę firmy.",
  alternates: { canonical: "/" },
};

export default function PublicHomePage() {
  return (
    <>
      <section className="portal-container portal-hero">
        <div className="portal-hero-grid">
          <div>
            <p className="portal-eyebrow">Jeden ekosystem. Wiele możliwości.</p>
            <h1 className="portal-hero-title">
              Twoja firma może rozwijać się <span className="text-[#176b4b]">po swojemu.</span>
            </h1>
            <p className="portal-lead">
              Odkrywaj produkty i usługi, nawiązuj współpracę oraz korzystaj z
              narzędzi, które pomagają uporządkować rozwój firmy — od pierwszego
              pomysłu po codzienną obsługę.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <PortalButton href="/market">Odkryj marketplace</PortalButton>
              <PortalButton href="/partner" variant="secondary">
                Zostań partnerem
              </PortalButton>
            </div>
          </div>
          <div aria-label="Główne obszary Qualitet Market" className="portal-hero-panel">
            <p className="portal-eyebrow">Qualitet Ecosystem</p>
            <h2 className="mt-4 max-w-sm text-3xl font-extrabold leading-tight tracking-tighter">
              Miejsce spotkania firm, oferty i technologii.
            </h2>
            <ul className="portal-check-list mt-7">
              <li><span className="portal-check">✓</span><span>Przeglądaj publiczną ofertę marketplace.</span></li>
              <li><span className="portal-check">✓</span><span>Dołącz jako partner lub dostawca.</span></li>
              <li><span className="portal-check">✓</span><span>Poznaj narzędzia AI dla biznesu.</span></li>
            </ul>
          </div>
        </div>
      </section>

      <section className="portal-section portal-section-tinted">
        <div className="portal-container">
          <p className="portal-eyebrow">Odkryj ekosystem</p>
          <h2 className="portal-section-heading">Wybierz obszar, którego potrzebujesz.</h2>
          <p className="portal-section-copy">
            Zacznij od przeglądania oferty albo sprawdź, jak dołączyć do
            społeczności firm współpracujących z Qualitet.
          </p>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <FeatureCard icon="01" title="Marketplace">
              Przeglądaj opublikowane produkty i poznawaj ofertę dostępną w
              ekosystemie.
            </FeatureCard>
            <FeatureCard icon="02" title="Partnerzy i dostawcy">
              Zobacz, jak rozpocząć współpracę i utworzyć konto w platformie.
            </FeatureCard>
            <FeatureCard icon="03" title="Narzędzia AI">
              Poznaj cyfrowe wsparcie dla zadań biznesowych, marketingu i
              organizacji pracy.
            </FeatureCard>
          </div>
        </div>
      </section>

      <section className="portal-container portal-section">
        <CallToAction
          description="Utwórz konto, aby rozpocząć współpracę i korzystać z funkcji dostępnych dla użytkowników platformy."
          eyebrow="Zacznij tutaj"
          secondaryHref="/ai"
          secondaryLabel="Poznaj narzędzia AI"
          title="Zrób pierwszy krok w swoim tempie."
        />
      </section>
    </>
  );
}
