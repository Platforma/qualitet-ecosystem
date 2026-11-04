import type { Metadata } from "next";
import PartnersView from "../views/partners-view";

export const metadata: Metadata = { title: "Partnerzy | Owner Control Center" };
export const instant = false;

export default function ControlCenterPartnersPage() {
  return <PartnersView />;
}
