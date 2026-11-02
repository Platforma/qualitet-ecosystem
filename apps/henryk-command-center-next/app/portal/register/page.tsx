import type { Metadata } from "next";
import PublicRegistrationForm from "../components/public-registration-form";

export const metadata: Metadata = {
  title: "Rejestracja",
  description: "Utwórz konto użytkownika Qualitet Market.",
  alternates: { canonical: "/register" },
  robots: { index: false, follow: false },
};

export default function PublicRegistrationPage() {
  return (
    <section className="portal-container portal-section">
      <div className="mx-auto max-w-xl">
        <p className="portal-eyebrow">Dołącz do Qualitet</p>
        <h1 className="portal-section-heading">Utwórz swoje konto.</h1>
        <p className="portal-section-copy">
          Załóż konto użytkownika, aby rozpocząć korzystanie z ekosystemu
          Qualitet Market.
        </p>
        <div className="portal-card mt-7">
          <PublicRegistrationForm />
          <p className="mt-6 text-sm text-[#59665e]">
            Masz już konto?{" "}
            <a className="font-bold text-[#176b4b] underline underline-offset-4" href="/login">
              Zaloguj się
            </a>
          </p>
        </div>
      </div>
    </section>
  );
}
