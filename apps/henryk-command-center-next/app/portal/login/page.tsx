import type { Metadata } from "next";
import PublicLoginForm from "../components/public-login-form";

export const metadata: Metadata = {
  title: "Logowanie",
  description: "Zaloguj się do swojego konta Qualitet Market.",
  alternates: { canonical: "/login" },
  robots: { index: false, follow: false },
};

export const instant = false;

export default async function PublicLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ registered?: string }>;
}) {
  const { registered } = await searchParams;

  return (
    <section className="portal-container portal-section">
      <div className="mx-auto max-w-md">
        <p className="portal-eyebrow">Twoje konto</p>
        <h1 className="portal-section-heading">Witaj ponownie.</h1>
        <p className="portal-section-copy">
          Zaloguj się, aby kontynuować korzystanie z Qualitet.
        </p>
        <div className="portal-card mt-7">
          {registered === "1" && (
            <p className="portal-form-message portal-form-message-success mb-5" role="status">
              Konto zostało utworzone. Zaloguj się, używając swojego adresu e-mail i hasła.
            </p>
          )}
          <PublicLoginForm />
          <p className="mt-6 text-sm text-[#59665e]">
            Nie masz konta?{" "}
            <a className="font-bold text-[#176b4b] underline underline-offset-4" href="/register">
              Zarejestruj się
            </a>
          </p>
        </div>
      </div>
    </section>
  );
}
