import { useState, type FormEvent } from "react";
import type { GetServerSideProps } from "next";

type LoginPageProps = { next: string };
type LoginResponse = { error?: string };

function safeNext(value: string | string[] | undefined) {
  const candidate = Array.isArray(value) ? value[0] : value;
  return candidate?.startsWith("/") && !candidate.startsWith("//")
    ? candidate
    : "/dashboard";
}

export const getServerSideProps: GetServerSideProps<LoginPageProps> = async (
  context,
) => ({
  props: { next: safeNext(context.query.next) },
});

export default function ShopLoginPage({ next }: LoginPageProps) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");

    try {
      const form = new FormData(event.currentTarget);
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.get("email"),
          password: form.get("password"),
        }),
      });
      const result = (await response.json()) as LoginResponse;
      if (!response.ok) {
        throw new Error(result.error ?? "Nie udało się zalogować.");
      }

      window.location.assign(next);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Nie udało się zalogować.",
      );
      setBusy(false);
    }
  }

  return (
    <main className="shop-login-page">
      <section className="shop-login-card">
        <div className="shop-brand">
          <span aria-hidden="true" className="shop-brand-mark">Q</span>
          <span>
            <strong>QUALITET</strong>
            <small>SHOP BUILDER</small>
          </span>
        </div>
        <h1>Logowanie Shop</h1>
        <p>Dostęp do panelu zarządzania sklepami.</p>
        <form className="shop-form" onSubmit={submit}>
          <label className="field">
            <span>E-mail</span>
            <input
              autoComplete="username"
              maxLength={254}
              name="email"
              required
              type="email"
            />
          </label>
          <label className="field">
            <span>Hasło</span>
            <input
              autoComplete="current-password"
              maxLength={256}
              name="password"
              required
              type="password"
            />
          </label>
          {error && <p className="notice notice-error" role="alert">{error}</p>}
          <button className="button button-primary" disabled={busy} type="submit">
            {busy ? "Logowanie…" : "Zaloguj do Shop"}
          </button>
        </form>
      </section>
    </main>
  );
}
