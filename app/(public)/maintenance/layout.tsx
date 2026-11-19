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
 * Like `/share`, this route renders only a public status page, so it does not load
 * `globals.css` or Hub fonts (DESIGN.md §9), and has no theme provider: the page
 * follows the OS colour scheme on its own.
 */

export async function generateMetadata(): Promise<Metadata> {
  return {
    ...(await brandLayoutMetadata()),
    title: await brandTitle({
      page: "Scheduled maintenance",
      builtIn: "Scheduled maintenance",
    }),
    metadataBase: getMetadataBase(),
  };
}

interface MaintenanceLayoutProps {
  children: React.ReactNode;
}

export default async function MaintenanceLayout({
  children,
}: Readonly<MaintenanceLayoutProps>) {
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
