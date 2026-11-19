import { AppProvider } from "@/components/providers";
import { AppOptions } from "@/components/providers/app-options";
import { getClientEndatixConfig } from "@/features/config/server";
import {
  brandLayoutMetadata,
  brandTitle,
  getBrand,
} from "@/lib/branding/server";
import { getMetadataBase } from "@/lib/seo";
import { Metadata } from "next";

/**
 * Standalone public shell, like maintenance. Export links are opened by recipients
 * who have no Hub session; the page is a public status page, so there is no Hub
 * stylesheet, font or theme provider (DESIGN.md §6, §9).
 */
export async function generateMetadata(): Promise<Metadata> {
  return {
    ...(await brandLayoutMetadata()),
    title: await brandTitle({
      page: "Export failed",
      builtIn: "Export failed",
    }),
    metadataBase: getMetadataBase(),
    description: "This export could not be completed.",
    robots: {
      index: false,
      follow: false,
    },
  };
}

interface ExportErrorLayoutProps {
  children: React.ReactNode;
}

export default async function ExportErrorLayout({
  children,
}: Readonly<ExportErrorLayoutProps>) {
  const [endatixConfig, brand] = await Promise.all([
    getClientEndatixConfig(),
    getBrand(),
  ]);

  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body>
        <AppProvider
          options={AppOptions.StatusPages}
          endatixConfig={endatixConfig}
          brand={brand}
        >
          {children}
        </AppProvider>
      </body>
    </html>
  );
}
