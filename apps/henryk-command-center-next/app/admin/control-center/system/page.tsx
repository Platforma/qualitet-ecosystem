import type { Metadata } from "next";
import OwnerOverview from "../../owner-overview";

export const metadata: Metadata = { title: "System | QUALITET Owner Center" };
export const instant = false;

export default function OwnerSystemPage() {
  return <OwnerOverview mode="system" />;
}
