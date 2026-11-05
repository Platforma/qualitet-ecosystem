import { useState, type FormEvent } from "react";
import type { ShopProductListItem } from "../server/shop-catalog";

type ProductFormProps = {
  storeId: string;
  currency: string;
  product?: ShopProductListItem;
};

export default function ProductForm({
  storeId,
  currency,
  product,
}: ProductFormProps) {
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch(
        product
          ? `/api/stores/${encodeURIComponent(storeId)}/products/${encodeURIComponent(product.id)}`
          : `/api/stores/${encodeURIComponent(storeId)}/products`,
        {
          method: product ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.get("name"),
            sku: form.get("sku"),
            description: form.get("description"),
            price: Number(form.get("price")),
            currency: form.get("currency"),
            status: form.get("status"),
          }),
        },
      );
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(result.error ?? "Nie udało się zapisać produktu.");
      }
      window.location.reload();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Nie udało się zapisać produktu.",
      );
      setSaving(false);
    }
  }

  async function remove() {
    if (!product || !window.confirm(`Usunąć produkt „${product.name}”?`)) {
      return;
    }
    setSaving(true);
    setError("");
    try {
      const response = await fetch(
        `/api/stores/${encodeURIComponent(storeId)}/products/${encodeURIComponent(product.id)}`,
        { method: "DELETE" },
      );
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(result.error ?? "Nie udało się usunąć produktu.");
      }
      window.location.reload();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Nie udało się usunąć produktu.",
      );
      setSaving(false);
    }
  }

  return (
    <form className="shop-form" onSubmit={submit}>
      <label className="field">
        <span>Nazwa produktu</span>
        <input defaultValue={product?.name} maxLength={200} name="name" required />
      </label>
      <div className="field-grid">
        <label className="field">
          <span>SKU</span>
          <input defaultValue={product?.sku ?? ""} maxLength={100} name="sku" />
        </label>
        <label className="field">
          <span>Cena</span>
          <input
            defaultValue={product?.price ?? ""}
            min="0"
            name="price"
            required
            step="0.01"
            type="number"
          />
        </label>
      </div>
      <div className="field-grid">
        <label className="field">
          <span>Waluta</span>
          <select defaultValue={product?.currency ?? currency} name="currency">
            {[currency, "PLN", "EUR", "USD", "GBP", "CZK", "CHF"]
              .filter((value, index, values) => values.indexOf(value) === index)
              .map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </label>
        <label className="field">
          <span>Status</span>
          <select defaultValue={product?.status === "unknown" ? "draft" : product?.status ?? "draft"} name="status">
            <option value="draft">Szkic</option>
            <option value="active">Aktywny</option>
            <option value="archived">Zarchiwizowany</option>
          </select>
        </label>
      </div>
      <label className="field">
        <span>Opis</span>
        <textarea defaultValue={product?.description} maxLength={5000} name="description" rows={3} />
      </label>
      {error && <p className="notice notice-error" role="alert">{error}</p>}
      <div className="shop-actions">
        <button className="button button-primary" disabled={saving} type="submit">
          {saving ? "Zapisywanie…" : product ? "Zapisz produkt" : "Dodaj produkt"}
        </button>
        {product && (
          <button className="button button-danger" disabled={saving} onClick={remove} type="button">
            Usuń
          </button>
        )}
      </div>
    </form>
  );
}
