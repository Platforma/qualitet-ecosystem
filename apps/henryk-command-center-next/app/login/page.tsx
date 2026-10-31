import LoginForm from "./login-form";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-6 sm:px-6 sm:py-10">
      <section className="w-full max-w-md min-w-0 rounded-2xl border border-slate-300 bg-white p-5 shadow-xl shadow-slate-300/60 sm:p-9">
        <div className="mb-7 flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-xl bg-indigo-600 text-lg font-bold text-white">
            H
          </span>
          <div>
            <p className="text-sm font-bold tracking-tight text-slate-900">
              HENRYK
            </p>
            <p className="text-[10px] font-bold tracking-[0.16em] text-slate-600">
              COMMAND CENTER
            </p>
          </div>
        </div>
        <h1 className="text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">
          Zaloguj się
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-700">
          Zaloguj się, aby zarządzać systemem Qualitet.
        </p>
        <LoginForm />
      </section>
    </main>
  );
}
