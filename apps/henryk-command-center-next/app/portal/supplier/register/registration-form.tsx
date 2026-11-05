"use client";

import { useState, type FormEvent } from "react";

const companyTypeLabels = [
  ["manufacturer", "Producent"],
  ["wholesaler", "Hurtownia"],
  ["importer", "Importer"],
  ["distributor", "Dystrybutor"],
  ["brand", "Marka"],
  ["seller", "Sklep / sprzedawca"],
  ["service_provider", "Usługodawca"],
];

export default function SupplierRegistrationForm() {
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setSubmitting(true);
    setMessage("");
    const form = new FormData(formElement);
    const categories = String(form.get("categories") ?? "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    try {
      const response = await fetch("/api/suppliers/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.get("name"),
          email: form.get("email"),
          phone: form.get("phone"),
          website: form.get("website"),
          country: form.get("country"),
          type: form.get("type"),
          categories,
          logoUrl: form.get("logoUrl"),
          marketingConsent: form.get("marketingConsent") === "on",
        }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Nie udało się wysłać zgłoszenia.");
      formElement.reset();
      setMessage("Zgłoszenie zapisane. Firma oczekuje na weryfikację.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Nie udało się wysłać zgłoszenia.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="portal-card mt-8 grid gap-5 md:grid-cols-2" onSubmit={submit}>
      <label className="grid gap-2 text-sm font-medium">
        Nazwa firmy
        <input className="rounded-xl border border-[#d6ded8] px-4 py-3" name="name" required maxLength={160} />
      </label>
      <label className="grid gap-2 text-sm font-medium">
        E-mail firmowy
        <input className="rounded-xl border border-[#d6ded8] px-4 py-3" name="email" type="email" required maxLength={254} />
      </label>
      <label className="grid gap-2 text-sm font-medium">
        Telefon
        <input className="rounded-xl border border-[#d6ded8] px-4 py-3" name="phone" type="tel" required maxLength={40} />
      </label>
      <label className="grid gap-2 text-sm font-medium">
        Państwo (kod ISO, np. PL)
        <input className="rounded-xl border border-[#d6ded8] px-4 py-3 uppercase" name="country" required minLength={2} maxLength={2} pattern="[A-Za-z]{2}" />
      </label>
      <label className="grid gap-2 text-sm font-medium">
        Typ działalności
        <select className="rounded-xl border border-[#d6ded8] px-4 py-3" name="type" required defaultValue="">
          <option disabled value="">Wybierz typ</option>
          {companyTypeLabels.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </label>
      <label className="grid gap-2 text-sm font-medium">
        Strona WWW (HTTPS)
        <input className="rounded-xl border border-[#d6ded8] px-4 py-3" name="website" type="url" placeholder="https://example.com" />
      </label>
      <label className="grid gap-2 text-sm font-medium md:col-span-2">
        Kategorie (oddziel przecinkami)
        <input className="rounded-xl border border-[#d6ded8] px-4 py-3" name="categories" placeholder="np. dom, ogród, elektronika" />
      </label>
      <label className="grid gap-2 text-sm font-medium md:col-span-2">
        Logo — bezpośredni adres HTTPS do obrazu
        <input className="rounded-xl border border-[#d6ded8] px-4 py-3" name="logoUrl" type="url" placeholder="https://example.com/logo.png" />
      </label>
      <label className="flex items-start gap-3 text-sm text-[#59665e] md:col-span-2">
        <input className="mt-1" name="marketingConsent" type="checkbox" />
        Zgadzam się na kontakt e-mail dotyczący współpracy. Zgoda jest dobrowolna i może być wycofana.
      </label>
      <div className="md:col-span-2">
        <button className="portal-button portal-button-primary" disabled={submitting} type="submit">
          {submitting ? "Wysyłanie..." : "Wyślij zgłoszenie"}
        </button>
        {message && <p className="mt-4 text-sm" role="status">{message}</p>}
      </div>
    </form>
  );
}
