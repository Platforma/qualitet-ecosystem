import Head from "next/head";
import Link from "next/link";

const steps = [
  {
    number: "01",
    title: "Utwórz sklep",
    description: "Nadaj mu nazwę, wybierz język, walutę i strefę czasową.",
  },
  {
    number: "02",
    title: "Dodaj katalog",
    description: "Porządkuj produkty i kategorie w jednym panelu.",
  },
  {
    number: "03",
    title: "Zarządzaj na bieżąco",
    description: "Sprawdzaj dane sklepu i rozwijaj jego ofertę.",
  },
];

const features = [
  {
    mark: "01",
    title: "Sklepy pod kontrolą",
    description:
      "Zarządzaj swoimi sklepami z jednego miejsca i szybko przełączaj się między nimi.",
  },
  {
    mark: "02",
    title: "Katalog produktów",
    description:
      "Utrzymuj produkty i kategorie w uporządkowanym, łatwym w obsłudze panelu.",
  },
  {
    mark: "03",
    title: "Twoje ustawienia",
    description:
      "Dostosuj podstawowe ustawienia sklepu do swojego rynku i sposobu pracy.",
  },
];

export default function ShopIndexPage() {
  return (
    <>
      <Head>
        <title>Qualitet Shop Builder — zarządzaj swoim sklepem</title>
        <meta
          content="Twórz sklepy, porządkuj produkty i zarządzaj katalogiem z jednego panelu Qualitet."
          name="description"
        />
        <meta content="width=device-width, initial-scale=1" name="viewport" />
        <meta content="#f6f7f4" name="theme-color" />
      </Head>
      <main className="shop-landing">
        <header className="shop-landing-header">
          <Link aria-label="Qualitet Shop Builder — strona główna" className="shop-brand" href="/">
            <span aria-hidden="true" className="shop-brand-mark">Q</span>
            <span>
              <strong>QUALITET</strong>
              <small>SHOP BUILDER</small>
            </span>
          </Link>
          <nav aria-label="Nawigacja główna" className="shop-landing-nav">
            <a href="#mozliwosci">Możliwości</a>
            <a href="#jak-zaczac">Jak zacząć</a>
          </nav>
          <Link className="button button-secondary shop-landing-login" href="/login">
            Logowanie
          </Link>
        </header>

        <section aria-labelledby="shop-hero-title" className="shop-hero">
          <div className="shop-hero-copy">
            <p className="shop-landing-eyebrow">
              <span aria-hidden="true" /> PRZESTRZEŃ DLA TWOJEGO SKLEPU
            </p>
            <h1 id="shop-hero-title">
              Twój sklep.
              <br />
              <span>Twoje zasady.</span>
            </h1>
            <p className="shop-hero-description">
              Zarządzaj sklepami, produktami i kategoriami w jednym czytelnym
              panelu. Zacznij od uporządkowania swojej oferty.
            </p>
            <div className="shop-hero-actions">
              <Link className="button button-primary shop-landing-primary" href="/login">
                Przejdź do panelu <span aria-hidden="true">→</span>
              </Link>
              <a className="shop-hero-text-link" href="#mozliwosci">
                Poznaj możliwości <span aria-hidden="true">↓</span>
              </a>
            </div>
            <div className="shop-hero-note">
              <span aria-hidden="true" className="shop-note-mark">Q</span>
              <p>
                <strong>Jedno miejsce do zarządzania.</strong>
                <br />
                Przejrzysty panel, najważniejsze informacje pod ręką.
              </p>
            </div>
          </div>

          <div aria-label="Podgląd panelu sklepu" className="shop-hero-preview">
            <div className="shop-preview-window">
              <div aria-hidden="true" className="shop-preview-topbar">
                <span />
                <span />
                <span />
                <p>QUALITET / SHOP BUILDER</p>
              </div>
              <div className="shop-preview-body">
                <div className="shop-preview-sidebar">
                  <span className="shop-preview-logo">Q</span>
                  <i className="is-current" />
                  <i />
                  <i />
                  <i />
                </div>
                <div className="shop-preview-main">
                  <p className="shop-preview-kicker">TWÓJ SKLEP W JEDNYM MIEJSCU</p>
                  <div className="shop-preview-title-row">
                    <div>
                      <span className="shop-preview-label">Przestrzeń sklepu</span>
                      <strong>Dobry początek.</strong>
                    </div>
                    <span className="shop-preview-status">
                      <i /> Gotowy do pracy
                    </span>
                  </div>
                  <div className="shop-preview-stats">
                    <div>
                      <span>Sklepy</span>
                      <strong>01</strong>
                      <small>Twoja przestrzeń</small>
                    </div>
                    <div>
                      <span>Katalog</span>
                      <strong>∞</strong>
                      <small>Produkty i kategorie</small>
                    </div>
                  </div>
                  <div className="shop-preview-list">
                    <div className="shop-preview-list-heading">
                      <span>Od tego możesz zacząć</span>
                      <span>01 — 03</span>
                    </div>
                    {steps.map((step) => (
                      <div className="shop-preview-list-item" key={step.number}>
                        <span>{step.number}</span>
                        <strong>{step.title}</strong>
                        <span aria-hidden="true">↗</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div aria-hidden="true" className="shop-preview-caption">
              <span /> Prosto. Przejrzyście. Po Twojemu.
            </div>
          </div>
        </section>

        <section aria-labelledby="shop-features-title" className="shop-landing-features" id="mozliwosci">
          <div className="shop-landing-section-heading">
            <p className="shop-landing-eyebrow">JEDEN PANEL, WAŻNE RZECZY</p>
            <h2 id="shop-features-title">Dobra organizacja ułatwia rozwój.</h2>
            <p>
              Wszystko, czego potrzebujesz, aby wygodnie pracować nad swoim
              sklepem.
            </p>
          </div>
          <div className="shop-feature-grid">
            {features.map((feature) => (
              <article className="shop-feature-card" key={feature.mark}>
                <span>{feature.mark}</span>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section aria-labelledby="shop-steps-title" className="shop-landing-steps" id="jak-zaczac">
          <div className="shop-landing-section-heading">
            <p className="shop-landing-eyebrow">PIERWSZE KROKI</p>
            <h2 id="shop-steps-title">Zacznij od podstaw.</h2>
          </div>
          <div className="shop-steps-grid">
            {steps.map((step) => (
              <article className="shop-step" key={step.number}>
                <span>{step.number}</span>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </article>
            ))}
          </div>
          <Link className="button button-primary shop-landing-primary" href="/login">
            Zaloguj się do Shop Builder <span aria-hidden="true">→</span>
          </Link>
        </section>

        <footer className="shop-landing-footer">
          <Link aria-label="Qualitet Shop Builder — strona główna" className="shop-brand" href="/">
            <span aria-hidden="true" className="shop-brand-mark">Q</span>
            <span>
              <strong>QUALITET</strong>
              <small>SHOP BUILDER</small>
            </span>
          </Link>
          <p>Przestrzeń do rozwijania Twojego sklepu.</p>
          <Link href="/login">Logowanie</Link>
        </footer>
      </main>
    </>
  );
}
