import "@/app/globals.css";
import { auth } from "@/auth";
import { AppProvider } from "@/components/providers";
import { getClientEndatixConfig } from "@/features/config/server";
import {
  brandKeywords,
  brandLayoutMetadata,
  getBrand,
} from "@/lib/branding/server";
import { geistMono, geistSans } from "@/lib/fonts/geist-local";
import type { Metadata } from "next";
import { getMetadataBase } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const [metadata, brand] = await Promise.all([
    brandLayoutMetadata({ socialImage: true }),
    getBrand(),
  ]);
  return {
    ...metadata,
    metadataBase: getMetadataBase(),
    title: `${brand.name} - Error`,
    description: "An error occurred while loading the page.",
    generator: brand.shortName,
    keywords: [...brandKeywords(brand), "forms-management", "ai-form-builder"],
  };
}

interface UnauthorizedLayoutProps {
  children: React.ReactNode;
}

export default async function UnauthorizedLayout({
  children,
}: UnauthorizedLayoutProps) {
  const [session, endatixConfig, brand] = await Promise.all([
    auth(),
    getClientEndatixConfig(),
    getBrand(),
  ]);

  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <AppProvider
          session={session}
          endatixConfig={endatixConfig}
          brand={brand}
        >
          <div className="flex min-h-screen w-full flex-row bg-muted/40">
            <main className="flex flex-1 flex-col p-6">{children}</main>
          </div>
        </AppProvider>
      </body>
    </html>
  );
}
