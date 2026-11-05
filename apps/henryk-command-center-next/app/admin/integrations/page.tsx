import type { Metadata } from "next";
import OwnerOverview from "../owner-overview";

export const metadata: Metadata = { title: "Integracje | QUALITET Owner Studio" };
export const instant = false;

export default function IntegrationsPage() {
  return <OwnerOverview mode="integrations" />;
}
