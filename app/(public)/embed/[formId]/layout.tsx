import { auth } from "@/auth";
import { AppProvider } from "@/components/providers";
import { AppOptions } from "@/components/providers/app-options";
import { getClientEndatixConfig } from "@/features/config/server";
import {
  brandMetadata,
  RESPONDENT_BRAND_DEFERRED,
} from "@/lib/branding/server";
import { getPublicAssetPath } from "@/lib/hosting";
import type { Metadata } from "next";
import { ROBOTS, getMetadataBase } from "@/lib/seo";

const metadata: Metadata = {
  metadataBase: getMetadataBase(),
  robots: ROBOTS.hiddenPage,
};

/** Respondent pages keep the built-in brand (`RESPONDENT_BRAND_DEFERRED`); only the title names the deployment. */
export async function generateMetadata(): Promise<Metadata> {
  const { title } = await brandMetadata({
    title: "Form",
    builtInTitle: "Endatix Form",
  });
  return { ...metadata, title };
}

export default async function EmbedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [session, endatixConfig] = await Promise.all([
    auth(),
    getClientEndatixConfig(),
  ]);

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link
          rel="icon"
          href={getPublicAssetPath("/assets/icons/icon.svg")}
          type="image/svg+xml"
        />
      </head>
      {/* No globals.css (DESIGN.md §9) — zero UA body margin or the iframe shows an 8px gutter. */}
      <body style={{ margin: 0 }}>
        <AppProvider
          options={AppOptions.PublicPages}
          session={session}
          endatixConfig={endatixConfig}
          brand={RESPONDENT_BRAND_DEFERRED}
        >
          {children}
        </AppProvider>
      </body>
    </html>
  );
}
