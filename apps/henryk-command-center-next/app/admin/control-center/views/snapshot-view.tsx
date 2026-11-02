export default function SnapshotView({
  title,
  description,
  sections,
}: {
  title: string;
  description: string;
  sections: { title: string; items: readonly string[] }[];
}) {
  return (
    <section className="space-y-4">
      <header>
        <h2 className="text-2xl font-bold">{title}</h2>
        <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
      </header>
      <div className="grid gap-3 lg:grid-cols-3">
        {sections.map((section) => (
          <article className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5" key={section.title}>
            <h3 className="font-semibold">{section.title}</h3>
            <ul className="mt-3 space-y-3">
              {section.items.map((item, index) => (
                <li className="break-words border-t border-slate-100 pt-3 text-sm leading-6 text-slate-700" key={`${index}-${item}`}>
                  {item}
                </li>
              ))}
              {section.items.length === 0 && <li className="text-sm text-slate-500">Brak wpisów.</li>}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}
