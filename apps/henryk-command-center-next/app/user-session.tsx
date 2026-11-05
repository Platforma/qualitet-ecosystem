"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type SessionUser = {
  email: string;
  name: string;
  role: "owner" | "admin" | "user";
};

function isSessionUser(value: unknown): value is SessionUser {
  return (
    typeof value === "object" &&
    value !== null &&
    "email" in value &&
    typeof value.email === "string" &&
    "name" in value &&
    typeof value.name === "string" &&
    "role" in value &&
    ["owner", "admin", "user"].includes(String(value.role))
  );
}

export default function UserSession() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/auth/session", {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) return null;
        const result: unknown = await response.json();
        if (
          typeof result !== "object" ||
          result === null ||
          !("user" in result) ||
          !isSessionUser(result.user)
        ) {
          return null;
        }
        return result.user;
      })
      .then((result) => {
        if (!controller.signal.aborted) setUser(result);
      })
      .catch(() => {
        if (!controller.signal.aborted) setUser(null);
      });
    return () => controller.abort();
  }, []);

  async function logout() {
    const response = await fetch("/api/auth/logout", { method: "POST" });
    if (!response.ok) {
      return;
    }
    router.push("/login");
  }

  return (
    <div className="flex items-center gap-2">
      <span className="hidden text-[10px] font-medium text-slate-500 sm:inline">
        {user ? `${user.name} · ${user.role}` : "Sesja"}
      </span>
      <button
        className="rounded-lg border border-slate-200 px-3 py-2 text-[10px] font-semibold text-slate-600 transition hover:border-rose-200 hover:text-rose-700"
        onClick={() => void logout()}
        type="button"
      >
        Wyloguj
      </button>
    </div>
  );
}
