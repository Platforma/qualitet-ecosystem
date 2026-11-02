import type { Metadata } from "next";
import PromptsView from "../views/prompts-view";

export const metadata: Metadata = { title: "Prompty | Owner Control Center" };
export const instant = false;

export default function ControlCenterPromptsPage() {
  return <PromptsView />;
}
