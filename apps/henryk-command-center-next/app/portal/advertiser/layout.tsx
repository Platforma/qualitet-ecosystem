import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getRequestUser } from "../../../lib/server/auth";

export const instant = false;

export default async function AdvertiserLayout({
  children,
}: {
  children: ReactNode;
}) {
  await connection();
  const user = await getRequestUser();
  if (!user) redirect("/login?next=%2Fportal%2Fadvertiser%2Fdashboard");
  return <>{children}</>;
}