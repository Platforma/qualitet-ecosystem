"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function PublicLoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.get("email"),
          password: formData.get("password"),
        }),
      });
      const result: unknown = await response.json();
      if (!response.ok) {
        const message =
          typeof result === "object" &&
          result !== null &&
          "error" in result &&
          typeof result.error === "string"
            ? result.error
            : "Nie udało się zalogować.";
        throw new Error(message);
      }

      router.push("/market");
      router.refresh();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError instanceof TypeError
            ? "Nie można połączyć się z usługą logowania. Spróbuj ponownie."
            : requestError.message
          : "Nie udało się zalogować.",
      );
      setLoading(false);
    }
  }

  return (
    <form className="portal-form" onSubmit={submit}>
      <label>
        Adres e-mail
        <input
          autoComplete="email"
          maxLength={254}
          name="email"
          required
          type="email"
        />
      </label>
      <label>
        Hasło
        <input
          autoComplete="current-password"
          maxLength={256}
          name="password"
          required
          type="password"
        />
      </label>
      {error && (
        <p aria-live="assertive" className="portal-form-message" role="alert">
          {error}
        </p>
      )}
      <button
        className="portal-button portal-button-primary w-full disabled:cursor-wait disabled:opacity-60"
        disabled={loading}
        type="submit"
      >
        {loading ? "Logowanie…" : "Zaloguj się"}
      </button>
    </form>
  );
}
