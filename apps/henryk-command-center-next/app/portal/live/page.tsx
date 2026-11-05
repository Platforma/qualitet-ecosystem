import { connection } from "next/server";
import type { Metadata } from "next";
import { CallToAction, PageIntro } from "../components/portal-shell";

export const metadata: Metadata = {
  title: "Status na żywo",
  description:
    "Bieżący status działania publicznego portalu Qualitet Market.",
  alternates: { canonical: "/live" },
};

export const instant = false;

export default async function LivePage() {
  await connection();
  const checkedAt = new Date();

  return (
    <>
      <section className="portal-container portal-section">
        <PageIntro
          description="Ta strona jest renderowana przez działający serwer Qualitet Market. Poniżej znajduje się czas wygenerowania aktualnego widoku."
          eyebrow="Status publiczny"
          title="Informacje na żywo."
        />
      </section>
      <section className="portal-container pb-16">
        <div className="portal-card max-w-2xl">
          <div className="flex items-center gap-3">
            <span aria-hidden="true" className="portal-status-dot" />
            <h2 className="portal-card-title mt-0">Publiczny portal odpowiada</h2>
          </div>
          <p className="portal-card-copy">
            Ten status potwierdza wygenerowanie bieżącej strony. Nie jest
            monitoringiem usług zewnętrznych ani gwarancją dostępności innych
            modułów platformy.
          </p>
          <dl className="mt-6 border-t border-[#dfe5dc] pt-5">
            <dt className="text-xs font-semibold uppercase tracking-wide text-[#59665e]">
              Wygenerowano
            </dt>
            <dd className="mt-2 text-lg font-bold">
              <time dateTime={checkedAt.toISOString()}>
                {new Intl.DateTimeFormat("pl-PL", {
                  dateStyle: "long",
                  timeStyle: "medium",
                  timeZone: "Europe/Warsaw",
                }).format(checkedAt)}
              </time>
            </dd>
          </dl>
        </div>
      </section>
      <section className="portal-container pb-16">
        <CallToAction
          description="Wróć do oferty, poznaj możliwości współpracy albo utwórz konto w ekosystemie."
          eyebrow="Qualitet Market"
          primaryHref="/market"
          primaryLabel="Przeglądaj marketplace"
          secondaryHref="/partner"
          secondaryLabel="Dołącz jako partner"
          title="Portal jest gotowy, aby pomóc Ci zrobić kolejny krok."
        />
      </section>
    </>
  );
}
