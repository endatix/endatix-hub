import "@/app/globals.css";
import { AppProvider } from "@/components/providers";
import { geistMono, geistSans } from "@/lib/fonts/geist-local";
import { getPublicAssetPath } from "@/lib/hosting";
import { getOsClass } from "@/lib/utils/next-utils";
import { Metadata } from "next";
import { headers } from "next/headers";
import { getMetadataBase } from "@/lib/seo";
import { getClientEndatixConfig } from "@/features/config/server";

/**
 * Standalone public shell, mirroring the maintenance page. Export links are
 * opened by recipients who have no Hub session, so there is no app chrome.
 */
const appOptions = {
  enableTheme: true,
  enableAnalytics: false,
  enableSession: false,
  enableToaster: false,
  enableSidebar: false,
};

export const metadata: Metadata = {
  metadataBase: getMetadataBase(),
  title: "Export failed - Endatix",
  description: "This export could not be completed.",
  robots: {
    index: false,
    follow: false,
  },
};

interface ExportErrorLayoutProps {
  children: React.ReactNode;
}

export default async function ExportErrorLayout({
  children,
}: Readonly<ExportErrorLayoutProps>) {
  const [requestHeaders, endatixConfig] = await Promise.all([
    headers(),
    getClientEndatixConfig(),
  ]);
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
        <AppProvider options={appOptions} endatixConfig={endatixConfig}>
          {children}
        </AppProvider>
      </body>
    </html>
  );
}
