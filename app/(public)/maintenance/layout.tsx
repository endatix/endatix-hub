import "@/app/globals.css";
import { AppProvider } from "@/components/providers";
import { geistMono, geistSans } from "@/lib/fonts/geist-local";
import { getPublicAssetPath } from "@/lib/hosting";
import { getOsClass } from "@/lib/utils/next-utils";
import { Metadata } from "next";
import { headers } from "next/headers";
import { getMetadataBase } from "@/lib/seo";
import { getClientEndatixConfig } from "@/features/config";

const appOptions = {
  enableTheme: true,
  enableAnalytics: false,
  enableSession: false,
  enableToaster: false,
  enableSidebar: false,
};

export const metadata: Metadata = {
  metadataBase: getMetadataBase(),
  title: "Endatix",
  description: "Customizable form management platform",
};

interface MaintenanceLayoutProps {
  children: React.ReactNode;
}

export default async function PublicLayout({
  children,
}: Readonly<MaintenanceLayoutProps>) {
  const requestHeaders = await headers();
  const osClass = getOsClass(requestHeaders);

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${osClass}`}
      suppressHydrationWarning
    >
      <head>
        <link
          rel="icon"
          href={getPublicAssetPath("/assets/icons/icon.svg")}
          type="image/svg+xml"
        />
      </head>
      <body>
        <AppProvider
          options={appOptions}
          endatixConfig={getClientEndatixConfig()}
        >
          {children}
        </AppProvider>
      </body>
    </html>
  );
}
