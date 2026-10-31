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
          ? requestError.message
          : "Nie udało się zalogować.",
      );
      setLoading(false);
    }
  }

  return (
    <form className="mt-7 space-y-4" onSubmit={submit}>
      <label className="block">
        <span className="mb-1.5 block text-xs font-semibold text-slate-700">
          E-mail
        </span>
        <input
          autoComplete="username"
          className="w-full rounded-lg border border-slate-200 px-3.5 py-3 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          maxLength={254}
          onChange={(event) => setEmail(event.target.value)}
          required
          type="email"
          value={email}
        />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-xs font-semibold text-slate-700">
          Hasło
        </span>
        <input
          autoComplete="current-password"
          className="w-full rounded-lg border border-slate-200 px-3.5 py-3 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          maxLength={256}
          onChange={(event) => setPassword(event.target.value)}
          required
          type="password"
          value={password}
        />
      </label>
      {error && (
        <p
          className="rounded-lg border border-rose-100 bg-rose-50 px-3 py-2.5 text-xs text-rose-700"
          role="alert"
        >
          {error}
        </p>
      )}
      <button
        className="w-full rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-wait disabled:opacity-60"
        disabled={loading}
        type="submit"
      >
        {loading ? "Logowanie…" : "Zaloguj"}
      </button>
    </form>
  );
}
