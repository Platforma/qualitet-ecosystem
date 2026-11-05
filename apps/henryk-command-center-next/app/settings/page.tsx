import OwnerSettings from "./owner-settings";
import { getRequestUser } from "../../lib/server/auth";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Owner Studio Settings | Qualitet",
  description: "Centrum konfiguracji platformy Qualitet.",
};

export const instant = false;

export default async function SettingsPage() {
  const user = await getRequestUser();
  if (!user || user.role !== "owner") redirect("/");
  return <OwnerSettings />;
}