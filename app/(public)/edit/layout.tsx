import "@/app/globals.css";
import { auth } from "@/auth";
import { AppProvider } from "@/components/providers";
import { getClientEndatixConfig } from "@/features/config/server";
import {
  brandLayoutMetadata,
  brandTitle,
  getBrand,
} from "@/lib/branding/server";
import type { Metadata } from "next";
import { ROBOTS, getMetadataBase } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const brand = await getBrand();
  return {
    ...(await brandLayoutMetadata()),
    title: await brandTitle(
      "Edit Submission",
      // eslint-disable-next-line no-restricted-syntax -- built-in value, shown only while no brand pack applies
      "Edit Submission - Endatix",
    ),
    metadataBase: getMetadataBase(),
    description: "Edit your submission",
    generator: brand.shortName,
    keywords: [brand.shortName.toLowerCase(), "edit", "submission", "form"],
    robots: ROBOTS.hiddenPage,
  };
}

export default async function EditLayout({
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
