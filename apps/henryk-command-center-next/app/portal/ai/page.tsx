import type { Metadata } from "next";
import {
  CallToAction,
  FeatureCard,
  PageIntro,
} from "../components/portal-shell";

export const metadata: Metadata = {
  title: "Narzędzia AI dla firm",
  description:
    "Poznaj podejście Qualitet do narzędzi AI wspierających obsługę, marketing i codzienną pracę firmy.",
  alternates: { canonical: "/ai" },
};

export default function AiPage() {
  return (
    <>
      <section className="portal-container portal-section">
        <PageIntro
          description="Narzędzia AI mogą ułatwiać organizację zadań i pracę z informacją. W ekosystemie Qualitet rozwijamy je z myślą o praktycznym wsparciu firm."
          eyebrow="Qualitet AI"
          title="Technologia ma wspierać ludzi i ich pracę."
        />
        <div className="mt-8 flex flex-wrap gap-3">
          <a className="portal-button portal-button-primary" href="/register">
            Utwórz konto
          </a>
          <a className="portal-button portal-button-secondary" href="/live">
            Sprawdź status portalu
          </a>
        </div>
      </section>

      <section className="portal-section portal-section-tinted">
        <div className="portal-container">
          <p className="portal-eyebrow">Praktyczne zastosowania</p>
          <h2 className="portal-section-heading">Wsparcie w codziennych procesach.</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <FeatureCard icon="01" title="Obsługa informacji">
              Porządkuj wiedzę, przygotowuj treści i szybciej docieraj do
              potrzebnych informacji.
            </FeatureCard>
            <FeatureCard icon="02" title="Praca nad ofertą">
              Wspieraj przygotowanie opisów i materiałów, zachowując kontrolę
              nad końcową treścią.
            </FeatureCard>
            <FeatureCard icon="03" title="Rozwój biznesu">
              Łącz narzędzia cyfrowe z procesami firmy i wybieraj rozwiązania
              odpowiadające jej potrzebom.
            </FeatureCard>
          </div>
          <p className="portal-notice mt-6">
            Dostęp do funkcji AI zależy od konfiguracji usług i uprawnień konta.
            Treści wygenerowane przez AI wymagają weryfikacji przed użyciem.
          </p>
        </div>
      </section>

      <section className="portal-container portal-section">
        <CallToAction
          description="Załóż konto, poznaj ekosystem Qualitet i sprawdź dostępne funkcje dla użytkowników."
          eyebrow="Zacznij korzystać"
          secondaryHref="/market"
          secondaryLabel="Przejdź do marketplace"
          title="Rozwijaj firmę z pomocą odpowiednich narzędzi."
        />
      </section>
    </>
  );
}
