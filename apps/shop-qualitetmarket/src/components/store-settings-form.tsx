import { useState, type FormEvent } from "react";
import type { StorePageData } from "../server/shop-page-data";

type SaveResponse = { error?: string; success?: boolean };

export default function StoreSettingsForm({
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
          section: "settings",
          name: form.get("name"),
          settings: {
            locale: form.get("locale"),
            currency: form.get("currency"),
            timeZone: form.get("timeZone"),
            description: form.get("description"),
            logoUrl: form.get("logoUrl"),
            faviconUrl: form.get("faviconUrl"),
            contactEmail: form.get("contactEmail"),
            contactPhone: form.get("contactPhone"),
            website: form.get("website"),
            socialMedia: {
              instagram: form.get("instagram"),
              facebook: form.get("facebook"),
              tiktok: form.get("tiktok"),
              youtube: form.get("youtube"),
              linkedin: form.get("linkedin"),
            },
          },
        }),
      });
      const result = (await response.json()) as SaveResponse;
      if (!response.ok) {
        throw new Error(result.error ?? "Nie udało się zapisać ustawień.");
      }
      setNotice("Ustawienia sklepu zostały zapisane.");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Nie udało się zapisać ustawień.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="shop-form" onSubmit={submit}>
      <label className="field">
        <span>Nazwa sklepu</span>
        <input defaultValue={store.name} maxLength={200} name="name" required />
      </label>
      <label className="field">
        <span>Opis sklepu</span>
        <textarea defaultValue={store.settings.description ?? ""} maxLength={5000} name="description" rows={4} />
      </label>
      <div className="field-grid">
        <label className="field">
          <span>Logo URL</span>
          <input defaultValue={store.settings.logoUrl ?? ""} maxLength={2000} name="logoUrl" type="url" />
        </label>
        <label className="field">
          <span>Favicon URL</span>
          <input defaultValue={store.settings.faviconUrl ?? ""} maxLength={2000} name="faviconUrl" type="url" />
        </label>
      </div>
      <div className="field-grid">
        <label className="field">
          <span>Język</span>
          <select defaultValue={store.settings.locale} name="locale" required>
            <option value="pl-PL">Polski</option>
            <option value="en">English</option>
            <option value="de-DE">Deutsch</option>
            <option value="fr-FR">Français</option>
            <option value="es-ES">Español</option>
            <option value="it-IT">Italiano</option>
            <option value="nl-NL">Nederlands</option>
            <option value="cs-CZ">Čeština</option>
            <option value="sk-SK">Slovenčina</option>
            <option value="uk-UA">Українська</option>
          </select>
        </label>
        <h2 className="shop-section-heading">Kontakt i social media</h2>
        <div className="field-grid">
          <label className="field">
            <span>Adres e-mail</span>
            <input autoComplete="email" defaultValue={store.settings.contactEmail ?? ""} maxLength={254} name="contactEmail" type="email" />
          </label>
          <label className="field">
            <span>Telefon</span>
            <input autoComplete="tel" defaultValue={store.settings.contactPhone ?? ""} maxLength={50} name="contactPhone" type="tel" />
          </label>
        </div>
        <label className="field">
          <span>Strona internetowa</span>
          <input defaultValue={store.settings.website ?? ""} maxLength={2000} name="website" type="url" />
        </label>
        <div className="field-grid">
          {(["instagram", "facebook", "tiktok", "youtube", "linkedin"] as const).map((network) => (
            <label className="field" key={network}>
              <span>{network[0].toUpperCase()}{network.slice(1)}</span>
              <input defaultValue={store.settings.socialMedia?.[network] ?? ""} maxLength={2000} name={network} type="url" />
            </label>
          ))}
        </div>
        <label className="field">
          <span>Waluta</span>
          <select defaultValue={store.settings.currency} name="currency" required>
            <option value="PLN">PLN</option>
            <option value="EUR">EUR</option>
            <option value="USD">USD</option>
            <option value="GBP">GBP</option>
            <option value="CZK">CZK</option>
            <option value="CHF">CHF</option>
          </select>
        </label>
      </div>
      <label className="field">
        <span>Strefa czasowa</span>
        <select defaultValue={store.settings.timeZone} name="timeZone" required>
          <option value="Europe/Warsaw">Europe/Warsaw</option>
          <option value="Europe/Berlin">Europe/Berlin</option>
          <option value="Europe/Paris">Europe/Paris</option>
          <option value="Europe/Prague">Europe/Prague</option>
          <option value="Europe/Bratislava">Europe/Bratislava</option>
          <option value="Europe/Kyiv">Europe/Kyiv</option>
          <option value="Europe/London">Europe/London</option>
          <option value="UTC">UTC</option>
        </select>
      </label>
      {store.domain && (
        <p className="shop-readonly">
          Przypisana domena: <strong>{store.domain}</strong>
        </p>
      )}
      {error && <p className="notice notice-error" role="alert">{error}</p>}
      {notice && <p className="notice notice-success" role="status">{notice}</p>}
      <button className="button button-primary" disabled={saving} type="submit">
        {saving ? "Zapisywanie…" : "Zapisz ustawienia"}
      </button>
    </form>
  );
}
