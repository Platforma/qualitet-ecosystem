import type { Metadata } from "next";
import RecordsView from "../views/records-view";

export const metadata: Metadata = { title: "Firmy | Owner Control Center" };
export const instant = false;

export default function ControlCenterCompaniesPage() {
  return <RecordsView collection="companies" title="Firmy" />;
}
