import type { Metadata } from "next";
import OwnerOverview from "../owner-overview";

export const metadata: Metadata = { title: "Checklist | QUALITET Owner Studio" };
export const instant = false;

export default function ChecklistPage() {
  return <OwnerOverview mode="checklist" />;
}
