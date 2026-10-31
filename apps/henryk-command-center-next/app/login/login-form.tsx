"use client";

import { useState, type FormEvent } from "react";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
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

      const next = new URLSearchParams(window.location.search).get("next");
      window.location.assign(
        next?.startsWith("/") && !next.startsWith("//") ? next : "/",
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError instanceof TypeError
            ? "Nie można połączyć się z serwerem logowania. Sprawdź połączenie i spróbuj ponownie."
            : requestError.message
          : "Nie udało się zalogować.",
      );
      setLoading(false);
    }
  }

  return (
    <form className="mt-7 min-w-0 space-y-5" onSubmit={submit}>
      <label className="block">
        <span className="mb-2 block text-sm font-semibold text-slate-800">
          E-mail
        </span>
        <input
          aria-invalid={Boolean(error)}
          autoComplete="username"
          className="w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3.5 py-3.5 text-base text-slate-900 outline-none placeholder:text-slate-500 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100"
          maxLength={254}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="np. owner@twoja-domena.pl"
          required
          type="email"
          value={email}
        />
      </label>
      <label className="block">
        <span className="mb-2 block text-sm font-semibold text-slate-800">
          Hasło
        </span>
        <input
          aria-invalid={Boolean(error)}
          autoComplete="current-password"
          className="w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3.5 py-3.5 text-base text-slate-900 outline-none placeholder:text-slate-500 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100"
          maxLength={256}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Wpisz hasło do swojego konta"
          required
          type="password"
          value={password}
        />
      </label>
      {error && (
        <p
          className="whitespace-pre-line break-words rounded-lg border border-rose-300 bg-rose-50 px-4 py-3.5 text-sm font-medium leading-6 text-rose-900"
          role="alert"
          aria-live="assertive"
        >
          {error}
        </p>
      )}
      <button
        className="w-full rounded-lg bg-indigo-700 px-4 py-3.5 text-sm font-bold text-white transition hover:bg-indigo-800 focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-wait disabled:opacity-60"
        disabled={loading}
        type="submit"
      >
        {loading ? "Logowanie…" : "Zaloguj"}
      </button>
    </form>
  );
}
