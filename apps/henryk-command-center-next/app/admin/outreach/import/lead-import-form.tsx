"use client";

import { useState, type FormEvent } from "react";

export default function LeadImportForm() {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/outreach/import", { method: "POST", body: form });
      const result = (await response.json()) as { error?: string; imported?: number; rejected?: number; rowErrors?: string[] };
      if (!response.ok) throw new Error(result.error ?? "Import nie powiódł się.");
      setMessage(`Zaimportowano ${result.imported} rekordów; pominięto ${result.rejected}. ${result.rowErrors?.slice(0, 3).join(" ") ?? ""}`);
      formElement.reset();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Import nie powiódł się.");
    } finally {
      setBusy(false);
    }
  }

  async function importSource(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/outreach/import", { method: "POST", body: form });
      const result = (await response.json()) as { error?: string; imported?: number; rejected?: number };
      if (!response.ok) throw new Error(result.error ?? "Import nie powiódł się.");
      setMessage(`Zapisano lead: ${result.imported}; duplikaty/pominięte: ${result.rejected}.`);
      formElement.reset();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Import nie powiódł się.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-8 grid gap-6 lg:grid-cols-2">
      <form className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-6" onSubmit={upload}>
        <h2 className="text-lg font-semibold">Plik CSV lub XLSX</h2>
        <p className="text-sm text-slate-600">Kolumny rozpoznawane: company/name, email, phone, website, categories, notes.</p>
        <input accept=".csv,.xlsx" className="block w-full text-sm" name="file" required type="file" />
        <button className="rounded-xl bg-slate-900 px-4 py-3 text-white disabled:opacity-50" disabled={busy}>Importuj plik</button>
      </form>
      <form className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-6" onSubmit={importSource}>
        <h2 className="text-lg font-semibold">Pojedynczy lead WWW / e-mail</h2>
        <input className="rounded-lg border border-slate-300 px-3 py-2" name="companyName" placeholder="Nazwa firmy" required maxLength={160} />
        <input className="rounded-lg border border-slate-300 px-3 py-2" name="website" placeholder="https://example.com" type="url" />
        <input className="rounded-lg border border-slate-300 px-3 py-2" name="email" placeholder="kontakt@example.com" type="email" />
        <input className="rounded-lg border border-slate-300 px-3 py-2" name="phone" placeholder="Telefon" />
        <button className="rounded-xl border border-slate-300 px-4 py-3 disabled:opacity-50" disabled={busy}>Zapisz lead bez pobierania WWW</button>
      </form>
      {message && <p className="rounded-xl bg-slate-100 p-4 text-sm lg:col-span-2" role="status">{message}</p>}
    </div>
  );
}
