import type { Metadata } from "next";
import {
  CallToAction,
  FeatureCard,
  PageIntro,
} from "../components/portal-shell";

export const metadata: Metadata = {
  title: "Informacje dla dostawców",
  description:
    "Informacje dla dostawców zainteresowanych obecnością i współpracą w Qualitet Market.",
  alternates: { canonical: "/supplier" },
};

export default function SupplierPage() {
  return (
    <>
      <section className="portal-container portal-section">
        <PageIntro
          description="Qualitet Market rozwija przestrzeń dla firm i ich oferty. Dostawcy mogą rozpocząć od utworzenia konta, poznania platformy i przygotowania informacji o swojej działalności."
          eyebrow="Dla dostawców"
          title="Przygotuj swoją ofertę na współpracę."
        />
        <div className="mt-8 flex flex-wrap gap-3">
          <a className="portal-button portal-button-primary" href="/supplier/register">
            Dodaj Firmę Za Darmo
          </a>
          <a className="portal-button portal-button-secondary" href="/market">
            Przeglądaj marketplace
          </a>
        </div>
      </section>

      <section className="portal-section portal-section-tinted">
        <div className="portal-container">
          <p className="portal-eyebrow">Jak zacząć</p>
          <h2 className="portal-section-heading">Przejrzysty początek współpracy.</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <FeatureCard icon="01" title="Utwórz konto">
              Prześlij zgłoszenie firmy. Po weryfikacji otrzymasz dostęp do
              panelu dostawcy.
            </FeatureCard>
            <FeatureCard icon="02" title="Przygotuj dane firmy">
              Zbierz aktualne dane kontaktowe, opis działalności i informacje o
              produktach lub usługach.
            </FeatureCard>
            <FeatureCard icon="03" title="Poznaj zasady publikacji">
              Przed dodaniem oferty zapoznaj się z wymaganiami dotyczącymi
              informacji i zgodności produktów.
            </FeatureCard>
          </div>
          <p className="portal-notice mt-6">
            Utworzenie konta nie oznacza automatycznej publikacji oferty.
            Produkty są widoczne w marketplace po ich dodaniu i opublikowaniu.
          </p>
        </div>
      </section>

      <section className="portal-container portal-section">
        <CallToAction
          description="Zgłoś firmę bez opłat. Weryfikacja poprzedza aktywację panelu i publikację oferty."
          eyebrow="Dostawcy"
          primaryHref="/supplier/register"
          primaryLabel="Dodaj Firmę Za Darmo"
          secondaryHref="/partner"
          secondaryLabel="Informacje dla partnerów"
          title="Zacznij od konta i swojej oferty."
        />
      </section>
    </>
  );
}
