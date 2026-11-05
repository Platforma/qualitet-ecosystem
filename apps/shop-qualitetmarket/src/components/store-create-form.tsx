import { useState, type FormEvent } from "react";

type StoreCreateResponse = {
  store?: { id?: string };
  error?: string;
};

const socialFields = ["instagram", "facebook", "tiktok", "youtube", "linkedin"] as const;

export default function StoreCreateForm() {
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      const form = new FormData(event.currentTarget);
      const response = await fetch("/api/stores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.get("name"),
          slug: form.get("slug"),
          settings: {
            locale: form.get("locale"),
            currency: form.get("currency"),
            timeZone: form.get("timeZone"),
            description: form.get("description"),
            contactEmail: form.get("contactEmail"),
            socialMedia: Object.fromEntries(
              socialFields.map((field) => [field, form.get(field)]),
            ),
          },
          businessProfile: {
            businessType: form.get("businessType"),
            industry: form.get("industry"),
            offerings: form.get("offerings"),
            targetAudience: form.get("targetAudience"),
            style: form.get("style"),
            country: form.get("country"),
          },
          design: {
            primaryColor: form.get("primaryColor"),
            accentColor: form.get("accentColor"),
            backgroundColor: form.get("backgroundColor"),
          },
        }),
      });
      const result = (await response.json()) as StoreCreateResponse;
      if (!response.ok || !result.store?.id) {
        throw new Error(result.error ?? "Nie udało się utworzyć sklepu.");
      }

      window.location.assign(
        `/dashboard?store=${encodeURIComponent(result.store.id)}`,
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Nie udało się utworzyć sklepu.",
      );
      setSaving(false);
    }
  }

  return (
    <form className="shop-form" onSubmit={submit}>
      <label className="field">
        <span>Nazwa firmy i sklepu</span>
        <input autoComplete="organization" maxLength={200} name="name" required />
      </label>
      <label className="field">
        <span>Adres sklepu (slug)</span>
        <input
          autoCapitalize="none"
          autoComplete="off"
          maxLength={63}
          name="slug"
          pattern="[a-zA-Z0-9]+([\-][a-zA-Z0-9]+)*"
          required
        />
        <small>Unikalny identyfikator sklepu; domena nie jest tu konfigurowana.</small>
      </label>
      <div className="field-grid">
        <label className="field">
          <span>Typ działalności</span>
          <select defaultValue="retail" name="businessType" required>
            <option value="retail">Sklep / firma</option>
            <option value="wholesale">Hurtownia</option>
            <option value="services">Usługi</option>
          </select>
        </label>
        <label className="field">
          <span>Branża</span>
          <input maxLength={120} name="industry" required />
        </label>
      </div>
      <label className="field">
        <span>Co oferuje firma?</span>
        <textarea maxLength={2000} name="offerings" required rows={3} />
      </label>
      <div className="field-grid">
        <label className="field">
          <span>Grupa docelowa</span>
          <input maxLength={1000} name="targetAudience" required />
        </label>
        <label className="field">
          <span>Kraj</span>
          <input autoComplete="country-name" maxLength={100} name="country" required />
        </label>
      </div>
      <label className="field">
        <span>Styl sklepu</span>
        <select defaultValue="modern" name="style" required>
          <option value="modern">Nowoczesny</option>
          <option value="premium">Premium</option>
          <option value="business">Biznesowy</option>
          <option value="luxury">Luksusowy</option>
          <option value="minimal">Minimalistyczny</option>
        </select>
      </label>
      <div className="field-grid">
        <label className="field">
          <span>Kolor główny</span>
          <input defaultValue="#172b4d" name="primaryColor" type="color" />
        </label>
        <label className="field">
          <span>Kolor akcentu</span>
          <input defaultValue="#c89b3c" name="accentColor" type="color" />
        </label>
        <label className="field">
          <span>Tło</span>
          <input defaultValue="#ffffff" name="backgroundColor" type="color" />
        </label>
      </div>
      <div className="field-grid">
        <label className="field">
          <span>Język</span>
          <select defaultValue="" name="locale" required>
            <option disabled value="">Wybierz język</option>
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
        <label className="field">
          <span>Waluta</span>
          <select defaultValue="" name="currency" required>
            <option disabled value="">Wybierz walutę</option>
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
        <select defaultValue="" name="timeZone" required>
          <option disabled value="">Wybierz strefę czasową</option>
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
      <label className="field">
        <span>Opis działalności / o firmie</span>
        <textarea maxLength={5000} name="description" rows={3} />
      </label>
      <label className="field">
        <span>E-mail kontaktowy</span>
        <input autoComplete="email" maxLength={254} name="contactEmail" type="email" />
      </label>
      <p className="field-hint">
        Ollama wygeneruje treści, propozycje kategorii, SEO oraz logo i baner SVG.
        Nie będą tworzone przykładowe produkty ani dokumenty prawne.
      </p>
      <div className="field-grid">
        {socialFields.map((field) => (
          <label className="field" key={field}>
            <span>{field}</span>
            <input autoCapitalize="none" maxLength={2000} name={field} type="url" />
          </label>
        ))}
      </div>
      {error && <p className="notice notice-error" role="alert">{error}</p>}
      <button className="button button-primary" disabled={saving} type="submit">
        {saving ? "Tworzenie…" : "Utwórz sklep"}
      </button>
    </form>
  );
}
