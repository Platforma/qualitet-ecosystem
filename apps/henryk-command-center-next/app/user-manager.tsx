"use client";

import { useEffect, useState, type FormEvent } from "react";

type ManagedUser = {
  id: string;
  email: string;
  name: string;
  role: "owner" | "admin" | "user";
  status: "active" | "disabled";
};

type UsersResponse = { items: ManagedUser[]; currentUserId: string };

function isUsersResponse(value: unknown): value is UsersResponse {
  return (
    typeof value === "object" &&
    value !== null &&
    "items" in value &&
    "currentUserId" in value &&
    typeof value.currentUserId === "string" &&
    Array.isArray(value.items) &&
    value.items.every(
      (item) =>
        typeof item === "object" &&
        item !== null &&
        "id" in item &&
        typeof item.id === "string" &&
        "email" in item &&
        typeof item.email === "string" &&
        "name" in item &&
        typeof item.name === "string" &&
        "role" in item &&
        ["owner", "admin", "user"].includes(String(item.role)) &&
        "status" in item &&
        ["active", "disabled"].includes(String(item.status)),
    )
  );
}

async function fetchUsers(signal?: AbortSignal) {
  const response = await fetch("/api/admin/users", {
    cache: "no-store",
    signal,
  });
  if (!response.ok) {
    throw new Error(
      response.status === 403
        ? "Zarządzanie użytkownikami wymaga roli owner."
        : "Nie udało się odczytać użytkowników.",
    );
  }
  const result: unknown = await response.json();
  if (!isUsersResponse(result)) {
    throw new Error("Otrzymano nieprawidłową listę użytkowników.");
  }
  return result;
}

export default function UserManager() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [currentUserId, setCurrentUserId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function loadUsers() {
    setBusy(true);
    setError(null);
    try {
      const result = await fetchUsers();
      setUsers(result.items);
      setCurrentUserId(result.currentUserId);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Nie udało się odczytać użytkowników.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function updateUser(user: ManagedUser) {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/users/${encodeURIComponent(user.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          user.status === "active"
            ? { status: "disabled" }
            : { status: "active" },
        ),
      });
      if (!response.ok) {
        const result: unknown = await response.json();
        const message =
          typeof result === "object" &&
          result !== null &&
          "error" in result &&
          typeof result.error === "string"
            ? result.error
            : "Nie udało się zmienić statusu użytkownika.";
        throw new Error(message);
      }
      await loadUsers();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Nie udało się zmienić statusu użytkownika.",
      );
      setBusy(false);
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    void fetchUsers(controller.signal)
      .then((result) => {
        if (active) {
          setUsers(result.items);
          setCurrentUserId(result.currentUserId);
        }
      })
      .catch((requestError: unknown) => {
        if (
          active &&
          !(requestError instanceof Error && requestError.name === "AbortError")
        ) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "Nie udało się odczytać użytkowników.",
          );
        }
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  async function createUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: data.get("email"),
          name: data.get("name"),
          password: data.get("password"),
          role: data.get("role"),
        }),
      });
      if (!response.ok) {
        const result: unknown = await response.json();
        const message =
          typeof result === "object" &&
          result !== null &&
          "error" in result &&
          typeof result.error === "string"
            ? result.error
            : "Nie udało się utworzyć użytkownika.";
        throw new Error(message);
      }
      form.reset();
      await loadUsers();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Nie udało się utworzyć użytkownika.",
      );
      setBusy(false);
    }
  }

  return (
    <section className="border-t border-slate-100 p-5 sm:px-6">
      <header className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h4 className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
            Użytkownicy i role
          </h4>
          <p className="mt-1 text-[9px] text-slate-400">
            Tylko Owner może tworzyć konta Admin i User. Hasła są zapisywane jako scrypt hash.
          </p>
        </div>
        <button
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-[10px] font-semibold text-slate-600 disabled:opacity-50"
          disabled={busy}
          onClick={() => void loadUsers()}
          type="button"
        >
          Odśwież
        </button>
      </header>

      {error && (
        <p
          className="mb-3 rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-[10px] text-rose-700"
          role="alert"
        >
          {error}
        </p>
      )}

      <ul className="mb-4 divide-y divide-slate-100 rounded-lg border border-slate-100">
        {users.map((user) => (
          <li
            className="flex items-center justify-between gap-3 px-3 py-2.5"
            key={user.id}
          >
            <span className="truncate text-[10px] font-medium text-slate-700">
              {user.name} · {user.email}
            </span>
            <span className="flex shrink-0 items-center gap-2">
              <span className="rounded-full bg-slate-100 px-2 py-1 text-[9px] font-semibold uppercase text-slate-600">
                {user.role} · {user.status}
              </span>
              {user.id !== currentUserId && (
                <button
                  className="rounded border border-slate-200 px-2 py-1 text-[9px] font-semibold text-slate-500 disabled:opacity-50"
                  disabled={busy}
                  onClick={() => void updateUser(user)}
                  type="button"
                >
                  {user.status === "active" ? "Wyłącz" : "Włącz"}
                </button>
              )}
            </span>
          </li>
        ))}
        {users.length === 0 && (
          <li className="px-3 py-4 text-center text-[10px] text-slate-400">
            {busy ? "Odczytuję użytkowników…" : "Brak dostępnych rekordów lub wymagane są uprawnienia Owner."}
          </li>
        )}
      </ul>

      <form
        className="grid gap-2 sm:grid-cols-2"
        onSubmit={(event) => void createUser(event)}
      >
        <input
          autoComplete="off"
          className="rounded-md border border-slate-200 px-2.5 py-2 text-[10px]"
          maxLength={120}
          name="name"
          placeholder="Nazwa użytkownika"
          required
        />
        <input
          autoComplete="off"
          className="rounded-md border border-slate-200 px-2.5 py-2 text-[10px]"
          maxLength={254}
          name="email"
          placeholder="E-mail"
          required
          type="email"
        />
        <input
          autoComplete="new-password"
          className="rounded-md border border-slate-200 px-2.5 py-2 text-[10px]"
          maxLength={256}
          minLength={12}
          name="password"
          placeholder="Hasło (minimum 12 znaków)"
          required
          type="password"
        />
        <select
          className="rounded-md border border-slate-200 px-2.5 py-2 text-[10px]"
          defaultValue="user"
          name="role"
        >
          <option value="user">User</option>
          <option value="admin">Admin</option>
        </select>
        <button
          className="rounded-md bg-indigo-600 px-3 py-2 text-[10px] font-semibold text-white disabled:opacity-50 sm:col-span-2"
          disabled={busy}
          type="submit"
        >
          Utwórz użytkownika
        </button>
      </form>
    </section>
  );
}
