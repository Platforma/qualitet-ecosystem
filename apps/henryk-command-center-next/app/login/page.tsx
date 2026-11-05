import LoginForm from "./login-form";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0B0F19] px-4 py-6 sm:px-6 sm:py-10">
      <section className="w-full max-w-md min-w-0 rounded-2xl border border-[#374151] bg-[#1F2937] p-5 shadow-xl shadow-black/20 sm:p-9">
        <div className="mb-7 flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-xl bg-indigo-600 text-lg font-bold text-white">
            H
          </span>
          <div>
            <p className="text-sm font-bold tracking-tight text-[#F9FAFB]">
              HENRYK
            </p>
            <p className="text-[10px] font-bold tracking-[0.16em] text-[#9CA3AF]">
              COMMAND CENTER
            </p>
          </div>
        </div>
        <h1 className="text-xl font-bold tracking-tight text-[#F9FAFB] sm:text-2xl">
          Zaloguj się
        </h1>
        <p className="mt-2 text-sm leading-6 text-[#D1D5DB]">
          Zaloguj się, aby zarządzać systemem Qualitet.
        </p>
        <LoginForm />
      </section>
    </main>
  );
}
