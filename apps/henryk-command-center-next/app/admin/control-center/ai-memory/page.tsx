import type { Metadata } from "next";
import architecture from "../../../../../../ai/memory/architecture_memory.json";
import business from "../../../../../../ai/memory/business_memory.json";
import domain from "../../../../../../ai/memory/domain_memory.json";
import integration from "../../../../../../ai/memory/integration_memory.json";
import marketplace from "../../../../../../ai/memory/marketplace_memory.json";
import partner from "../../../../../../ai/memory/partner_memory.json";
import project from "../../../../../../ai/memory/project_memory.json";
import prompt from "../../../../../../ai/memory/prompt_memory.json";
import roadmap from "../../../../../../ai/memory/roadmap_memory.json";
import supplier from "../../../../../../ai/memory/supplier_memory.json";

export const metadata: Metadata = { title: "AI Memory | Owner Control Center" };
export const instant = false;

const snapshots = [
  ["Projekt", project],
  ["Architektura", architecture],
  ["Integracje", integration],
  ["Firma", business],
  ["Roadmapa", roadmap],
  ["Marketplace", marketplace],
  ["Partnerzy", partner],
  ["Dostawcy", supplier],
  ["Domeny", domain],
  ["Agenci i prompty", prompt],
] as const;

export default function ControlCenterMemoryPage() {
  return (
    <section className="space-y-4">
      <header>
        <h2 className="text-2xl font-bold">AI Memory</h2>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          Wszystkie 10 wersjonowanych snapshotów jest wspólnym kontekstem
          rozmów agentów. Dane klientów i sekrety integracji pozostają w MongoDB
          i nie są publikowane w tych plikach.
        </p>
      </header>
      <div className="grid gap-3 lg:grid-cols-2">
        {snapshots.map(([title, snapshot]) => (
          <article className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5" key={title}>
            <h3 className="font-semibold">{title}</h3>
            <pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap wrap-break-wordword rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-700">
              {JSON.stringify(snapshot, null, 2)}
            </pre>
          </article>
        ))}
      </div>
    </section>
  );
}
