"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type PartnerStats = {
  monthlyTargets?: { partners?: { target: number; current: number } };
  error?: string;
};

export default function PartnersView() {
  const [stats, setStats] = useState<PartnerStats | null>(null);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setError("");
    try {
      const response = await fetch("/api/admin/suppliers/stats", { cache: "no-store" });
      const result = (await response.json()) as PartnerStats;
      if (!response.ok) throw new Error(result.error || "Nie udało się pobrać statystyk partnerów.");
      setStats(result);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Błąd statystyk partnerów.");
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(refresh);
  }, [refresh]);

  const partnerTarget = stats?.monthlyTargets?.partners;

  return (
    <section className="space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div><h2 className="text-2xl font-bold">Partnerzy</h2><p className="mt-1 text-sm text-slate-600">Podgląd aktywnych partnerów w bieżącym miesiącu.</p></div>
        <button className="min-h-11 rounded-xl border border-slate-300 px-4 text-sm font-semibold" onClick={() => void refresh()} type="button">Odśwież</button>
      </header>
      {error && <p className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900" role="alert">{error}</p>}
      <article className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <p className="text-sm text-slate-600">Aktywni partnerzy w tym miesiącu</p>
        <p className="mt-1 text-3xl font-bold">{partnerTarget?.current ?? "—"}</p>
        <p className="mt-1 text-sm text-slate-600">Cel miesięczny: {partnerTarget?.target ?? "—"}</p>
      </article>
      <div className="grid gap-3 sm:grid-cols-2">
        <Link className="inline-flex min-h-14 items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 font-semibold" href="/admin/companies">Firmy i przypisania <span aria-hidden="true">→</span></Link>
        <Link className="inline-flex min-h-14 items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 font-semibold" href="/admin/companies/stats">Statystyki współpracy <span aria-hidden="true">→</span></Link>
      </div>
      <p className="text-xs leading-5 text-slate-500">Lista partnerów oraz ich edycja pozostają w istniejącym module; ten widok nie zmienia tamtych funkcji.</p>
    </section>
  );
}
