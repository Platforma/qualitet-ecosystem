import type { Metadata } from "next";
import OwnerSetup from "../../setup/setup-form";

export const metadata: Metadata = { title: "Setup | Owner Control Center" };
export const instant = false;

export default function ControlCenterSetupPage() {
  return <OwnerSetup />;
}
