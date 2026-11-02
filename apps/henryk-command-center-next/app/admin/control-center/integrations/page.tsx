import type { Metadata } from "next";
import ControlStatus from "../views/control-status";

export const metadata: Metadata = { title: "Integracje | Owner Control Center" };
export const instant = false;

export default function ControlCenterIntegrationsPage() {
  return <ControlStatus mode="integrations" />;
}
