import type { Metadata } from "next";
import roadmap from "../../../../../../ai/memory/roadmap_memory.json";
import SnapshotView from "../views/snapshot-view";

export const metadata: Metadata = { title: "Roadmapa | Owner Control Center" };
export const instant = false;

export default function ControlCenterRoadmapPage() {
  return (
    <SnapshotView
      description="Roadmapa projektu zapisana w AI Memory."
      sections={[
        { title: "Zrealizowane", items: roadmap.done },
        { title: "W toku / do weryfikacji", items: roadmap.inProgressOrNotVerified },
        { title: "Następne działania", items: roadmap.nextActions },
      ]}
      title="Roadmapa"
    />
  );
}
