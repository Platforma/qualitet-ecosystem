import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getRequestUser } from "../../../../lib/server/auth";
import SupplierRegistrationForm from "./registration-form";
import { PageIntro } from "../../components/portal-shell";

export const metadata: Metadata = {
  title: "Dodaj firmę",
  description: "Zgłoś firmę jako dostawcę Qualitet Market.",
  alternates: { canonical: "/supplier/register" },
};

export const instant = false;

export default async function SupplierRegistrationPage() {
  await connection();
  const user = await getRequestUser();
  if (!user) redirect("/login?next=%2Fsupplier%2Fregister");

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
