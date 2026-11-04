import type { Metadata } from "next";
import ControlStatus from "../views/control-status";

export const metadata: Metadata = { title: "Checklista | Owner Control Center" };
export const instant = false;

export default function ControlCenterChecklistPage() {
  return <ControlStatus mode="checklist" />;
}
