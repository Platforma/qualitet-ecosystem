"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function PublicRegistrationForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(event.currentTarget);
    const password = String(formData.get("password") ?? "");
    const passwordConfirmation = String(
      formData.get("passwordConfirmation") ?? "",
    );
    if (password !== passwordConfirmation) {
      setError("Podane hasła nie są takie same.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.get("name"),
          email: formData.get("email"),
          password,
          passwordConfirmation,
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
            : "Nie udało się utworzyć konta.";
        throw new Error(message);
      }

      router.push("/login?registered=1");
      router.refresh();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError instanceof TypeError
            ? "Nie można połączyć się z usługą rejestracji. Spróbuj ponownie."
            : requestError.message
          : "Nie udało się utworzyć konta.",
      );
      setLoading(false);
    }
  }

  return (
    <form className="portal-form" onSubmit={submit}>
      <label>
        Imię i nazwisko
        <input
          autoComplete="name"
          maxLength={120}
          minLength={1}
          name="name"
          required
          type="text"
        />
      </label>
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
        Hasło <span className="font-normal text-[#59665e]">— minimum 12 znaków</span>
        <input
          autoComplete="new-password"
          maxLength={256}
          minLength={12}
          name="password"
          required
          type="password"
        />
      </label>
      <label>
        Powtórz hasło
        <input
          autoComplete="new-password"
          maxLength={256}
          minLength={12}
          name="passwordConfirmation"
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
        {loading ? "Tworzenie konta…" : "Utwórz konto"}
      </button>
      <p className="text-xs leading-5 text-[#59665e]">
        Dane są wykorzystywane do utworzenia konta i uwierzytelniania.
      </p>
    </form>
  );
}
