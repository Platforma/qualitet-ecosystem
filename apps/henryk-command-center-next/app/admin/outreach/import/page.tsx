import LeadImportForm from "./lead-import-form";

export const metadata = { title: "Import leadów | Supplier Acquisition Center" };
export const instant = false;

export default function LeadImportPage() {
  return (
    <section>
      <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">Supplier Acquisition Center</p>
      <h1 className="mt-2 text-3xl font-semibold">Import leadów</h1>
      <p className="mt-2 max-w-3xl text-slate-600">
        Import CSV/XLSX do 2 MB i 1000 wierszy. Strony WWW są zapisywane jako źródła leadów — serwer nie pobiera dowolnych adresów.
      </p>
      <LeadImportForm />
    </section>
  );
}
