import "@/app/globals.css";
import { auth } from "@/auth";
import { AppProvider } from "@/components/providers";
import { AppOptions } from "@/components/providers/app-options";
import { getClientEndatixConfig } from "@/features/config/server";
import { brandMetadata, getBrand } from "@/lib/branding/server";
import type { Metadata } from "next";
import { ROBOTS, getMetadataBase } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const brand = await getBrand();
  return {
    ...(await brandMetadata({
      title: "View Submission",
      builtInTitle: "View Submission - Endatix",
    })),
    metadataBase: getMetadataBase(),
    description: "View your submission",
    generator: brand.shortName,
    keywords: [brand.shortName.toLowerCase(), "view", "submission", "form"],
    robots: ROBOTS.hiddenPage,
  };
}

export default async function ViewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [session, endatixConfig, brand] = await Promise.all([
    auth(),
    getClientEndatixConfig(),
    getBrand(),
  ]);

  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body>
        <AppProvider
          options={AppOptions.PublicPages}
          session={session}
          endatixConfig={endatixConfig}
          brand={brand}
        >
          {children}
        </AppProvider>
      </body>
    </html>
  );
}
