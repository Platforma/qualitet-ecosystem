"use client";

import { useEffect, useState, type FormEvent } from "react";

type Campaign = {
  id: string;
  name: string;
  subject: string;
  status: string;
  sent: number;
  createdAt: string;
};

export default function CampaignManager() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    const response = await fetch("/api/admin/outreach/campaigns", { cache: "no-store" });
    const result = (await response.json()) as { items?: Campaign[]; error?: string };
    if (!response.ok) throw new Error(result.error ?? "Nie udało się pobrać kampanii.");
    setCampaigns(result.items ?? []);
  }

  useEffect(() => {
    let active = true;
    fetch("/api/admin/outreach/campaigns", { cache: "no-store" })
      .then(async (response) => {
        const result = (await response.json()) as { items?: Campaign[]; error?: string };
        if (!response.ok) throw new Error(result.error ?? "Nie udało się pobrać kampanii.");
        if (active) setCampaigns(result.items ?? []);
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : "Błąd odczytu.");
      });
    return () => { active = false; };
  }, []);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/admin/outreach/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.get("name"),
          subject: form.get("subject"),
          message: form.get("message"),
          followUps: [
            { subject: form.get("subject2"), message: form.get("message2") },
            { subject: form.get("subject3"), message: form.get("message3") },
          ],
        }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Nie udało się zapisać kampanii.");
      formElement.reset();
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Nie udało się zapisać kampanii.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-8 grid gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.8fr)]">
      <form className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-6" onSubmit={create}>
        <h2 className="text-xl font-semibold">Utwórz kampanię roboczą</h2>
        <label className="grid gap-2 text-sm">Nazwa kampanii<input className="rounded-lg border border-slate-300 px-3 py-2" name="name" required maxLength={160} /></label>
        {[
          ["Email #1 — temat", "subject"], ["Email #1 — treść", "message"],
          ["Email #2 — follow-up", "subject2"], ["Email #2 — treść", "message2"],
          ["Email #3 — follow-up", "subject3"], ["Email #3 — treść", "message3"],
        ].map(([label, name]) => (
          <label className="grid gap-2 text-sm" key={name}>{label}
            {name.includes("message")
              ? <textarea className="rounded-lg border border-slate-300 px-3 py-2" name={name} rows={3} maxLength={10000} required={name === "message"} />
              : <input className="rounded-lg border border-slate-300 px-3 py-2" name={name} maxLength={250} required={name === "subject"} />}
          </label>
        ))}
        {error && <p className="text-sm text-red-700" role="alert">{error}</p>}
        <button className="rounded-xl bg-slate-900 px-4 py-3 font-medium text-white disabled:opacity-50" disabled={saving}>Zapisz draft</button>
      </form>
      <div>
        <h2 className="text-xl font-semibold">Zapisane kampanie</h2>
        <ul className="mt-4 grid list-none gap-3 p-0">
          {campaigns.map((campaign) => (
            <li className="rounded-2xl border border-slate-200 bg-white p-5" key={campaign.id}>
              <p className="text-xs uppercase tracking-wide text-emerald-700">{campaign.status}</p>
              <h3 className="mt-2 font-semibold">{campaign.name}</h3>
              <p className="mt-1 text-sm text-slate-600">{campaign.subject}</p>
              <p className="mt-3 text-xs text-slate-500">Wysłano: {campaign.sent}</p>
            </li>
          ))}
          {campaigns.length === 0 && <li className="rounded-2xl border border-dashed border-slate-300 p-5 text-sm text-slate-500">Brak kampanii.</li>}
        </ul>
      </div>
    </div>
  );
}
