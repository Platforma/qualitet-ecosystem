import type { Metadata } from "next";
import SupplierRegistrationForm from "./registration-form";
import { PageIntro } from "../../components/portal-shell";

export const metadata: Metadata = {
  title: "Dodaj firmę",
  description: "Zgłoś firmę jako dostawcę Qualitet Market.",
  alternates: { canonical: "/supplier/register" },
};

export default function SupplierRegistrationPage() {
  return (
    <section className="portal-container portal-section">
      <PageIntro
        description="Zgłoszenie jest bezpłatne. Firma pozostaje weryfikowana przed aktywacją i publikacją produktów."
        eyebrow="Rejestracja dostawcy"
        title="Dodaj firmę do Qualitet Market."
      />
      <SupplierRegistrationForm />
    </section>
  );
}
