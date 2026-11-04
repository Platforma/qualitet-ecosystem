import type { Metadata } from "next";
import {
  CallToAction,
  FeatureCard,
  PageIntro,
} from "../components/portal-shell";

export const metadata: Metadata = {
  title: "Współpraca dla partnerów",
  description:
    "Poznaj możliwości współpracy partnerskiej w ekosystemie Qualitet Market.",
  alternates: { canonical: "/partner" },
};

export default function PartnerPage() {
  return (
    <>
      <section className="portal-container portal-section">
        <PageIntro
          description="Qualitet łączy firmy z marketplace, narzędziami cyfrowymi i możliwościami rozwoju. Poznaj platformę i zdecyduj, jak chcesz w niej uczestniczyć."
          eyebrow="Dla partnerów"
          title="Rozwijaj swoją ofertę w dobrym ekosystemie."
        />
        <div className="mt-8 flex flex-wrap gap-3">
          <a className="portal-button portal-button-primary" href="/register?intent=partner">
            Utwórz konto partnera
          </a>
          <a className="portal-button portal-button-secondary" href="/market">
            Zobacz marketplace
          </a>
        </div>
      </section>

      <section className="portal-section portal-section-tinted">
        <div className="portal-container">
          <p className="portal-eyebrow">Współpraca</p>
          <h2 className="portal-section-heading">Jedno konto. Możliwość rozwijania relacji.</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <FeatureCard icon="01" title="Obecność w ekosystemie">
              Przygotuj profil firmy i sprawdź, które funkcje platformy pasują do
              Twojej działalności.
            </FeatureCard>
            <FeatureCard icon="02" title="Oferta marketplace">
              Zapoznaj się z zasadami prezentowania opublikowanych produktów i
              budowania widoczności oferty.
            </FeatureCard>
            <FeatureCard icon="03" title="Narzędzia biznesowe">
              Poznaj rozwiązania wspierające organizację pracy, komunikację i
              rozwój obecności online.
            </FeatureCard>
          </div>
        </div>
      </section>

      <section className="portal-container portal-section">
        <CallToAction
          description="Rejestracja tworzy konto użytkownika. Dostęp do dodatkowych funkcji platformy zależy od ich dostępności i konfiguracji."
          eyebrow="Następny krok"
          primaryHref="/register?intent=partner"
          primaryLabel="Załóż konto"
          secondaryHref="/login"
          secondaryLabel="Mam już konto"
          title="Poznaj Qualitet od środka."
        />
      </section>
    </>
  );
}
