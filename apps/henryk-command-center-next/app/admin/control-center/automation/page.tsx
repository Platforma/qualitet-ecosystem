import type { Metadata } from "next";
import AutomationCenter from "../../automation/automation-center";

export const metadata: Metadata = { title: "Automatyzacje | Owner Control Center" };
export const instant = false;

export default function ControlCenterAutomationPage() {
  return <AutomationCenter />;
}
