import LoginForm from "./login-form";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f8fc] px-5 py-10">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-7 shadow-lg shadow-slate-200/50 sm:p-9">
        <div className="mb-7 flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-xl bg-indigo-600 text-lg font-bold text-white">
            H
          </span>
          <div>
            <p className="text-sm font-bold tracking-tight text-slate-900">
              HENRYK
            </p>
            <p className="text-[10px] font-semibold tracking-[0.16em] text-slate-400">
              COMMAND CENTER
            </p>
          </div>
        </div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900">
          Zaloguj się
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Zaloguj się, aby zarządzać systemem Qualitet.
        </p>
        <LoginForm />
      </section>
    </main>
  );
}
