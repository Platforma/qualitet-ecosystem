import Link from "next/link";
import { connection } from "next/server";
import { getCollection } from "../../../lib/server/database";

export const metadata = { title: "Outreach | Supplier Acquisition Center" };
export const instant = false;

export default async function OutreachPage() {
  await connection();
  const [leads, consenting] = await Promise.all([
    getCollection("leads").then((items) => items.countDocuments()),
    getCollection("leads").then((items) => items.countDocuments({ marketingConsent: true })),
  ]);
  return (
    <section>
      <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">Supplier Acquisition Center</p>
      <h1 className="mt-2 text-3xl font-semibold">Outreach</h1>
      <p className="mt-2 max-w-3xl text-slate-600">
        Kontakty z importu są domyślnie bez zgody marketingowej. Nie wysyłamy kampanii, dopóki nie zostanie skonfigurowany dostawca poczty oraz bezpieczna obsługa zgód i rezygnacji.
      </p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 bg-white p-6"><p className="text-sm text-slate-500">Wszystkie leady</p><p className="mt-2 text-3xl font-semibold">{leads}</p></article>
        <article className="rounded-2xl border border-slate-200 bg-white p-6"><p className="text-sm text-slate-500">Jawna zgoda marketingowa</p><p className="mt-2 text-3xl font-semibold">{consenting}</p></article>
      </div>
      <div className="mt-7 flex flex-wrap gap-3">
        <Link className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white" href="/admin/campaigns">Zarządzaj kampaniami</Link>
        <Link className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium" href="/admin/outreach/import">Importuj leady</Link>
        <Link className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium" href="/admin/leads">Przeglądaj leady</Link>
      </div>
    </section>
  );
}
