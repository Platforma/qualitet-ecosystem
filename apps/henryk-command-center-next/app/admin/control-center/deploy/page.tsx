import type { Metadata } from "next";
import DeployView from "../views/deploy-view";

export const metadata: Metadata = { title: "Deploy | Owner Control Center" };
export const instant = false;

export default function ControlCenterDeployPage() {
  return <DeployView />;
}
