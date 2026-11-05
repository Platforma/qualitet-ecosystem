import { useState, type FormEvent } from "react";
import type { ShopCategoryListItem } from "../server/shop-catalog";

type CategoryResponse = { error?: string };

export default function CategoryForm({
  storeId,
  category,
}: {
  storeId: string;
  category?: ShopCategoryListItem;
}) {
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      const form = new FormData(event.currentTarget);
      const response = await fetch(
        `/api/stores/${encodeURIComponent(storeId)}/categories`,
        {
          method: category ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...(category ? { categoryId: category.id } : {}),
            name: form.get("name"),
            slug: form.get("slug"),
            description: form.get("description"),
          }),
        },
      );
      const result = (await response.json()) as CategoryResponse;
      if (!response.ok) {
        throw new Error(result.error ?? "Nie udało się dodać kategorii.");
      }
      window.location.reload();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Nie udało się dodać kategorii.",
      );
      setSaving(false);
    }
  }

  async function remove() {
    if (!category || !window.confirm(`Usunąć kategorię „${category.name}”?`)) {
      return;
    }
    setSaving(true);
    setError("");
    try {
      const response = await fetch(
        `/api/stores/${encodeURIComponent(storeId)}/categories?categoryId=${encodeURIComponent(category.id)}`,
        { method: "DELETE" },
      );
      const result = (await response.json()) as CategoryResponse;
      if (!response.ok) {
        throw new Error(result.error ?? "Nie udało się usunąć kategorii.");
      }
      window.location.reload();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Nie udało się usunąć kategorii.",
      );
      setSaving(false);
    }
  }

  return (
    <form className="shop-form shop-category-form" onSubmit={submit}>
      <h2>{category ? "Edytuj kategorię" : "Dodaj kategorię"}</h2>
      <label className="field">
        <span>Nazwa</span>
        <input defaultValue={category?.name} maxLength={120} name="name" required />
      </label>
      <label className="field">
        <span>Slug</span>
        <input
          autoCapitalize="none"
          defaultValue={category?.slug}
          maxLength={100}
          name="slug"
          pattern="[a-zA-Z0-9]+([\-][a-zA-Z0-9]+)*"
          required
        />
      </label>
      <label className="field">
        <span>Opis (opcjonalnie)</span>
        <textarea defaultValue={category?.description ?? ""} maxLength={2000} name="description" rows={3} />
      </label>
      {error && <p className="notice notice-error" role="alert">{error}</p>}
      <button className="button button-primary" disabled={saving} type="submit">
        {saving ? "Zapisywanie…" : category ? "Zapisz kategorię" : "Dodaj kategorię"}
      </button>
      {category && (
        <button className="button button-danger" disabled={saving} onClick={remove} type="button">
          Usuń kategorię
        </button>
      )}
    </form>
  );
}
