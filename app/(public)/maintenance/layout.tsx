import { AppProvider } from "@/components/providers";
import { AppOptions } from "@/components/providers/app-options";
import { getClientEndatixConfig } from "@/features/config/server";
import { getPublicAssetPath } from "@/lib/hosting";
import { getMetadataBase } from "@/lib/seo";
import { Metadata } from "next";

/**
 * Like `/share`, this route renders only a public status page, so it does not load
 * `globals.css` or Hub fonts (DESIGN.md §9), and has no theme provider: the page
 * follows the OS colour scheme on its own.
 */

export const metadata: Metadata = {
  metadataBase: getMetadataBase(),
  title: "Scheduled maintenance",
};

interface MaintenanceLayoutProps {
  children: React.ReactNode;
}

export default async function MaintenanceLayout({
  children,
}: Readonly<MaintenanceLayoutProps>) {
  const endatixConfig = await getClientEndatixConfig();

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link
          rel="icon"
          href={getPublicAssetPath("/assets/icons/icon.svg")}
          type="image/svg+xml"
        />
      </head>
      <body>
        <AppProvider
          options={AppOptions.StatusPages}
          endatixConfig={endatixConfig}
        >
          {children}
        </AppProvider>
      </body>
    </html>
  );
}
