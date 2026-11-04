import type { Metadata } from "next";
import architecture from "../../../../../../ai/memory/architecture_memory.json";
import business from "../../../../../../ai/memory/business_memory.json";
import marketplace from "../../../../../../ai/memory/marketplace_memory.json";
import project from "../../../../../../ai/memory/project_memory.json";
import supplier from "../../../../../../ai/memory/supplier_memory.json";

export const metadata: Metadata = { title: "AI Memory | Owner Control Center" };
export const instant = false;

const snapshots = [
  ["Projekt", project],
  ["Architektura", architecture],
  ["Firma", business],
  ["Marketplace", marketplace],
  ["Dostawcy", supplier],
] as const;

export default function ControlCenterMemoryPage() {
  return (
    <section className="space-y-4">
      <header>
        <h2 className="text-2xl font-bold">AI Memory</h2>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          Podgląd wersjonowanych snapshotów projektu. Dane i sekrety integracji
          pozostają w MongoDB i nie są publikowane w tych plikach.
        </p>
      </header>
      <div className="grid gap-3 lg:grid-cols-2">
        {snapshots.map(([title, snapshot]) => (
          <article className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5" key={title}>
            <h3 className="font-semibold">{title}</h3>
            <pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap break-words rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-700">
              {JSON.stringify(snapshot, null, 2)}
            </pre>
          </article>
        ))}
      </div>
    </section>
  );
}
