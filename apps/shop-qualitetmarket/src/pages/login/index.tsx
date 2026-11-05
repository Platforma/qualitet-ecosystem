import { useEffect, useState, type FormEvent } from "react";
import type { GetServerSideProps } from "next";

type LoginPageProps = { next: string; verifyToken: string };
type LoginResponse = {
  error?: string;
  verified?: boolean;
  verificationSent?: boolean;
};

function safeNext(value: string | string[] | undefined) {
  const candidate = Array.isArray(value) ? value[0] : value;
  return candidate?.startsWith("/") && !candidate.startsWith("//")
    ? candidate
    : "/dashboard";
}

export const getServerSideProps: GetServerSideProps<LoginPageProps> = async (
  context,
) => {
  const token = context.query.verify;
  return {
    props: {
      next: safeNext(context.query.next),
      verifyToken: typeof token === "string" ? token : "",
    },
  };
};

export default function ShopLoginPage({ next, verifyToken }: LoginPageProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (!verifyToken) {
      return;
    }
    let active = true;
    setBusy(true);
    fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "verify", token: verifyToken }),
    })
      .then(async (response) => {
        const result = (await response.json()) as LoginResponse;
        if (!response.ok) {
          throw new Error(result.error ?? "Nie udało się potwierdzić e-maila.");
        }
        if (active) {
          setNotice("Adres e-mail potwierdzony. Możesz się teraz zalogować.");
        }
      })
      .catch((requestError: unknown) => {
        if (active) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "Nie udało się potwierdzić e-maila.",
          );
        }
      })
      .finally(() => {
        if (active) {
          setBusy(false);
        }
      });
    return () => {
      active = false;
    };
  }, [verifyToken]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");

    try {
      const form = new FormData(event.currentTarget);
      const currentEmail = String(form.get("email") ?? "").trim();
      setEmail(currentEmail);
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: mode,
          email: currentEmail,
          ...(mode === "register"
            ? {
                companyName: form.get("companyName"),
                password: form.get("password"),
              }
            : { password: form.get("password") }),
        }),
      });
      const result = (await response.json()) as LoginResponse;
      if (!response.ok) {
        throw new Error(result.error ?? "Nie udało się zalogować.");
      }

      if (mode === "register") {
        setNotice("Wysłaliśmy link weryfikacyjny. Potwierdź adres e-mail, aby zalogować się.");
      } else {
        window.location.assign(next);
      }
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Nie udało się zalogować.",
      );
      setBusy(false);
    }
  }

  async function resendVerification() {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "resend", email }),
      });
      const result = (await response.json()) as LoginResponse;
      if (!response.ok) {
        throw new Error(result.error ?? "Nie udało się wysłać wiadomości.");
      }
      setNotice("Wysłaliśmy nowy link weryfikacyjny.");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Nie udało się wysłać wiadomości.",
      );
    } finally {
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
        <h1>{mode === "login" ? "Logowanie Shop" : "Konto firmowe"}</h1>
        <p>
          {mode === "login"
            ? "Zaloguj się do panelu zarządzania sklepem."
            : "Załóż konto firmy. Weryfikacja adresu e-mail jest wymagana."}
        </p>
        <form className="shop-form" onSubmit={submit}>
          {mode === "register" && (
            <label className="field">
              <span>Nazwa firmy</span>
              <input
                autoComplete="organization"
                maxLength={200}
                name="companyName"
                required
              />
            </label>
          )}
          <label className="field">
            <span>E-mail</span>
            <input
              autoComplete="username"
              maxLength={254}
              name="email"
              onChange={(event) => setEmail(event.currentTarget.value)}
              required
              type="email"
            />
          </label>
          <label className="field">
            <span>Hasło</span>
            <input
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              maxLength={256}
              minLength={mode === "register" ? 12 : 1}
              name="password"
              required
              type="password"
            />
          </label>
          {notice && <p className="notice" role="status">{notice}</p>}
          {error && <p className="notice notice-error" role="alert">{error}</p>}
          <button className="button button-primary" disabled={busy} type="submit">
            {busy
              ? "Chwila…"
              : mode === "login"
                ? "Zaloguj do Shop"
                : "Utwórz konto firmy"}
          </button>
        </form>
        {mode === "register" && email && (
          <button
            className="button button-secondary"
            disabled={busy}
            onClick={resendVerification}
            type="button"
          >
            Wyślij ponownie link weryfikacyjny
          </button>
        )}
        <button
          className="button button-secondary"
          disabled={busy}
          onClick={() => {
            setMode(mode === "login" ? "register" : "login");
            setError("");
            setNotice("");
          }}
          type="button"
        >
          {mode === "login" ? "Załóż konto firmy" : "Mam już konto"}
        </button>
      </section>
    </main>
  );
}
