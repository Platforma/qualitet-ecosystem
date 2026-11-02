import type { Metadata } from "next";
import ReportsView from "../views/reports-view";

export const metadata: Metadata = { title: "Raporty | Owner Control Center" };
export const instant = false;

export default function ControlCenterReportsPage() {
  return <ReportsView />;
}
