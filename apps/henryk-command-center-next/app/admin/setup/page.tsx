import type { Metadata } from "next";
import OwnerSetup from "./setup-form";

export const metadata: Metadata = {
  title: "Konfiguracja projektu | QUALITET Owner Studio",
};

export const instant = false;

export default function OwnerSetupPage() {
  return <OwnerSetup />;
}
