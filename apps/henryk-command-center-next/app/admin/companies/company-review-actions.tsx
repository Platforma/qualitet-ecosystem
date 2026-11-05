"use client";

import { useState } from "react";

export default function CompanyReviewActions({ id, status }: { id: string; status: string }) {
  const [userId, setUserId] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function update(payload: Record<string, string>) {
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch(`/api/admin/suppliers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Nie udało się zapisać.");
      window.location.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Wystąpił błąd.");
    } finally {
      setSaving(false);
    }
  }
  return (
    <div className="grid gap-2">
      <select aria-label="Status firmy" className="rounded border border-slate-300 px-2 py-1" value={status} onChange={(event) => void update({ status: event.target.value })}>
        <option value="pending">Oczekuje</option><option value="active">Aktywna</option><option value="rejected">Odrzucona</option><option value="suspended">Zawieszona</option>
      </select>
      <form className="flex gap-1" onSubmit={(event) => { event.preventDefault(); void update({ ownerUserId: userId.trim() }); }}>
        <input aria-label="ID konta użytkownika" className="min-w-0 rounded border border-slate-300 px-2 py-1 font-mono text-xs" onChange={(event) => setUserId(event.target.value)} placeholder="ID użytkownika" value={userId} />
        <button className="rounded bg-slate-800 px-2 py-1 text-xs text-white" disabled={saving}>Przypisz</button>
      </form>
      {message && <span className="text-xs text-red-700" role="status">{message}</span>}
    </div>
  );
}
