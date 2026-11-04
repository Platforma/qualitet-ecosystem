import type { Metadata } from "next";
import ControlDashboard from "./views/control-dashboard";

export const metadata: Metadata = {
  title: "Owner Control Center | QUALITET",
};
export const instant = false;

export default function OwnerControlCenterPage() {
  return <ControlDashboard />;
}
