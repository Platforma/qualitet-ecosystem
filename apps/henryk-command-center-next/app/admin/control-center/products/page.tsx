import type { Metadata } from "next";
import RecordsView from "../views/records-view";

export const metadata: Metadata = { title: "Produkty | Owner Control Center" };
export const instant = false;

export default function ControlCenterProductsPage() {
  return <RecordsView collection="products" title="Produkty" />;
}
