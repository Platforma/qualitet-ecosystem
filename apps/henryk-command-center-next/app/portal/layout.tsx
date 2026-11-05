import type { Metadata } from "next";
import type { ReactNode } from "react";
import PortalShell from "./components/portal-shell";
import "./portal.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://qualitet-market.com"),
  title: {
    default: "Qualitet Market",
    template: "%s | Qualitet Market",
  },
  description:
    "Odkrywaj ofertę Qualitet Market, poznaj możliwości współpracy i korzystaj z narzędzi wspierających rozwój firm.",
  applicationName: "Qualitet Market",
  openGraph: {
    type: "website",
    locale: "pl_PL",
    siteName: "Qualitet Market",
    title: "Qualitet Market",
    description:
      "Marketplace, współpraca biznesowa i narzędzia wspierające rozwój firm.",
    url: "https://qualitet-market.com",
  },
};

export default function PortalLayout({ children }: { children: ReactNode }) {
  return <PortalShell>{children}</PortalShell>;
}
