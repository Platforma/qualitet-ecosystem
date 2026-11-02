import CampaignManager from "./campaign-manager";

export const metadata = { title: "Kampanie | Supplier Acquisition Center" };
export const instant = false;

export default function CampaignsPage() {
  return (
    <section>
      <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">Supplier Acquisition Center</p>
      <h1 className="mt-2 text-3xl font-semibold">Kampanie outreach</h1>
      <p className="mt-2 max-w-3xl text-slate-600">
        Kampanie są zapisywane jako wersje robocze. Wysyłka jest wyłączona, dopóki platforma pocztowa nie zostanie skonfigurowana i nie będzie można zweryfikować zgody odbiorcy.
      </p>
      <CampaignManager />
    </section>
  );
}
