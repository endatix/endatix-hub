import { AppProvider } from "@/components/providers";
import { AppOptions } from "@/components/providers/app-options";
import { getClientEndatixConfig } from "@/features/config/server";
import { getPublicAssetPath } from "@/lib/hosting";
import { getMetadataBase } from "@/lib/seo";
import { Metadata } from "next";

/**
 * Standalone public shell, like maintenance. Export links are opened by recipients
 * who have no Hub session; the page is a public status page, so there is no Hub
 * stylesheet, font or theme provider (DESIGN.md §6, §9).
 */
export const metadata: Metadata = {
  metadataBase: getMetadataBase(),
  title: "Export failed",
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
