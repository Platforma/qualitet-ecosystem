import { useState, type FormEvent } from "react";
import type { StorePageData } from "../server/shop-page-data";

type SaveResponse = { error?: string };

export default function StoreDesignForm({
  store,
}: {
  store: StorePageData;
}) {
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");

    try {
      const form = new FormData(event.currentTarget);
      const response = await fetch(`/api/stores/${encodeURIComponent(store.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section: "design",
          design: {
            theme: form.get("theme"),
            primaryColor: form.get("primaryColor"),
            accentColor: form.get("accentColor"),
            backgroundColor: form.get("backgroundColor"),
            logoUrl: form.get("logoUrl"),
            banners: String(form.get("banners") ?? "")
              .split(/\r?\n/)
              .map((url) => url.trim())
              .filter(Boolean),
          },
        }),
      });
      const result = (await response.json()) as SaveResponse;
      if (!response.ok) {
        throw new Error(result.error ?? "Nie udało się zapisać projektu.");
      }
      setNotice("Kolory sklepu zostały zapisane.");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Nie udało się zapisać projektu.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="shop-form" onSubmit={submit}>
      <p className="shop-description">
        Zapisane kolory są przypisane do tego sklepu. Nie zmieniają wyglądu
        marketplace ani innych sklepów.
      </p>
      <label className="field">
        <span>Motyw</span>
        <select defaultValue={store.design?.theme ?? "classic"} name="theme">
          <option value="classic">Klasyczny</option>
          <option value="minimal">Minimalistyczny</option>
          <option value="editorial">Redakcyjny</option>
        </select>
      </label>
      <label className="field">
        <span>Logo</span>
        <input defaultValue={store.design?.logoUrl ?? store.settings.logoUrl ?? ""} maxLength={2000} name="logoUrl" type="url" />
      </label>
      <label className="field">
        <span>Banery (jeden URL w wierszu, maksymalnie 10)</span>
        <textarea defaultValue={(store.design?.banners ?? []).join("\n")} maxLength={20_000} name="banners" rows={5} />
      </label>
      <label className="color-field">
        <span>Kolor główny</span>
        <input
          defaultValue={store.design?.primaryColor ?? "#2563eb"}
          name="primaryColor"
          type="color"
        />
      </label>
      <label className="color-field">
        <span>Kolor akcentu</span>
        <input
          defaultValue={store.design?.accentColor ?? "#0f766e"}
          name="accentColor"
          type="color"
        />
      </label>
      <label className="color-field">
        <span>Tło</span>
        <input
          defaultValue={store.design?.backgroundColor ?? "#ffffff"}
          name="backgroundColor"
          type="color"
        />
      </label>
      {error && <p className="notice notice-error" role="alert">{error}</p>}
      {notice && <p className="notice notice-success" role="status">{notice}</p>}
      <button className="button button-primary" disabled={saving} type="submit">
        {saving ? "Zapisywanie…" : "Zapisz kolory"}
      </button>
    </form>
  );
}
