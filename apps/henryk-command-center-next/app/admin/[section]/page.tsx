import { redirect } from "next/navigation";
import InfrastructureCenter from "../control-center/views/infrastructure-center";
import type { InfrastructureSection } from "../control-center/views/infrastructure-center";

const sections = new Set<InfrastructureSection>([
  "infrastructure",
  "mongodb",
  "render",
  "cloudflare",
  "ollama",
  "deploy",
  "domains",
  "env",
]);

export const instant = false;

export default async function AdminInfrastructureSection({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  if (!sections.has(section as InfrastructureSection)) redirect("/admin/control-center");
  return <InfrastructureCenter section={section as InfrastructureSection} />;
}
