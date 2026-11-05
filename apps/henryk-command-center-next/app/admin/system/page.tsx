import type { Metadata } from "next";
import OwnerOverview from "../owner-overview";

export const metadata: Metadata = { title: "System | QUALITET Owner Studio" };
export const instant = false;

export default function SystemPage() {
  return <OwnerOverview mode="system" />;
}
