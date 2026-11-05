"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export type CampaignSummary = {
  id: string;
  name: string;
  status: string;
  budget: number | null;
  currency: string;
};

export default function CampaignManager({
  initialCampaigns,
}: {
  initialCampaigns: CampaignSummary[];
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function createCampaign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/advertiser/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.get("name"),
          budget: Number(form.get("budget")),
          currency: form.get("currency"),
        }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(result.error ?? "Nie udało się utworzyć kampanii.");
      }
      formElement.reset();
      setMessage("Kampania została zapisana jako wersja robocza.");
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Nie udało się utworzyć kampanii.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="portal-card mt-7">
      <h2 className="portal-card-title mt-0">Utwórz kampanię</h2>
      <p className="portal-card-copy">
        Kampania zostanie zapisana jako wersja robocza. Nie uruchamia reklam ani
        nie pobiera płatności.
      </p>
      <form className="mt-5 grid gap-4 sm:grid-cols-3" onSubmit={createCampaign}>
        <label className="grid gap-2 text-sm">
          Nazwa kampanii
          <input maxLength={120} minLength={2} name="name" required />
        </label>
        <label className="grid gap-2 text-sm">
          Budżet
          <input min="0.01" name="budget" required step="0.01" type="number" />
        </label>
        <label className="grid gap-2 text-sm">
          Waluta
          <select defaultValue="PLN" name="currency">
            <option value="PLN">PLN</option>
            <option value="EUR">EUR</option>
            <option value="USD">USD</option>
          </select>
        </label>
        <button
          className="portal-button portal-button-primary sm:col-span-3 sm:justify-self-start"
          disabled={saving}
          type="submit"
        >
          {saving ? "Zapisywanie..." : "Zapisz wersję roboczą"}
        </button>
      </form>
      {message && (
        <p className="portal-form-message mt-4" role="status">
          {message}
        </p>
      )}
      {initialCampaigns.length === 0 && (
        <p className="portal-card-copy">
          Po zapisaniu kampania pojawi się na tej stronie.
        </p>
      )}
    </section>
  );
}