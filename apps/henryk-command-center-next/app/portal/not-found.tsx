import type { Metadata } from "next";
import { PortalButton } from "./components/portal-shell";

export const metadata: Metadata = {
  title: "Nie znaleziono strony",
  robots: { index: false, follow: false },
};

export default function PortalNotFound() {
  return (
    <section className="portal-container portal-section">
      <p className="portal-eyebrow">Błąd 404</p>
      <h1 className="portal-section-heading">Nie znaleziono tej strony.</h1>
      <p className="portal-section-copy">
        Adres może być nieaktualny. Wróć na stronę główną lub przejdź do
        marketplace.
      </p>
      <div className="mt-7 flex flex-wrap gap-3">
        <PortalButton href="/">Strona główna</PortalButton>
        <PortalButton href="/market" variant="secondary">
          Marketplace
        </PortalButton>
      </div>
    </section>
  );
}
