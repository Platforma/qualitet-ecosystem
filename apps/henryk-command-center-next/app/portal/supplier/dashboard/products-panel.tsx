"use client";

import { useEffect, useState, type FormEvent } from "react";

type DashboardData = {
  company: {
    id: string;
    name: string;
    commissionDefault: number;
    adBudget: number;
    productsCount: number;
    salesCount: number;
  };
  products: { id: string; name: string; sku: string; wholesalePrice: number; price: number; currency: string; status: string }[];
};

export default function ProductsPanel() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    const response = await fetch("/api/suppliers/products", { cache: "no-store" });
    const result = (await response.json()) as DashboardData & { error?: string };
    if (!response.ok) throw new Error(result.error ?? "Nie udało się pobrać danych.");
    setData(result);
  }

  useEffect(() => {
    let active = true;
    fetch("/api/suppliers/products", { cache: "no-store" })
      .then(async (response) => {
        const result = (await response.json()) as DashboardData & { error?: string };
        if (!response.ok) throw new Error(result.error ?? "Nie udało się pobrać danych.");
        if (active) setData(result);
      })
      .catch((error: unknown) => {
        if (active) setMessage(error instanceof Error ? error.message : "Błąd odczytu.");
      });
    return () => { active = false; };
  }, []);

  async function submitProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/suppliers/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.get("name"),
          sku: form.get("sku"),
          description: form.get("description"),
          wholesalePrice: Number(form.get("wholesalePrice")),
          retailPrice: Number(form.get("retailPrice")),
          partnerCommission: Number(form.get("partnerCommission")),
          currency: form.get("currency"),
        }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Nie udało się dodać produktu.");
      formElement.reset();
      await load();
      setMessage("Produkt został opublikowany w Marketplace, Partner Program i AI Qualitet.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Nie udało się dodać produktu.");
    } finally {
      setSaving(false);
    }
  }

  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/suppliers/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adBudget: Number(form.get("adBudget")),
          commissionDefault: Number(form.get("commissionDefault")),
        }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Nie udało się zapisać ustawień.");
      await load();
      setMessage("Ustawienia firmy zapisane.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Nie udało się zapisać ustawień.");
    } finally {
      setSaving(false);
    }
  }

  async function importCsv(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/suppliers/products/import", {
        method: "POST",
        body: new FormData(formElement),
      });
      const result = (await response.json()) as { error?: string; imported?: number; rejected?: number };
      if (!response.ok) throw new Error(result.error ?? "Import produktów się nie powiódł.");
      setMessage(`Zaimportowano ${result.imported} produktów; pominięto ${result.rejected}.`);
      formElement.reset();
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Import produktów się nie powiódł.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-7 grid gap-8">
      {message && <p className="rounded-xl bg-slate-100 p-4 text-sm" role="status">{message}</p>}
      {data && (
        <>
          <form className="grid gap-4 rounded-2xl bg-slate-50 p-5 md:grid-cols-3" onSubmit={saveSettings}>
            <label className="grid gap-2 text-sm">Budżet reklamowy (PLN)
              <input className="rounded-lg border border-slate-300 px-3 py-2" name="adBudget" min="0" step="0.01" type="number" defaultValue={data.company.adBudget} required />
            </label>
            <label className="grid gap-2 text-sm">Prowizja partnera (%)
              <input className="rounded-lg border border-slate-300 px-3 py-2" name="commissionDefault" min="0" max="100" step="0.01" type="number" defaultValue={data.company.commissionDefault} required />
            </label>
            <button className="self-end rounded-xl bg-slate-900 px-4 py-2 text-white disabled:opacity-50" disabled={saving}>Zapisz ustawienia</button>
          </form>

          <div>
            <h3 className="font-semibold">Dodaj produkt</h3>
            <form className="mt-4 grid gap-4 md:grid-cols-2" onSubmit={submitProduct}>
              <input aria-label="Nazwa produktu" className="rounded-lg border border-slate-300 px-3 py-2" name="name" placeholder="Nazwa produktu" required maxLength={200} />
              <input aria-label="SKU" className="rounded-lg border border-slate-300 px-3 py-2" name="sku" placeholder="SKU" required maxLength={100} />
              <textarea aria-label="Opis" className="rounded-lg border border-slate-300 px-3 py-2 md:col-span-2" name="description" placeholder="Opis produktu" rows={3} maxLength={10000} />
              <label className="grid gap-2 text-sm">Cena hurtowa
                <input className="rounded-lg border border-slate-300 px-3 py-2" name="wholesalePrice" min="0" step="0.01" type="number" required />
              </label>
              <label className="grid gap-2 text-sm">Cena detaliczna
                <input className="rounded-lg border border-slate-300 px-3 py-2" name="retailPrice" min="0" step="0.01" type="number" required />
              </label>
              <label className="grid gap-2 text-sm">Prowizja partnera (%)
                <input className="rounded-lg border border-slate-300 px-3 py-2" name="partnerCommission" min="0" max="100" step="0.01" type="number" defaultValue={data.company.commissionDefault} required />
              </label>
              <label className="grid gap-2 text-sm">Waluta
                <select className="rounded-lg border border-slate-300 px-3 py-2" name="currency" defaultValue="PLN">
                  <option value="PLN">PLN</option><option value="EUR">EUR</option><option value="USD">USD</option>
                </select>
              </label>
              <button className="rounded-xl bg-emerald-700 px-4 py-3 font-medium text-white disabled:opacity-50 md:col-span-2" disabled={saving}>
                Opublikuj produkt
              </button>
            </form>
          </div>

          <div>
            <h3 className="font-semibold">Produkty firmy</h3>
            {data.products.length === 0 ? <p className="mt-3 text-sm text-slate-600">Nie dodano jeszcze produktów.</p> : (
              <ul className="mt-3 divide-y divide-slate-200">
                {data.products.map((product) => (
                  <li className="flex flex-wrap justify-between gap-2 py-3 text-sm" key={product.id}>
                    <span><strong>{product.name}</strong> · SKU {product.sku} · {product.status}</span>
                    <span>{product.wholesalePrice} → {product.price} {product.currency}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <form className="grid gap-3 rounded-xl border border-slate-200 p-4 sm:grid-cols-[1fr_auto]" onSubmit={importCsv}>
            <label className="grid gap-2 text-sm">Import produktów CSV (maks. 2 MB / 1000 wierszy)
              <input accept=".csv,text/csv" className="block w-full text-sm" name="file" required type="file" />
              <span className="text-xs text-slate-500">Kolumny: name, sku, wholesale_price, retail_price, description, currency, partner_commission.</span>
            </label>
            <button className="self-end rounded-xl border border-slate-300 px-4 py-2 disabled:opacity-50" disabled={saving}>Importuj CSV</button>
          </form>
        </>
      )}
    </div>
  );
}
